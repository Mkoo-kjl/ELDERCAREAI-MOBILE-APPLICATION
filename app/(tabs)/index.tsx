import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useGoogleHealth } from '../../providers/GoogleHealthProvider';
import GoogleHealthPermissionModal from '../../components/GoogleHealthPermissionModal';
import { useFocusEffect } from 'expo-router';

type ElderlyProfile = {
  name: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  bloodType: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  
  const {
    connectionStatus,
    showPermissionPrompt,
    healthData,
    isLoadingHealth,
    error,
    errorCode,
    fetchLatestHealth,
    reconnectGoogleHealth,
  } = useGoogleHealth();

  const [profile, setProfile] = useState<ElderlyProfile>({
    name: 'Loading...', age: '', gender: '', weight: '', height: '', bloodType: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const fetchElderlyProfile = async () => {
    if (!user) return;

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

  useEffect(() => {
    fetchElderlyProfile();
  }, [user]);

  // Fetch health data whenever the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchLatestHealth();
    }, [fetchLatestHealth])
  );

  const onRefresh = useCallback(async () => {
    await fetchLatestHealth();
  }, [fetchLatestHealth]);

  const detailPills = [
    { label: profile.age ? `${profile.age} y.o` : '', icon: 'calendar-outline' as const },
    { label: profile.gender, icon: 'person-outline' as const },
    { label: profile.weight, icon: 'fitness-outline' as const },
    { label: profile.height, icon: 'resize-outline' as const },
    { label: profile.bloodType, icon: 'water-outline' as const },
  ].filter(p => p.label);

  const renderCard = (title: string, value: string, unit: string, icon: string, fullWidth: boolean = false, timestamp?: string) => (
    <View style={[styles.card, fullWidth ? styles.cardFull : styles.cardHalf, { backgroundColor: colors.cardElevated, shadowColor: isDarkMode ? '#000' : '#94A3B8' }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name={icon as any} size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.cardTitle, { color: colors.subtitle }]}>{title}</Text>
        </View>
        {timestamp && (
          <Text style={[styles.timestampText, { color: colors.subtitle }]}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.cardUnit, { color: colors.subtitle }]}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoogleHealthPermissionModal
        visible={showPermissionPrompt}
        isReconnect={connectionStatus === 'expired'}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingHealth}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        
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

        {/* Error Banner */}
        {error && !showPermissionPrompt && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            {(errorCode === 'TOKEN_EXPIRED' || errorCode === 'TOKEN_REVOKED') && (
              <TouchableOpacity style={styles.reconnectButton} onPress={reconnectGoogleHealth}>
                <Text style={styles.reconnectButtonText}>Reconnect</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Cards Grid */}
        <View style={styles.grid}>
          {isLoadingHealth && !healthData ? (
             <View style={styles.loadingContainer}>
               <ActivityIndicator size="large" color={colors.primary} />
               <Text style={[styles.loadingText, { color: colors.subtitle }]}>Syncing with Google Health...</Text>
             </View>
          ) : (
            <>
              <View style={styles.row}>
                {renderCard('Heart Rate', healthData?.heartRate.value || '--', 'BPM', 'heart-outline', false, healthData?.heartRate.timestamp)}
                {renderCard('SpO2', healthData?.bloodOxygen.value || '--', '%', 'pulse-outline', false, healthData?.bloodOxygen.timestamp)}
              </View>
              
              {renderCard('Sleep', healthData?.sleep.value || '--', 'hrs', 'moon-outline', true, healthData?.sleep.timestamp)}
              
              <View style={styles.row}>
                {renderCard('Exercise', healthData?.exercise.value || '--', 'min', 'analytics-outline', false, healthData?.exercise.timestamp)}
                {renderCard('Steps', healthData?.steps.value || '--', '', 'footsteps-outline', false, healthData?.steps.timestamp)}
              </View>

              {healthData?.lastSyncedAt && (
                <Text style={[styles.syncText, { color: colors.subtitle }]}>
                  Last synced: {new Date(healthData.lastSyncedAt).toLocaleString()}
                </Text>
              )}
            </>
          )}
        </View>

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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  reconnectButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  reconnectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  timestampText: {
    fontSize: 11,
    fontWeight: '400',
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  syncText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  }
});
