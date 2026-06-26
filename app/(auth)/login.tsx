import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Helper to parse the redirect URL from Supabase
  const createSessionFromUrl = async (url: string) => {
    try {
      const parsedUrl = Linking.parse(url);
      const params = parsedUrl.queryParams || {};

      if (params.code) {
        // PKCE flow
        const { error } = await supabase.auth.exchangeCodeForSession(params.code as string);
        if (error) throw error;
      } else {
        // Fallback for implicit flow
        let accessToken = params.access_token as string;
        let refreshToken = params.refresh_token as string;

        if (!accessToken || !refreshToken) {
          const hash = url.split('#')[1];
          if (hash) {
            const hashParams = hash.split('&').reduce((acc, current) => {
              const [key, value] = current.split('=');
              acc[key] = decodeURIComponent(value);
              return acc;
            }, {} as Record<string, string>);
            accessToken = hashParams.access_token;
            refreshToken = hashParams.refresh_token;
          }
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }
      }
    } catch (e: any) {
      console.error('[Auth] Error parsing session:', e);
      throw e;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      // Let expo-auth-session determine the correct scheme (exp:// for Go, eldercareai:// for native)
      const redirectUri = makeRedirectUri();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (error) throw error;

      if (data?.url) {
        console.log('[Auth] Generated Redirect URI:', redirectUri);
        
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (res.type === 'success' && res.url) {
          await createSessionFromUrl(res.url);
          // Navigate to the central dispatcher
          router.replace('/' as any);
        } else if (res.type !== 'success') {
          Alert.alert(
            'Sign In Cancelled',
            `Browser closed or failed. Ensure this URL is in your Supabase Redirect Allow-list:\n\n${redirectUri}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (err: any) {
      Alert.alert('Google Sign-In Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#EBF4FF', '#E0EFFF']} style={styles.container}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <View style={styles.logoShadow}>
          <Image source={require('../../assets/images/png-logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.title}>ElderCare<Text style={styles.titleAccent}>AI</Text></Text>
        <Text style={styles.tagline}>Smart care for your loved ones</Text>
      </View>

      {/* Sign In Card */}
      <View style={styles.formCard}>
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={18} color="#38BDF8" />
          <Text style={styles.infoText}>
            Sign in with the Google account connected to your Google Health app to sync vitals.
          </Text>
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={['#4285F4', '#3367D6']} style={styles.googleGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? (
              <View style={styles.googleContent}>
                <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.googleButtonText}>Signing in...</Text>
              </View>
            ) : (
              <View style={styles.googleContent}>
                <View style={styles.googleIconWrapper}>
                  <Image source={require('../../assets/images/google-logo.png')} style={styles.googleIcon} resizeMode="contain" />
                </View>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Ionicons name="shield-checkmark-outline" size={14} color="#94A3B8" />    
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoShadow: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: '#38BDF8',
  },
  tagline: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    fontWeight: '500',
  },
  googleButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  googleGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
});
