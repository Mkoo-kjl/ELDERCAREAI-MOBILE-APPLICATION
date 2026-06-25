import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeColors = {
  background: string;
  card: string;
  cardElevated: string;
  text: string;
  subtitle: string;
  primary: string;
  accent: string;
  border: string;
  gradientStart: string;
  gradientEnd: string;
};

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
};

const lightColors: ThemeColors = {
  background: '#ffffff',
  card: '#f1f5f9',
  cardElevated: '#ffffff',
  text: '#0F172A',
  subtitle: '#64748B',
  primary: '#38BDF8', // Blue
  accent: '#14CD2F', // Green
  border: '#e2e8f0',
  gradientStart: '#FFFFFF',
  gradientEnd: '#EBF4FF',
};

const darkColors: ThemeColors = {
  background: '#0F172A',
  card: '#1E293B',
  cardElevated: '#243049',
  text: '#F1F5F9',
  subtitle: '#94A3B8',
  primary: '#38BDF8', // Blue
  accent: '#14CD2F', // Green
  border: '#334155',
  gradientStart: '#0B1120',
  gradientEnd: '#162544',
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  colors: lightColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('isDarkMode');
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    } catch (e) {
      console.log('Error loading theme', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('isDarkMode', JSON.stringify(newTheme));
    } catch (e) {
      console.log('Error saving theme', e);
    }
  };

  if (loading) return null; // Avoid flickering on boot

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
