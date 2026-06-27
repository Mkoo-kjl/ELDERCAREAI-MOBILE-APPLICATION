/**
 * Shared TypeScript types for Google Health API v4 integration.
 */

/** Status of the user's Google Health connection */
export type GoogleHealthConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'checking';

/** A single health metric with metadata */
export type HealthMetric = {
  value: string;
  unit: string;
  timestamp?: string;       // ISO string of when this reading was taken
  status: 'ok' | 'stale' | 'unavailable';
};

/** Sleep stage breakdown */
export type SleepStage = {
  stage: 'deep' | 'light' | 'rem' | 'awake';
  durationMinutes: number;
};

/** Shape of health data returned from the Edge Function */
export type HealthData = {
  heartRate: HealthMetric;
  bloodOxygen: HealthMetric;
  steps: HealthMetric;
  sleep: HealthMetric & {
    stages?: SleepStage[];
  };
  exercise: HealthMetric;
  lastSyncedAt: string;      // ISO string of when data was last fetched
};

/** Row shape for google_health_tokens table */
export type GoogleHealthTokenRow = {
  id: string;
  user_id: string;
  google_access_token: string;
  google_refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string | null;
  created_at: string;
  updated_at: string;
};

/** Response shape from the Edge Function */
export type HealthDataResponse = {
  success: boolean;
  data?: HealthData;
  error?: string;
  errorCode?: 'TOKEN_EXPIRED' | 'TOKEN_REVOKED' | 'API_ERROR' | 'NO_TOKENS' | 'UNKNOWN';
};
