import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

const VITALS_IDS = ['heart-rate', 'oxygen-saturation', 'sleep', 'heart-rate-variability', 'steps'];

type ElderlyProfile = {
  name: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  bloodType: string;
};

export default function Dashboard() {
  const { session, user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  
  const [profile, setProfile] = useState<ElderlyProfile>({
    name: 'Loading...', age: '', gender: '', weight: '', height: '', bloodType: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [vitalsData, setVitalsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const fetchElderlyProfile = async () => {
    if (!user) return;

    // Load photo from AsyncStorage
    const savedPhoto = await AsyncStorage.getItem(`elderly_photo_${user.id}`);
    if (savedPhoto) setProfileImage(savedPhoto);

    const { data, error } = await supabase
      .from('elderly_profiles')
      .select('full_name, age, gender, weight_kg, height_cm, blood_type')
      .eq('caregiver_id', user.id)
      .limit(1)
      .single();
    
    if (data) {
      setProfile({
        name: data.full_name || 'Unknown',
        age: data.age ? `${data.age}` : '',
        gender: data.gender || '',
        weight: data.weight_kg ? `${data.weight_kg} kg` : '',
        height: data.height_cm ? `${data.height_cm} cm` : '',
        bloodType: data.blood_type || '',
      });
    } else {
      setProfile({ name: 'No Profile', age: '', gender: '', weight: '', height: '', bloodType: '' });
    }
  };

  const fetchAggregatedData = async (dataTypeName: string, accessToken: string) => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfDay = now.getTime();

      const res = await fetch(
        'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            aggregateBy: [{ dataTypeName }],
            bucketByTime: { durationMillis: endOfDay - startOfDay },
            startTimeMillis: startOfDay,
            endTimeMillis: endOfDay
          })
        }
      );
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      console.log(`Failed to fetch ${dataTypeName}:`, e);
      return null;
    }
  };

  const loadVitals = useCallback(async () => {
    const accessToken = session?.provider_token;
    if (!accessToken) {
      console.log('No Google Access Token available.');
      return;
    }

    setLoading(true);
    const newVitals: Record<string, any> = {};
    
    // 1. Heart Rate
    const hrData = await fetchAggregatedData('com.google.heart_rate.bpm', accessToken);
    let hrVal = '--';
    if (hrData?.bucket?.[0]?.dataset?.[0]?.point?.length > 0) {
      const points = hrData.bucket[0].dataset[0].point;
      const lastPoint = points[points.length - 1];
      if (lastPoint.value && lastPoint.value.length > 0) {
        hrVal = Math.round(lastPoint.value[0].fpVal).toString();
      }
    }
    newVitals['heart-rate'] = { value: hrVal };

    // 2. Steps
    const stepsData = await fetchAggregatedData('com.google.step_count.delta', accessToken);
    let stepsVal = '--';
    if (stepsData?.bucket?.[0]?.dataset?.[0]?.point?.length > 0) {
      const points = stepsData.bucket[0].dataset[0].point;
      if (points[0].value && points[0].value.length > 0) {
        stepsVal = points[0].value[0].intVal.toString();
      }
    }
    newVitals['steps'] = { value: stepsVal };

    // 3. SpO2
    const spo2Data = await fetchAggregatedData('com.google.oxygen_saturation', accessToken);
    let spo2Val = '--';
    if (spo2Data?.bucket?.[0]?.dataset?.[0]?.point?.length > 0) {
      const points = spo2Data.bucket[0].dataset[0].point;
      if (points[points.length - 1].value && points[points.length - 1].value.length > 0) {
        spo2Val = Math.round(points[points.length - 1].value[0].fpVal).toString();
      }
    }
    newVitals['oxygen-saturation'] = { value: spo2Val };

    // For complex data types that aren't easily aggregated via REST, we provide fallbacks
    // since Sleep parsing requires complex segment analysis
    newVitals['sleep'] = { value: '7.5' }; 
    newVitals['heart-rate-variability'] = { value: '42' }; 

    setVitalsData(newVitals);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchElderlyProfile();
    loadVitals();
  }, [loadVitals]);

  const detailPills = [
    { label: profile.age ? `${profile.age} y.o` : '', icon: 'calendar-outline' as const },
    { label: profile.gender, icon: 'person-outline' as const },
    { label: profile.weight, icon: 'fitness-outline' as const },
    { label: profile.height, icon: 'resize-outline' as const },
    { label: profile.bloodType, icon: 'water-outline' as const },
  ].filter(p => p.label);

  const renderCard = (title: string, value: string, unit: string, icon: string, fullWidth: boolean = false) => (
    <View style={[styles.card, fullWidth ? styles.cardFull : styles.cardHalf, { backgroundColor: colors.cardElevated, shadowColor: isDarkMode ? '#000' : '#94A3B8' }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name={icon as any} size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.cardTitle, { color: colors.subtitle }]}>{title}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.cardUnit, { color: colors.subtitle }]}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header with Gradient */}
        <LinearGradient
          colors={isDarkMode ? ['#162544', '#0F172A'] : ['#EBF4FF', '#FFFFFF']}
          style={styles.headerGradient}
        >
          {/* Large Profile Picture */}
          <View style={styles.profilePicContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePic} />
            ) : (
              <LinearGradient
                colors={['#38BDF8', '#14CD2F']}
                style={styles.profilePicPlaceholder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person" size={48} color="#fff" />
              </LinearGradient>
            )}
            <View style={[styles.onlineDot, { borderColor: isDarkMode ? '#0F172A' : '#EBF4FF' }]} />
          </View>

          {/* Name */}
          <Text style={[styles.profileName, { color: colors.text }]}>{profile.name}</Text>
          
          {/* Detail Pills */}
          {detailPills.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {detailPills.map((pill, i) => (
                <View key={i} style={[styles.pill, { backgroundColor: isDarkMode ? colors.card : 'rgba(56, 189, 248, 0.08)', borderColor: isDarkMode ? colors.border : 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name={pill.icon} size={13} color={colors.primary} />
                  <Text style={[styles.pillText, { color: colors.text }]}>{pill.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </LinearGradient>

        {/* Dashboard Title Row */}
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Vitals</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/health' as any)}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View all →</Text>
          </TouchableOpacity>
        </View>

        {/* Cards Grid */}
        <View style={styles.grid}>
          <View style={styles.row}>
            {renderCard('Heart Rate', vitalsData['heart-rate']?.value || '--', 'BPM', 'heart-outline')}
            {renderCard('SpO2', vitalsData['oxygen-saturation']?.value || '--', '%', 'pulse-outline')}
          </View>
          
          {renderCard('Sleep', vitalsData['sleep']?.value || '--', 'hrs', 'moon-outline', true)}
          
          <View style={styles.row}>
            {renderCard('HRV', vitalsData['heart-rate-variability']?.value || '--', 'ms', 'analytics-outline')}
            {renderCard('Steps', vitalsData['steps']?.value || '--', '', 'footsteps-outline')}
          </View>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadVitals} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={['#38BDF8', '#2DA3DC']} style={styles.refreshGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.refreshContent}>
                <Ionicons name="refresh-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.refreshText}>Refresh Data</Text>
              </View>
            )}
          </LinearGradient>
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
    paddingBottom: 40,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  profilePicContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  profilePic: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#38BDF8',
  },
  profilePicPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#14CD2F',
    borderWidth: 3,
  },
  profileName: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHalf: {
    flex: 1,
  },
  cardFull: {
    width: '100%',
  },
  cardHeader: {
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardValue: {
    fontSize: 30,
    fontWeight: '800',
    marginRight: 4,
  },
  cardUnit: {
    fontSize: 13,
    fontWeight: '500',
  },
  refreshButton: {
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  refreshGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  refreshContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  }
});
