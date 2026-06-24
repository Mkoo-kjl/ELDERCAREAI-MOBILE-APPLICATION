import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';

export default function CaregiverSetup() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    
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
        <Text style={[styles.title, { color: colors.accent }]}>Your Information</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>Let's set up your caregiver profile.</Text>
        
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="John Doe"
            placeholderTextColor={colors.subtitle}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="+1 234 567 890"
            placeholderTextColor={colors.subtitle}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={[styles.label, { color: colors.text }]}>Age</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="e.g. 35"
            placeholderTextColor={colors.subtitle}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
          />

          <Text style={[styles.label, { color: colors.text }]}>Sex</Text>
          {renderRadio(['Male', 'Female', 'Other'], sex, setSex)}

          <Text style={[styles.label, { color: colors.text }]}>Relationship to Elderly</Text>
          {renderRadio(['Son', 'Daughter', 'Spouse', 'Other'], relationship, setRelationship)}
          
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Next</Text>}
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
