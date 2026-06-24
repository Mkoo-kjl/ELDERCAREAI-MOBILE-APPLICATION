import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';

export default function SplashScreen() {
  const router = useRouter();
  const { session, initialized } = useAuth();

  useEffect(() => {
    if (!initialized) return;

    const timer = setTimeout(() => {
      if (session) {
        router.replace('/dashboard');
      } else {
        router.replace('/(auth)/login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [session, initialized, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ElderCare</Text>
      <Text style={styles.subtitle}>Connecting you and your loved ones</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
});
