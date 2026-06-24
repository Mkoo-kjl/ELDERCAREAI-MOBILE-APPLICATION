import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

const VITALS_IDS = ['heart-rate', 'oxygen-saturation', 'sleep', 'heart-rate-variability', 'steps'];

export default function Dashboard() {
  const { session, user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  
  const [profile, setProfile] = useState<{name: string, age: string, gender: string}>({ name: 'Loading...', age: '', gender: '' });
  const [vitalsData, setVitalsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const fetchElderlyProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('elderly_profiles')
      .select('full_name, age, gender')
      .eq('caregiver_id', user.id)
      .limit(1)
      .single();
    
    if (data) {
      setProfile({
        name: data.full_name || 'Unknown',
        age: data.age ? `${data.age} y.o` : '',
        gender: data.gender ? `${data.gender}, ` : '',
      });
    } else {
      setProfile({ name: 'Unknown Profile', age: '', gender: '' });
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
    
    for (const vitalId of VITALS_IDS) {
      const data = await fetchVital(vitalId, accessToken);
      let value = '--';
      
      if (data && data.dataPoints && data.dataPoints.length > 0) {
        const point = data.dataPoints[0];
        value = point.value?.[0]?.intVal || point.value?.[0]?.fpVal || point.value || '--';
      }
      
      newVitals[vitalId] = { value };
    }
    
    setVitalsData(newVitals);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchElderlyProfile();
    loadVitals();
  }, [loadVitals]);

  const renderCard = (title: string, value: string, unit: string, fullWidth: boolean = false) => (
    <View style={[styles.card, fullWidth ? styles.cardFull : styles.cardHalf, { backgroundColor: colors.card, shadowColor: isDarkMode ? '#000' : '#CBD5E1' }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.subtitle} />
      </View>
      
      {/* Placeholder for chart visuals */}
      <View style={[styles.chartPlaceholder, { height: fullWidth ? 10 : 40 }]} />
      
      <View style={styles.cardFooter}>
        <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.cardUnit, { color: colors.subtitle }]}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{profile.name}</Text>
            <Text style={[styles.profileDetails, { color: colors.subtitle }]}>
              {profile.gender}{profile.age}
            </Text>
          </View>
        </View>

        {/* Dashboard Title Row */}
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dashboard</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/health' as any)}>
            <Text style={[styles.viewAllText, { color: colors.subtitle }]}>View all</Text>
          </TouchableOpacity>
        </View>

        {/* Cards Grid */}
        <View style={styles.grid}>
          <View style={styles.row}>
            {renderCard('Heart rate', vitalsData['heart-rate']?.value || '--', 'BPM')}
            {renderCard('SpO2', vitalsData['oxygen-saturation']?.value || '--', '%')}
          </View>
          
          {renderCard('Sleep', vitalsData['sleep']?.value || '--', 'hrs', true)}
          
          <View style={styles.row}>
            {renderCard('HRV', vitalsData['heart-rate-variability']?.value || '--', 'ms')}
            {renderCard('Steps', vitalsData['steps']?.value || '--', '')}
          </View>
        </View>

        <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.primary }]} onPress={loadVitals} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.refreshText}>Refresh Data</Text>}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileDetails: {
    fontSize: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  grid: {
    gap: 16,
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardHalf: {
    flex: 1,
  },
  cardFull: {
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartPlaceholder: {
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '800',
    marginRight: 4,
  },
  cardUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  refreshText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
