/**
 * Client-side service for Google Health operations.
 * Handles checking connection status, storing tokens, fetching health data
 * via the Supabase Edge Function, and disconnecting.
 */

import { supabase } from './supabase';
import type { GoogleHealthTokenRow, HealthDataResponse } from './types';

/** Google Health API v4 OAuth scopes */
export const GOOGLE_HEALTH_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
].join(' ');

/**
 * Check if the user has a Google Health connection by querying
 * the google_health_tokens table.
 */
export async function checkGoogleHealthConnection(
  userId: string
): Promise<{ connected: boolean; expired: boolean }> {
  const { data, error } = await supabase
    .from('google_health_tokens')
    .select('id, token_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { connected: false, expired: false };
  }

  // Check if token is expired
  if (data.token_expires_at) {
    const expiresAt = new Date(data.token_expires_at);
    const now = new Date();
    if (expiresAt <= now) {
      // Token is expired, but refresh token may still be valid
      // The Edge Function will handle refresh
      return { connected: true, expired: true };
    }
  }

  return { connected: true, expired: false };
}

/**
 * Store or update Google OAuth tokens in the google_health_tokens table.
 * Called after the user completes the Google OAuth consent flow.
 */
export async function saveGoogleHealthTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt?: Date
): Promise<{ error: string | null }> {
  const tokenData: Partial<GoogleHealthTokenRow> = {
    user_id: userId,
    google_access_token: accessToken,
    google_refresh_token: refreshToken,
    token_expires_at: expiresAt ? expiresAt.toISOString() : null,
    scopes: GOOGLE_HEALTH_SCOPES,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('google_health_tokens')
    .upsert(tokenData, { onConflict: 'user_id' });

  if (error) {
    console.error('[GoogleHealth] Failed to save tokens:', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Fetch health data via the Supabase Edge Function.
 * The Edge Function handles token refresh and Google Health API calls.
 */
export async function fetchHealthData(): Promise<HealthDataResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'Not authenticated',
        errorCode: 'UNKNOWN',
      };
    }

    const { data, error } = await supabase.functions.invoke('google-health', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('[GoogleHealth] Edge Function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch health data',
        errorCode: 'API_ERROR',
      };
    }

    console.log('[GoogleHealth] Raw response from Edge Function:', JSON.stringify(data, null, 2));

    return data as HealthDataResponse;
  } catch (err: any) {
    console.error('[GoogleHealth] Unexpected error:', err);
    return {
      success: false,
      error: err.message || 'Unexpected error fetching health data',
      errorCode: 'UNKNOWN',
    };
  }
}

/**
 * Remove Google Health tokens — effectively disconnecting the user's
 * Google Health account.
 */
export async function disconnectGoogleHealth(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('google_health_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[GoogleHealth] Failed to disconnect:', error);
    return { error: error.message };
  }

  return { error: null };
}
