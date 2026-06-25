import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import ProfilePicturePicker from '../../components/ProfilePicturePicker';

export default function CaregiverSetup() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();

  // Load profile image from signup if it exists
  useEffect(() => {
    const loadImage = async () => {
      if (user) {
        const saved = await AsyncStorage.getItem(`caregiver_photo_${user.id}`);
        if (saved) setProfileImage(saved);
      }
    };
    loadImage();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    
    // Save profile image
    if (profileImage) {
      await AsyncStorage.setItem(`caregiver_photo_${user.id}`, profileImage);
    }
    
    // Note: Make sure 'age' and 'sex' columns exist in your 'caregivers' table in Supabase!
    const { error } = await supabase.from('caregivers').upsert({
      id: user.id,
      full_name: fullName,
      phone,
      relationship,
      age: age ? parseInt(age) : null,
      sex,
    });
    setLoading(false);
    
    if (error) {
      console.log('Error saving caregiver:', error);
      Alert.alert('Error', 'Failed to save caregiver profile. (Did you add age/sex columns to Supabase?)');
    } else {
      router.push('/setup/elderly' as any);
    }
  };

  const renderRadio = (options: string[], selected: string, onSelect: (val: string) => void) => (
    <View style={styles.radioGroup}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.radioOption,
            { backgroundColor: isDarkMode ? colors.card : '#F1F5F9', borderColor: colors.border },
            selected === opt && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.7}
        >
          <Text style={[styles.radioText, { color: colors.subtitle }, selected === opt && { color: '#fff' }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.accent }]}>Your Information</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>Let's set up your caregiver profile.</Text>

          {/* Profile Picture */}
          <ProfilePicturePicker
            imageUri={profileImage}
            onImageSelected={setProfileImage}
            size={110}
            label="Your Photo (Optional)"
            accentColor={colors.primary}
            subtitleColor={colors.subtitle}
          />
          
          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: isDarkMode ? colors.card : 'rgba(255,255,255,0.85)', borderColor: isDarkMode ? colors.border : 'rgba(226,232,240,0.6)' }]}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Personal Details</Text>

            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
              placeholder="John Doe"
              placeholderTextColor={colors.subtitle}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
              placeholder="+1 234 567 890"
              placeholderTextColor={colors.subtitle}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={[styles.label, { color: colors.text }]}>Age</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 35"
              placeholderTextColor={colors.subtitle}
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />

            <Text style={[styles.label, { color: colors.text }]}>Sex</Text>
            {renderRadio(['Male', 'Female', 'Other'], sex, setSex)}

            <View style={styles.divider} />
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Relationship</Text>

            <Text style={[styles.label, { color: colors.text }]}>Relationship to Elderly</Text>
            {renderRadio(['Son', 'Daughter', 'Spouse', 'Other'], relationship, setRelationship)}
            
            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={['#38BDF8', '#2DA3DC']} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>Next</Text>
                    <Text style={styles.buttonArrow}> →</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    fontWeight: '500',
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    borderRadius: 14,
    padding: 15,
    fontSize: 15,
    borderWidth: 1,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioOption: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 24,
  },
  buttonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
