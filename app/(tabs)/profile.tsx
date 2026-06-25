import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import ProfilePicturePicker from '../../components/ProfilePicturePicker';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const [caregiverPhoto, setCaregiverPhoto] = useState<string | null>(null);
  const [elderlyPhoto, setElderlyPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [user]);

  const loadPhotos = async () => {
    if (!user) return;
    const cPhoto = await AsyncStorage.getItem(`caregiver_photo_${user.id}`);
    const ePhoto = await AsyncStorage.getItem(`elderly_photo_${user.id}`);
    if (cPhoto) setCaregiverPhoto(cPhoto);
    if (ePhoto) setElderlyPhoto(ePhoto);
  };

  const handleCaregiverPhotoChange = async (uri: string) => {
    if (!user) return;
    setCaregiverPhoto(uri);
    await AsyncStorage.setItem(`caregiver_photo_${user.id}`, uri);
  };

  const handleElderlyPhotoChange = async (uri: string) => {
    if (!user) return;
    setElderlyPhoto(uri);
    await AsyncStorage.setItem(`elderly_photo_${user.id}`, uri);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={isDarkMode ? ['#162544', '#0F172A'] : ['#EBF4FF', '#FFFFFF']}
          style={styles.header}
        >
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>Manage your account & photos</Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Account Info */}
          <View style={[styles.card, { backgroundColor: colors.cardElevated, shadowColor: isDarkMode ? '#000' : '#94A3B8' }]}>
            <View style={styles.cardRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? colors.card : 'rgba(56,189,248,0.08)' }]}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardRowText}>
                <Text style={[styles.cardLabel, { color: colors.subtitle }]}>Logged in as</Text>
                <Text style={[styles.cardValue2, { color: colors.text }]}>{user?.email}</Text>
              </View>
            </View>
          </View>

          {/* Profile Photos Section */}
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>PROFILE PHOTOS</Text>
          
          <View style={[styles.card, { backgroundColor: colors.cardElevated, shadowColor: isDarkMode ? '#000' : '#94A3B8' }]}>
            <View style={styles.photosRow}>
              <View style={styles.photoColumn}>
                <Text style={[styles.photoLabel, { color: colors.subtitle }]}>Your Photo</Text>
                <ProfilePicturePicker
                  imageUri={caregiverPhoto}
                  onImageSelected={handleCaregiverPhotoChange}
                  size={80}
                  label=""
                  accentColor={colors.primary}
                  subtitleColor={colors.subtitle}
                />
              </View>
              <View style={styles.photoColumn}>
                <Text style={[styles.photoLabel, { color: colors.subtitle }]}>Elderly Photo</Text>
                <ProfilePicturePicker
                  imageUri={elderlyPhoto}
                  onImageSelected={handleElderlyPhotoChange}
                  size={80}
                  label=""
                  accentColor={colors.accent}
                  subtitleColor={colors.subtitle}
                />
              </View>
            </View>
          </View>

          {/* Preferences */}
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>PREFERENCES</Text>

          <View style={[styles.card, { backgroundColor: colors.cardElevated, shadowColor: isDarkMode ? '#000' : '#94A3B8' }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? colors.card : 'rgba(56,189,248,0.08)' }]}>
                  <Ionicons name={isDarkMode ? 'moon' : 'sunny-outline'} size={20} color={colors.primary} />
                </View>
                <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
              </View>
              <Switch 
                value={isDarkMode} 
                onValueChange={toggleTheme} 
                trackColor={{ false: '#E2E8F0', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
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
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    padding: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardRowText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  cardValue2: {
    fontSize: 15,
    fontWeight: '700',
  },
  photosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  photoColumn: {
    alignItems: 'center',
    gap: 8,
  },
  photoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
