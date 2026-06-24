import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

const VITALS_CONFIG = [
  { id: 'heart-rate', name: '❤️ Heart Rate', unit: 'bpm' },
  { id: 'oxygen-saturation', name: '🩸 SpO2', unit: '%' },
  { id: 'sleep', name: '😴 Sleep', unit: 'hrs' },
  { id: 'heart-rate-variability', name: '🫁 HRV', unit: 'ms' },
  { id: 'steps', name: '🏃 Steps', unit: 'steps' },
];

export default function Dashboard() {
  const { session, user } = useAuth();
  const router = useRouter();
  const [elderlyName, setElderlyName] = useState<string>('Loading...');
  const [vitalsData, setVitalsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const fetchElderlyProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('elderly_profiles')
      .select('full_name')
      .eq('caregiver_id', user.id)
      .limit(1)
      .single();
    
    if (data) {
      setElderlyName(data.full_name);
    } else {
      setElderlyName('Unknown Profile');
    }
  };

  const fetchVital = async (dataType: string, accessToken: string) => {
    try {
      const res = await fetch(
        `https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      console.log(`Failed to fetch ${dataType}:`, e);
      return null;
    }
  };

  const loadVitals = useCallback(async () => {
    const accessToken = session?.provider_token;
    if (!accessToken) {
      console.log('No Google Access Token available. Did you sign in with Google?');
      return;
    }

    setLoading(true);
    const newVitals: Record<string, any> = {};
    
    for (const vital of VITALS_CONFIG) {
      const data = await fetchVital(vital.id, accessToken);
      let value = '--';
      let lastUpdated = '--';
      
      if (data && data.dataPoints && data.dataPoints.length > 0) {
        const point = data.dataPoints[0];
        // Try to safely extract value based on common Google API structures
        value = point.value?.[0]?.intVal || point.value?.[0]?.fpVal || point.value || '--';
        lastUpdated = new Date().toLocaleTimeString();
      }
      
      newVitals[vital.id] = { value, lastUpdated };
    }
    
    setVitalsData(newVitals);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchElderlyProfile();
    loadVitals();
  }, [loadVitals]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('./(auth)/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{elderlyName}'s Vitals</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.refreshButton} onPress={loadVitals} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.refreshText}>Refresh Data</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {VITALS_CONFIG.map(vital => {
            const currentData = vitalsData[vital.id] || { value: '--', lastUpdated: '--' };
            return (
              <View key={vital.id} style={styles.card}>
                <Text style={styles.cardTitle}>{vital.name}</Text>
                <Text style={styles.cardValue}>
                  {currentData.value} <Text style={styles.cardUnit}>{vital.unit}</Text>
                </Text>
                <Text style={styles.cardTime}>Last updated: {currentData.lastUpdated}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scroll: {
    padding: 24,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    justifyContent: 'center',
  },
  refreshText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardUnit: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: 'normal',
  },
  cardTime: {
    fontSize: 12,
    color: '#64748B',
  },
});
