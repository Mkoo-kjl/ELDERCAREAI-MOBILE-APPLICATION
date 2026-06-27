/**
 * GoogleHealthProvider — React Context for managing Google Health API v4
 * connection state, OAuth consent flow, and health data fetching.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import {
  GOOGLE_HEALTH_SCOPES,
  checkGoogleHealthConnection,
  saveGoogleHealthTokens,
  fetchHealthData as fetchHealthDataService,
  disconnectGoogleHealth,
} from '../lib/googleHealth';
import type {
  GoogleHealthConnectionStatus,
  HealthData,
  HealthDataResponse,
} from '../lib/types';

type GoogleHealthContextType = {
  /** Current connection status */
  connectionStatus: GoogleHealthConnectionStatus;
  /** Whether we should show the permission prompt/modal */
  showPermissionPrompt: boolean;
  /** Dismiss the permission prompt without connecting */
  dismissPermissionPrompt: () => void;
  /** Initiate the Google OAuth flow to connect Google Health */
  connectGoogleHealth: () => Promise<void>;
  /** Re-authenticate (used when tokens expire/revoke) */
  reconnectGoogleHealth: () => Promise<void>;
  /** Disconnect Google Health account */
  disconnect: () => Promise<void>;
  /** Latest health data from Google Health API */
  healthData: HealthData | null;
  /** Whether health data is currently being fetched */
  isLoadingHealth: boolean;
  /** Whether the connection check is in progress */
  isCheckingConnection: boolean;
  /** Whether the OAuth flow is in progress */
  isConnecting: boolean;
  /** Last error message */
  error: string | null;
  /** Error code from last fetch */
  errorCode: string | null;
  /** Fetch latest health data from Google Health */
  fetchLatestHealth: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
};

const GoogleHealthContext = createContext<GoogleHealthContextType>({
  connectionStatus: 'checking',
  showPermissionPrompt: false,
  dismissPermissionPrompt: () => {},
  connectGoogleHealth: async () => {},
  reconnectGoogleHealth: async () => {},
  disconnect: async () => {},
  healthData: null,
  isLoadingHealth: false,
  isCheckingConnection: true,
  isConnecting: false,
  error: null,
  errorCode: null,
  fetchLatestHealth: async () => {},
  clearError: () => {},
});

export const useGoogleHealth = () => useContext(GoogleHealthContext);

export const GoogleHealthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { session, user } = useAuth();

  const [connectionStatus, setConnectionStatus] =
    useState<GoogleHealthConnectionStatus>('checking');
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // ─── Check connection on auth change ─────────────────────────────────────

  useEffect(() => {
    if (!user) {
      setConnectionStatus('disconnected');
      setIsCheckingConnection(false);
      setShowPermissionPrompt(false);
      setHealthData(null);
      return;
    }

    const check = async () => {
      setIsCheckingConnection(true);
      try {
        const { connected, expired } = await checkGoogleHealthConnection(user.id);
        if (connected) {
          setConnectionStatus(expired ? 'expired' : 'connected');
          setShowPermissionPrompt(false);
        } else {
          setConnectionStatus('disconnected');
          setShowPermissionPrompt(true);
        }
      } catch (err) {
        console.error('[GoogleHealthProvider] Connection check error:', err);
        setConnectionStatus('disconnected');
        setShowPermissionPrompt(true);
      } finally {
        setIsCheckingConnection(false);
      }
    };

    check();
  }, [user]);

  // ─── Google OAuth Flow ───────────────────────────────────────────────────

  const performGoogleOAuth = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setErrorCode(null);

    try {
      const redirectUri = makeRedirectUri();

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          scopes: GOOGLE_HEALTH_SCOPES,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) throw oauthError;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

        if (res.type === 'success' && res.url) {
          // Parse the redirect URL to extract tokens/code
          const parsedUrl = Linking.parse(res.url);
          const params = parsedUrl.queryParams as Record<string, string>;

          if (params?.code) {
            const { data: sessionData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(params.code);
            if (exchangeError) throw exchangeError;

            // Extract Google provider tokens from the new session
            if (sessionData?.session) {
              const providerToken = sessionData.session.provider_token;
              const providerRefreshToken = sessionData.session.provider_refresh_token;

              if (providerToken && user) {
                // Calculate approximate expiry (Google tokens typically last 1 hour)
                const expiresAt = new Date(Date.now() + 3600 * 1000);

                await saveGoogleHealthTokens(
                  user.id,
                  providerToken,
                  providerRefreshToken ?? null,
                  expiresAt
                );

                setConnectionStatus('connected');
                setShowPermissionPrompt(false);
                return; // Success
              }
            }
          } else if (params?.access_token && params?.refresh_token) {
            // Implicit flow fallback
            await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });

            if (user) {
              const expiresAt = new Date(Date.now() + 3600 * 1000);
              await saveGoogleHealthTokens(
                user.id,
                params.access_token,
                params.refresh_token,
                expiresAt
              );

              setConnectionStatus('connected');
              setShowPermissionPrompt(false);
              return;
            }
          }

          // If we got here without returning, try to get the provider token from current session
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession?.provider_token && user) {
            const expiresAt = new Date(Date.now() + 3600 * 1000);
            await saveGoogleHealthTokens(
              user.id,
              currentSession.provider_token,
              currentSession.provider_refresh_token ?? null,
              expiresAt
            );
            setConnectionStatus('connected');
            setShowPermissionPrompt(false);
          }
        } else {
          // User cancelled or browser closed
          setError('Google Health connection was cancelled.');
        }
      }
    } catch (err: any) {
      console.error('[GoogleHealthProvider] OAuth error:', err);
      setError(err.message || 'Failed to connect Google Health');
      setErrorCode('UNKNOWN');
    } finally {
      setIsConnecting(false);
    }
  }, [user]);

  const connectGoogleHealth = useCallback(async () => {
    await performGoogleOAuth();
  }, [performGoogleOAuth]);

  const reconnectGoogleHealth = useCallback(async () => {
    await performGoogleOAuth();
  }, [performGoogleOAuth]);

  // ─── Disconnect ──────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    if (!user) return;
    const { error: disconnectError } = await disconnectGoogleHealth(user.id);
    if (disconnectError) {
      Alert.alert('Error', 'Failed to disconnect Google Health.');
      return;
    }
    setConnectionStatus('disconnected');
    setHealthData(null);
    setShowPermissionPrompt(true);
  }, [user]);

  // ─── Fetch Health Data ───────────────────────────────────────────────────

  const fetchLatestHealth = useCallback(async () => {
    if (connectionStatus !== 'connected' && connectionStatus !== 'expired') {
      return;
    }

    setIsLoadingHealth(true);
    setError(null);
    setErrorCode(null);

    try {
      const response: HealthDataResponse = await fetchHealthDataService();

      if (response.success && response.data) {
        setHealthData(response.data);
        setConnectionStatus('connected');
      } else {
        setError(response.error || 'Failed to load health data');
        setErrorCode(response.errorCode || null);

        if (
          response.errorCode === 'TOKEN_EXPIRED' ||
          response.errorCode === 'TOKEN_REVOKED'
        ) {
          setConnectionStatus('expired');
        }
      }
    } catch (err: any) {
      console.error('[GoogleHealthProvider] Fetch error:', err);
      setError(err.message || 'Unexpected error loading health data');
      setErrorCode('UNKNOWN');
    } finally {
      setIsLoadingHealth(false);
    }
  }, [connectionStatus]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const dismissPermissionPrompt = useCallback(() => {
    setShowPermissionPrompt(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  return (
    <GoogleHealthContext.Provider
      value={{
        connectionStatus,
        showPermissionPrompt,
        dismissPermissionPrompt,
        connectGoogleHealth,
        reconnectGoogleHealth,
        disconnect,
        healthData,
        isLoadingHealth,
        isCheckingConnection,
        isConnecting,
        error,
        errorCode,
        fetchLatestHealth,
        clearError,
      }}
    >
      {children}
    </GoogleHealthContext.Provider>
  );
};
