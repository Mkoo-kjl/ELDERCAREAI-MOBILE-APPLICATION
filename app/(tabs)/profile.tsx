import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDarkMode, toggleTheme, colors } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.accent }]}>Profile / Settings</Text>
      <Text style={[styles.subtitle, { color: colors.subtitle }]}>User profile, device settings, emergency contacts, and app preferences will appear here.</Text>
      
      <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoLabel, { color: colors.subtitle }]}>Logged in as:</Text>
        <Text style={[styles.infoText, { color: colors.text }]}>{user?.email}</Text>
      </View>

      <View style={[styles.settingRow, { backgroundColor: colors.card }]}>
        <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
        <Switch 
          value={isDarkMode} 
          onValueChange={toggleTheme} 
          trackColor={{ false: '#767577', true: colors.primary }}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

