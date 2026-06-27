import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { GOOGLE_HEALTH_SCOPES, saveGoogleHealthTokens } from '../../lib/googleHealth';

export default function FitnessSetupScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { session } = useAuth();

  const handleConnect = async () => {
    try {
      setLoading(true);
      
      const redirectUri = makeRedirectUri();
      
      // Use Google Health API v4 scopes instead of deprecated Google Fit scopes
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          scopes: GOOGLE_HEALTH_SCOPES,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        
        if (res.type === 'success' && res.url) {
          // Parse the deep link URL to extract the OAuth tokens/code
          const parsedUrl = Linking.parse(res.url);
          const params = parsedUrl.queryParams as any;

          if (params?.code) {
            const { data: sessionData, error: exchangeError } = 
              await supabase.auth.exchangeCodeForSession(params.code);
            if (exchangeError) throw exchangeError;

            // Store Google provider tokens in google_health_tokens table
            if (sessionData?.session && session?.user?.id) {
              const providerToken = sessionData.session.provider_token;
              const providerRefreshToken = sessionData.session.provider_refresh_token;

              if (providerToken) {
                const expiresAt = new Date(Date.now() + 3600 * 1000);
                await saveGoogleHealthTokens(
                  session.user.id,
                  providerToken,
                  providerRefreshToken ?? null,
                  expiresAt
                );
              }
            }
          } else if (params?.access_token && params?.refresh_token) {
            await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });

            // Store tokens from implicit flow
            if (session?.user?.id) {
              const expiresAt = new Date(Date.now() + 3600 * 1000);
              await saveGoogleHealthTokens(
                session.user.id,
                params.access_token,
                params.refresh_token,
                expiresAt
              );
            }
          }

          // Record that setup is complete locally since the column isn't in the DB
          if (session?.user?.id) {
            await AsyncStorage.setItem(`setup_complete_${session.user.id}`, 'true');
          }

          Alert.alert('Success!', 'Your health data is now connected.');
          router.replace('/(tabs)' as any);
        } else {
          Alert.alert('Cancelled', 'You must connect your Google Health account to continue.');
        }
      }
    } catch (err: any) {
      Alert.alert('Connection Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#EBF4FF', '#E0EFFF']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <LinearGradient colors={['#14CD2F', '#0EA224']} style={styles.iconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="fitness-outline" size={50} color="#fff" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Connect Your Watch</Text>
        <Text style={styles.subtitle}>
          ElderCareAI securely syncs with your Fitbit Inspire 3 via Google Health to monitor health vitals.
        </Text>

        <View style={styles.featuresCard}>
          <View style={styles.featureRow}>
            <Ionicons name="heart" size={24} color="#EF4444" style={styles.featureIcon} />
            <Text style={styles.featureText}>Continuous Heart Rate Monitoring</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="pulse" size={24} color="#38BDF8" style={styles.featureIcon} />
            <Text style={styles.featureText}>Oxygen Saturation (SpO2)</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="moon" size={24} color="#8B5CF6" style={styles.featureIcon} />
            <Text style={styles.featureText}>Sleep Quality Tracking</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="footsteps" size={24} color="#14CD2F" style={styles.featureIcon} />
            <Text style={styles.featureText}>Steps & Exercise Tracking</Text>
          </View>
        </View>

      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.googleButton} onPress={handleConnect} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={['#4285F4', '#3367D6']} style={styles.googleGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.googleContent}>
                <View style={styles.googleIconWrapper}>
                  <Image source={require('../../assets/images/google-logo.png')} style={styles.googleIcon} resizeMode="contain" />
                </View>
                <Text style={styles.googleButtonText}>Connect with Google Health</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)' as any)}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  iconContainer: { marginBottom: 24, shadowColor: '#14CD2F', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  iconBg: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 32, paddingHorizontal: 10 },
  featuresCard: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, padding: 24, width: '100%', gap: 16, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.6)' },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: { width: 32 },
  featureText: { fontSize: 16, color: '#334155', fontWeight: '500' },
  footer: { padding: 24, paddingBottom: 40 },
  googleButton: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  googleGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  googleContent: { flexDirection: 'row', alignItems: 'center' },
  googleIconWrapper: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  googleIcon: { width: 18, height: 18 },
  googleButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipButton: { padding: 12, alignItems: 'center' },
  skipText: { color: '#64748B', fontSize: 15, fontWeight: '600' }
});
