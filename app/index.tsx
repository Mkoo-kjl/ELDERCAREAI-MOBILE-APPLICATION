import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';

export default function SplashScreen() {
  const router = useRouter();
  const { session, initialized } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse loader
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const checkSetup = async () => {
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      const setupComplete = await AsyncStorage.getItem(`setup_complete_${session.user.id}`);

      if (setupComplete === 'true') {
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/(setup)/fitness' as any);
      }
    };

    const timer = setTimeout(() => {
      checkSetup();
    }, 2500);

    return () => clearTimeout(timer);
  }, [session, initialized, router]);

  return (
    <LinearGradient colors={['#0B1120', '#162544', '#1E3A5F']} style={styles.container}>
      <Animated.View style={[styles.logoWrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoGlow}>
          <Image source={require('../assets/images/png-logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.title}>ElderCare<Text style={styles.titleAccent}>AI</Text></Text>
        <Text style={styles.subtitle}>Connecting you and your loved ones</Text>
      </Animated.View>

      <Animated.View style={[styles.loaderContainer, { opacity: pulseAnim }]}>
        <View style={styles.loaderDot} />
        <View style={[styles.loaderDot, styles.loaderDotMid]} />
        <View style={styles.loaderDot} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logoGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: '#38BDF8',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  loaderContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 80,
    gap: 8,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  loaderDotMid: {
    backgroundColor: '#14CD2F',
  },
});
