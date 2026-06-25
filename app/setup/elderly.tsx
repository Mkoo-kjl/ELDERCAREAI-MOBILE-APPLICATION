import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import ProfilePicturePicker from '../../components/ProfilePicturePicker';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ElderlySetup() {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    // Save elderly profile image
    if (profileImage) {
      await AsyncStorage.setItem(`elderly_photo_${user.id}`, profileImage);
    }
    
    const { error } = await supabase.from('elderly_profiles').insert({
      caregiver_id: user.id,
      full_name: fullName,
      age: parseInt(age, 10) || null,
      gender: sex, 
      weight_kg: parseFloat(weightKg) || null,
      height_cm: parseFloat(heightCm) || null,
      blood_type: bloodType,
      medical_conditions: medicalConditions,
      medications: medications,
      emergency_contact: emergencyContact,
    });
    
    setLoading(false);
    
    if (error) {
      console.log('Error saving elderly profile:', error);
      Alert.alert('Error', 'Failed to save elderly profile. Please make sure the database columns match.');
    } else {
      router.replace('/(tabs)' as any);
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

  const renderBloodTypeGrid = () => (
    <View style={styles.bloodTypeGrid}>
      {BLOOD_TYPES.map(type => (
        <TouchableOpacity
          key={type}
          style={[
            styles.bloodTypeButton,
            { backgroundColor: isDarkMode ? colors.card : '#F1F5F9', borderColor: colors.border },
            bloodType === type && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
          ]}
          onPress={() => setBloodType(type)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.bloodTypeText,
              { color: colors.subtitle },
              bloodType === type && { color: '#fff' },
            ]}
          >
            {type}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.accent }]}>Elderly Profile</Text>
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>Who are you caring for?</Text>

          {/* Profile Picture */}
          <ProfilePicturePicker
            imageUri={profileImage}
            onImageSelected={setProfileImage}
            size={110}
            label="Elderly's Photo (Optional)"
            accentColor={colors.accent}
            subtitleColor={colors.subtitle}
          />
          
          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: isDarkMode ? colors.card : 'rgba(255,255,255,0.85)', borderColor: isDarkMode ? colors.border : 'rgba(226,232,240,0.6)' }]}>
            <Text style={[styles.sectionLabel, { color: colors.accent }]}>Basic Information</Text>

            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
              placeholder="Jane Doe"
              placeholderTextColor={colors.subtitle}
              value={fullName}
              onChangeText={setFullName}
            />
            
            <Text style={[styles.label, { color: colors.text }]}>Age</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 75"
              placeholderTextColor={colors.subtitle}
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
            />

            <Text style={[styles.label, { color: colors.text }]}>Sex</Text>
            {renderRadio(['Male', 'Female', 'Other'], sex, setSex)}

            <View style={styles.divider} />
            <Text style={[styles.sectionLabel, { color: colors.accent }]}>Physical Details</Text>

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: colors.text }]}>Weight (kg)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                  placeholder="65.5"
                  placeholderTextColor={colors.subtitle}
                  keyboardType="decimal-pad"
                  value={weightKg}
                  onChangeText={setWeightKg}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: colors.text }]}>Height (cm)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                  placeholder="170"
                  placeholderTextColor={colors.subtitle}
                  keyboardType="decimal-pad"
                  value={heightCm}
                  onChangeText={setHeightCm}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Blood Type</Text>
            {renderBloodTypeGrid()}

            <View style={styles.divider} />
            <Text style={[styles.sectionLabel, { color: colors.accent }]}>Medical & Emergency</Text>

            <Text style={[styles.label, { color: colors.text }]}>Emergency Contact</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
              placeholder="+1 234 567 890"
              placeholderTextColor={colors.subtitle}
              keyboardType="phone-pad"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
            />

            <Text style={[styles.label, { color: colors.text }]}>Medical Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
              placeholder="Diabetes, Hypertension, etc."
              placeholderTextColor={colors.subtitle}
              multiline
              numberOfLines={3}
              value={medicalConditions}
              onChangeText={setMedicalConditions}
            />

            <Text style={[styles.label, { color: colors.text }]}>Medications</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
              placeholder="List of current medications"
              placeholderTextColor={colors.subtitle}
              multiline
              numberOfLines={3}
              value={medications}
              onChangeText={setMedications}
            />
            
            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={['#14CD2F', '#10B526']} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Profile ✓</Text>}
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
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
  bloodTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodTypeButton: {
    width: '22%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodTypeText: {
    fontSize: 15,
    fontWeight: '700',
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
