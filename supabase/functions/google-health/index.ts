// @ts-nocheck
// supabase/functions/google-health/index.ts
// Supabase Edge Function (Deno) — fetches health data from Google Health API v4
// with automatic token refresh.
//
// Deploy: supabase functions deploy google-health
// Secrets required:
//   supabase secrets set GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=xxx

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const HEALTH_API_BASE = "https://health.googleapis.com/v4/users/me/dataTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TokenRow {
  id: string;
  user_id: string;
  google_access_token: string;
  google_refresh_token: string | null;
  token_expires_at: string | null;
}

interface HealthMetric {
  value: string;
  unit: string;
  timestamp?: string;
  status: "ok" | "stale" | "unavailable";
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

async function refreshGoogleToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      console.error("[google-health] Token refresh failed:", res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("[google-health] Token refresh error:", err);
    return null;
  }
}

// ─── Ensure Valid Token ───────────────────────────────────────────────────────

async function getValidAccessToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  tokenRow: TokenRow
): Promise<{ accessToken: string; error?: string; errorCode?: string }> {
  const now = new Date();
  const expiresAt = tokenRow.token_expires_at ? new Date(tokenRow.token_expires_at) : null;

  if (expiresAt && expiresAt > now) {
    return { accessToken: tokenRow.google_access_token };
  }

  if (!tokenRow.google_refresh_token) {
    return {
      accessToken: "",
      error: "No refresh token available. Please reconnect Google Health.",
      errorCode: "TOKEN_EXPIRED",
    };
  }

  const refreshResult = await refreshGoogleToken(tokenRow.google_refresh_token);
  if (!refreshResult) {
    return {
      accessToken: "",
      error: "Failed to refresh Google token. Please reconnect Google Health.",
      errorCode: "TOKEN_REVOKED",
    };
  }

  const newExpiresAt = new Date(Date.now() + refreshResult.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("google_health_tokens")
    .update({
      google_access_token: refreshResult.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", tokenRow.user_id);

  return { accessToken: refreshResult.access_token };
}

// ─── Google Health API v4 Fetcher ─────────────────────────────────────────────

async function fetchDataPoints(
  accessToken: string,
  dataType: string
): Promise<any> {
  let url = `${HEALTH_API_BASE}/${dataType}/dataPoints?pageSize=500`;

  console.log(`[google-health] Fetching: ${url}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[google-health] ${dataType} fetch failed:`, res.status, errText);
    return { error: true, status: res.status, message: errText };
  }

  return await res.json();
}

// ─── Parsers (Google Health API v4 format) ────────────────────────────────────

function parseHeartRate(data: any): HealthMetric {
  try {
    const points = data?.dataPoints;
    if (Array.isArray(points) && points.length > 0) {
      // Find the most recent point within the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPoints = points.filter(p => new Date(p.endTime ?? p.startTime) > yesterday);
      
      if (recentPoints.length > 0) {
        const sorted = [...recentPoints].sort(
          (a, b) => new Date(b.endTime ?? b.startTime).getTime() - new Date(a.endTime ?? a.startTime).getTime()
        );
        const latest = sorted[0];
        const bpm = latest.value?.fpVal ?? latest.value?.intVal;
        if (bpm != null) {
          return {
            value: Math.round(Number(bpm)).toString(),
            unit: "BPM",
            timestamp: latest.endTime ?? latest.startTime,
            status: "ok",
          };
        }
      }
    }
  } catch (e) {
    console.error("[google-health] Parse heart rate error:", e);
  }
  return { value: "--", unit: "BPM", status: "unavailable" };
}

function parseBloodOxygen(data: any): HealthMetric {
  try {
    const points = data?.dataPoints;
    if (Array.isArray(points) && points.length > 0) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPoints = points.filter(p => new Date(p.endTime ?? p.startTime) > yesterday);

      if (recentPoints.length > 0) {
        const sorted = [...recentPoints].sort(
          (a, b) => new Date(b.endTime ?? b.startTime).getTime() - new Date(a.endTime ?? a.startTime).getTime()
        );
        const latest = sorted[0];
        const spo2 = latest.value?.fpVal ?? latest.value?.oxygenSaturationPercent;
        if (spo2 != null) {
          return {
            value: Math.round(Number(spo2)).toString(),
            unit: "%",
            timestamp: latest.endTime ?? latest.startTime,
            status: "ok",
          };
        }
      }
    }
  } catch (e) {
    console.error("[google-health] Parse blood oxygen error:", e);
  }
  return { value: "--", unit: "%", status: "unavailable" };
}

function parseSteps(data: any): HealthMetric {
  try {
    const points = data?.dataPoints;
    if (Array.isArray(points) && points.length > 0) {
      let total = 0;
      let latestTime = "";
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      for (const dp of points) {
        const t = dp.endTime ?? dp.startTime;
        if (new Date(t) < todayStart) continue; // Only sum today's steps

        const s = dp.value?.intVal ?? dp.value?.fpVal ?? 0;
        total += Number(s);
        if (!latestTime || new Date(t) > new Date(latestTime)) latestTime = t;
      }
      if (total > 0) {
        return {
          value: Math.round(total).toLocaleString(),
          unit: "steps",
          timestamp: latestTime || new Date().toISOString(),
          status: "ok",
        };
      }
    }
  } catch (e) {
    console.error("[google-health] Parse steps error:", e);
  }
  return { value: "--", unit: "steps", status: "unavailable" };
}

function parseSleep(data: any): HealthMetric {
  try {
    const points = data?.dataPoints;
    if (Array.isArray(points) && points.length > 0) {
      let totalMs = 0;
      let latestEnd = "";
      
      const yesterday6pm = new Date();
      yesterday6pm.setDate(yesterday6pm.getDate() - 1);
      yesterday6pm.setHours(18, 0, 0, 0);

      for (const dp of points) {
        const start = new Date(dp.startTime);
        const end = new Date(dp.endTime);
        
        if (end < yesterday6pm) continue; // Only count recent sleep

        // Some sleep records include sleep stages, filter out awake if needed
        const stage = dp.value?.sleepStages?.[0]?.stage?.toLowerCase(); 
        if (stage === "awake" || stage === "out_of_bed") continue;

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          totalMs += end.getTime() - start.getTime();
          if (!latestEnd || end > new Date(latestEnd)) latestEnd = dp.endTime;
        }
      }

      const hours = totalMs / (1000 * 60 * 60);
      if (hours > 0 && hours < 24) {
        return {
          value: hours.toFixed(1),
          unit: "hrs",
          timestamp: latestEnd || new Date().toISOString(),
          status: "ok",
        };
      }
    }
  } catch (e) {
    console.error("[google-health] Parse sleep error:", e);
  }
  return { value: "--", unit: "hrs", status: "unavailable" };
}

function parseExercise(data: any): HealthMetric {
  try {
    const points = data?.dataPoints;
    if (Array.isArray(points) && points.length > 0) {
      let totalMin = 0;
      let latestTime = "";
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      for (const dp of points) {
        const t = dp.endTime ?? dp.startTime;
        if (new Date(t) < todayStart) continue; // Only today's exercise

        const m = dp.value?.intVal ?? dp.value?.fpVal ?? dp.value?.activeMinutes ?? dp.value?.durationMinutes ?? 0;
        totalMin += Number(m);
        if (!latestTime || new Date(t) > new Date(latestTime)) latestTime = t;
      }
      if (totalMin > 0) {
        return {
          value: Math.round(totalMin).toString(),
          unit: "min",
          timestamp: latestTime || new Date().toISOString(),
          status: "ok",
        };
      }
    }
  } catch (e) {
    console.error("[google-health] Parse exercise error:", e);
  }
  return { value: "--", unit: "min", status: "unavailable" };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header", errorCode: "UNAUTHORIZED" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired session", errorCode: "UNAUTHORIZED" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("google_health_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ success: false, error: "Google Health not connected.", errorCode: "NO_TOKENS" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const { accessToken, error: tokenRefreshError, errorCode } =
      await getValidAccessToken(supabaseAdmin, tokenRow as TokenRow);

    if (tokenRefreshError) {
      return new Response(
        JSON.stringify({ success: false, error: tokenRefreshError, errorCode: errorCode ?? "TOKEN_EXPIRED" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // ── Fetch in parallel (v4 dataTypes) ───────────────────────────────────────
    // We don't send time filters to avoid 400 Bad Requests with API-specific field names.
    // Instead we fetch the last 500 records and filter in TypeScript above.
    const [heartRateData, spo2Data, stepsData, sleepData, exerciseData] = await Promise.all([
      fetchDataPoints(accessToken, "heart-rate"),
      fetchDataPoints(accessToken, "oxygen-saturation"),
      fetchDataPoints(accessToken, "steps"),
      fetchDataPoints(accessToken, "sleep"),
      fetchDataPoints(accessToken, "active-minutes"),
    ]);

    const healthData = {
      heartRate:   parseHeartRate(heartRateData),
      bloodOxygen: parseBloodOxygen(spo2Data),
      steps:       parseSteps(stepsData),
      sleep:       parseSleep(sleepData),
      exercise:    parseExercise(exerciseData),
      lastSyncedAt: now.toISOString(),
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: healthData,
        debug: { heartRateData, spo2Data, stepsData, sleepData, exerciseData },
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error("[google-health] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error", errorCode: "UNKNOWN" }),
      { status: 500, headers: corsHeaders }
    );
  }
});