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
const DEBUG = Deno.env.get("DEBUG") === "true";

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
  status: "ok" | "stale" | "unavailable" | "error";
  errorMessage?: string;
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
  const url = `${HEALTH_API_BASE}/${dataType}/dataPoints?pageSize=500`;

  console.log(`[google-health] Fetching: ${url}`);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[google-health] ${dataType} fetch failed:`, res.status, errText);
      return { error: true, status: res.status, message: errText };
    }

    return await res.json();
  } catch (err) {
    console.error(`[google-health] ${dataType} fetch threw:`, err);
    return { error: true, status: 0, message: String(err) };
  }
}
function extractTimestamp(sampleTime: any): string | null {
  if (!sampleTime) return null;
  if (sampleTime.physicalTime) return sampleTime.physicalTime;
  if (sampleTime.civilTime) {
    const { date, time } = sampleTime.civilTime;
    if (date && time) {
      return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}T${String(time.hours).padStart(2, "0")}:${String(time.minutes ?? 0).padStart(2, "0")}:${String(time.seconds ?? 0).padStart(2, "0")}Z`;
    }
  }
  return null;
}
// ─── Parsers (Google Health API v4 format) ────────────────────────────────────

function parseHeartRate(data: any): HealthMetric {
  try {
    const points = Array.isArray(data) ? data : data?.dataPoints;
    if (!Array.isArray(points) || points.length === 0)
      return { value: "--", unit: "BPM", status: "unavailable" };

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const validPoints = points
      .map((p: any) => {
        const ts = extractTimestamp(p.heartRate?.sampleTime);
        const bpm = p.heartRate?.beatsPerMinute;
        return { ts, bpm, date: ts ? new Date(ts) : null };
      })
      .filter((p) => p.bpm != null && p.date && p.date > yesterday)
      .sort((a, b) => b.date!.getTime() - a.date!.getTime());

    if (validPoints.length === 0)
      return { value: "--", unit: "BPM", status: "unavailable" };

    const latest = validPoints[0];
    return {
      value: Math.round(Number(latest.bpm)).toString(),
      unit: "BPM",
      timestamp: latest.ts ?? undefined,
      status: "ok",
    };
  } catch (e) {
    console.error("[google-health] Parse heart rate error:", e);
    return { value: "--", unit: "BPM", status: "unavailable" };
  }
}

function parseBloodOxygen(data: any): HealthMetric {
  try {
    const points = Array.isArray(data) ? data : data?.dataPoints;
    if (!Array.isArray(points) || points.length === 0)
      return { value: "--", unit: "%", status: "unavailable" };

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const validPoints = points
      .map((p: any) => {
        const ts = extractTimestamp(p.oxygenSaturation?.sampleTime);
        const pct = p.oxygenSaturation?.percentage;
        return { ts, pct, date: ts ? new Date(ts) : null };
      })
      // Fitbit sends 50.0 as a placeholder for "no reading" — filter it out
      .filter((p) => p.pct != null && p.pct > 70 && p.date && p.date > yesterday)
      .sort((a, b) => b.date!.getTime() - a.date!.getTime());

    if (validPoints.length === 0)
      return { value: "--", unit: "%", status: "unavailable" };

    const latest = validPoints[0];
    return {
      value: Math.round(Number(latest.pct)).toString(),
      unit: "%",
      timestamp: latest.ts ?? undefined,
      status: "ok",
    };
  } catch (e) {
    console.error("[google-health] Parse blood oxygen error:", e);
    return { value: "--", unit: "%", status: "unavailable" };
  }
}

function parseSteps(data: any): HealthMetric {
  try {
    const points = Array.isArray(data) ? data : data?.dataPoints;
    if (!Array.isArray(points) || points.length === 0)
      return { value: "--", unit: "steps", status: "unavailable" };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let total = 0;
    let latestTs: string | null = null;

    for (const dp of points) {
      const endTime = dp.steps?.interval?.endTime;
      if (!endTime) continue;

      const date = new Date(endTime);
      if (date < todayStart) continue;

      total += Number(dp.steps?.count ?? 0);
      if (!latestTs || date > new Date(latestTs)) latestTs = endTime;
    }

    if (total === 0) return { value: "--", unit: "steps", status: "unavailable" };

    return {
      value: Math.round(total).toLocaleString(),
      unit: "steps",
      timestamp: latestTs ?? new Date().toISOString(),
      status: "ok",
    };
  } catch (e) {
    console.error("[google-health] Parse steps error:", e);
    return { value: "--", unit: "steps", status: "unavailable" };
  }
}
function parseSleep(data: any): HealthMetric {
  try {
    const points = Array.isArray(data) ? data : data?.dataPoints;
    if (!Array.isArray(points) || points.length === 0)
      return { value: "--", unit: "hrs", status: "unavailable" };

    const sessions = points
      .map((dp: any) => {
        const endTime = dp.sleep?.interval?.endTime;
        const minutesAsleep = Number(dp.sleep?.summary?.minutesAsleep ?? 0);
        return { endTime, minutesAsleep };
      })
      .filter((s) => s.endTime && s.minutesAsleep > 0)
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

    if (sessions.length === 0)
      return { value: "--", unit: "hrs", status: "unavailable" };

    const latest = sessions[0];
    const hours = latest.minutesAsleep / 60;

    if (hours <= 0 || hours >= 24)
      return { value: "--", unit: "hrs", status: "unavailable" };

    const isStale = Date.now() - new Date(latest.endTime).getTime() > 24 * 60 * 60 * 1000;

    // FIX: when data is stale, show a friendly message with the actual date
    // instead of a raw value, so caregivers immediately understand why
    // the number looks old.
    if (isStale) {
      const lastDate = new Date(latest.endTime).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
      return {
        value: `Last recorded sleep was on ${lastDate}`,
        unit: "",
        timestamp: latest.endTime,
        status: "stale",
      };
    }

    return {
      value: hours.toFixed(1),
      unit: "hrs",
      timestamp: latest.endTime,
      status: "ok",
    };
  } catch (e) {
    console.error("[google-health] Parse sleep error:", e);
    return { value: "--", unit: "hrs", status: "unavailable" };
  }
}

function parseExercise(data: any): HealthMetric {
  try {
    const points = Array.isArray(data) ? data : data?.dataPoints;
    if (!Array.isArray(points) || points.length === 0)
      return { value: "--", unit: "min", status: "unavailable" };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let totalMin = 0;
    let latestTs: string | null = null;

    for (const dp of points) {
      const ts =
        extractTimestamp(dp.activitySummary?.endTime) ??
        extractTimestamp(dp.activitySummary?.startTime);
      if (!ts) continue;

      const date = new Date(ts);
      if (date < todayStart) continue;

      const mins = dp.activitySummary?.activeMinutes ?? 0;
      totalMin += Number(mins);
      if (!latestTs || date > new Date(latestTs)) latestTs = ts;
    }

    if (totalMin === 0) return { value: "--", unit: "min", status: "unavailable" };

    return {
      value: Math.round(totalMin).toString(),
      unit: "min",
      timestamp: latestTs ?? new Date().toISOString(),
      status: "ok",
    };
  } catch (e) {
    console.error("[google-health] Parse exercise error:", e);
    return { value: "--", unit: "min", status: "unavailable" };
  }
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
    
    // ── Debug: log raw shapes ───────────────────────────────────────────────
     console.log("[DEBUG] heartRate:", JSON.stringify(heartRateData?.dataPoints?.[0] ?? heartRateData));
    console.log("[DEBUG] spo2:", JSON.stringify(spo2Data?.dataPoints?.[0] ?? spo2Data));
    console.log("[DEBUG] steps:", JSON.stringify(stepsData?.dataPoints?.[0] ?? stepsData));
    console.log("[DEBUG] sleep:", JSON.stringify(sleepData?.dataPoints?.[0] ?? sleepData));
    console.log("[DEBUG] exercise:", JSON.stringify(exerciseData?.dataPoints?.[0] ?? exerciseData));

    const healthData = {
      heartRate:   parseHeartRate(heartRateData),
      bloodOxygen: parseBloodOxygen(spo2Data),
      steps:       parseSteps(stepsData),
      sleep:       parseSleep(sleepData),
      exercise:    parseExercise(exerciseData),
      lastSyncedAt: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: healthData,
        ...(DEBUG ? { debug: { heartRateData, spo2Data, stepsData, sleepData, exerciseData } } : {}),
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