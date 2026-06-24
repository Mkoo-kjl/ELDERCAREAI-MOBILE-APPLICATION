import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';

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
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    
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
          style={[styles.radioOption, { backgroundColor: colors.card, borderColor: colors.border }, selected === opt && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.radioText, { color: colors.subtitle }, selected === opt && { color: '#fff' }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.accent }]}>Elderly Profile</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>Who are you caring for?</Text>
        
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Jane Doe"
            placeholderTextColor={colors.subtitle}
            value={fullName}
            onChangeText={setFullName}
          />
          
          <Text style={[styles.label, { color: colors.text }]}>Age</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="e.g. 75"
            placeholderTextColor={colors.subtitle}
            keyboardType="number-pad"
            value={age}
            onChangeText={setAge}
          />

          <Text style={[styles.label, { color: colors.text }]}>Sex</Text>
          {renderRadio(['Male', 'Female', 'Other'], sex, setSex)}

          <Text style={[styles.label, { color: colors.text }]}>Weight (kg)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="e.g. 65.5"
            placeholderTextColor={colors.subtitle}
            keyboardType="decimal-pad"
            value={weightKg}
            onChangeText={setWeightKg}
          />

          <Text style={[styles.label, { color: colors.text }]}>Height (cm)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="e.g. 170"
            placeholderTextColor={colors.subtitle}
            keyboardType="decimal-pad"
            value={heightCm}
            onChangeText={setHeightCm}
          />

          <Text style={[styles.label, { color: colors.text }]}>Blood Type</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="e.g. O+, A-, etc."
            placeholderTextColor={colors.subtitle}
            value={bloodType}
            onChangeText={setBloodType}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, { color: colors.text }]}>Emergency Contact</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="+1 234 567 890"
            placeholderTextColor={colors.subtitle}
            keyboardType="phone-pad"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
          />

          <Text style={[styles.label, { color: colors.text }]}>Medical Conditions</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Diabetes, Hypertension, etc."
            placeholderTextColor={colors.subtitle}
            multiline
            numberOfLines={4}
            value={medicalConditions}
            onChangeText={setMedicalConditions}
          />

          <Text style={[styles.label, { color: colors.text }]}>Medications</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="List of current medications"
            placeholderTextColor={colors.subtitle}
            multiline
            numberOfLines={4}
            value={medications}
            onChangeText={setMedications}
          />
          
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Profile</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
