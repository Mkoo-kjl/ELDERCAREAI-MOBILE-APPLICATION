/**
 * GoogleHealthPermissionModal — Full-screen modal prompting users to connect
 * their Google Health account for Fitbit Inspire 3 data access.
 *
 * Matches the existing app design language with gradients, cards, and icons.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { useGoogleHealth } from '../providers/GoogleHealthProvider';

type Props = {
  visible: boolean;
  /** If true, shows "reconnect" messaging instead of first-time connect */
  isReconnect?: boolean;
};

const FEATURES = [
  {
    icon: 'heart' as const,
    color: '#EF4444',
    title: 'Heart Rate',
    description: 'Continuous heart rate monitoring from your Fitbit',
  },
  {
    icon: 'pulse' as const,
    color: '#38BDF8',
    title: 'Blood Oxygen (SpO₂)',
    description: 'Overnight oxygen saturation levels',
  },
  {
    icon: 'footsteps' as const,
    color: '#14CD2F',
    title: 'Steps & Activity',
    description: 'Daily steps, exercise minutes, and activity data',
  },
  {
    icon: 'moon' as const,
    color: '#8B5CF6',
    title: 'Sleep Tracking',
    description: 'Sleep duration and stage analysis',
  },
];

export default function GoogleHealthPermissionModal({
  visible,
  isReconnect = false,
}: Props) {
  const { colors, isDarkMode } = useTheme();
  const {
    connectGoogleHealth,
    reconnectGoogleHealth,
    dismissPermissionPrompt,
    isConnecting,
    error,
    clearError,
  } = useGoogleHealth();

  const handleConnect = async () => {
    clearError();
    if (isReconnect) {
      await reconnectGoogleHealth();
    } else {
      await connectGoogleHealth();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <LinearGradient
        colors={
          isDarkMode
            ? ['#0B1120', '#162544', '#1E3A5F']
            : ['#FFFFFF', '#EBF4FF', '#E0EFFF']
        }
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={
                isReconnect
                  ? ['#F59E0B', '#D97706']
                  : ['#14CD2F', '#0EA224']
              }
              style={styles.iconBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={isReconnect ? 'refresh' : 'fitness-outline'}
                size={50}
                color="#fff"
              />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isReconnect
              ? 'Reconnect Google Health'
              : 'Connect Your Fitbit'}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>
            {isReconnect
              ? 'Your Google Health access has expired. Reconnect to continue viewing health data from your Fitbit Inspire 3.'
              : 'ElderCareAI needs access to your Google Health data to display real-time health metrics from your Fitbit Inspire 3.'}
          </Text>

          {/* Features Card */}
          <View
            style={[
              styles.featuresCard,
              {
                backgroundColor: isDarkMode
                  ? colors.card
                  : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDarkMode
                  ? colors.border
                  : 'rgba(226, 232, 240, 0.6)',
              },
            ]}
          >
            <Text
              style={[
                styles.featuresTitle,
                { color: isDarkMode ? colors.primary : '#334155' },
              ]}
            >
              Data We'll Access
            </Text>

            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View
                  style={[
                    styles.featureIconWrap,
                    {
                      backgroundColor: isDarkMode
                        ? `${feature.color}20`
                        : `${feature.color}12`,
                    },
                  ]}
                >
                  <Ionicons
                    name={feature.icon}
                    size={20}
                    color={feature.color}
                  />
                </View>
                <View style={styles.featureText}>
                  <Text
                    style={[styles.featureTitle, { color: colors.text }]}
                  >
                    {feature.title}
                  </Text>
                  <Text
                    style={[
                      styles.featureDescription,
                      { color: colors.subtitle },
                    ]}
                  >
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={colors.subtitle}
            />
            <Text style={[styles.privacyText, { color: colors.subtitle }]}>
              Your data is stored securely and never shared with third parties.
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle"
                size={18}
                color="#EF4444"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleConnect}
            disabled={isConnecting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#4285F4', '#3367D6']}
              style={styles.googleGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isConnecting ? (
                <View style={styles.googleContent}>
                  <ActivityIndicator
                    color="#fff"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.googleButtonText}>
                    Connecting...
                  </Text>
                </View>
              ) : (
                <View style={styles.googleContent}>
                  <View style={styles.googleIconWrapper}>
                    <Image
                      source={require('../assets/images/google-logo.png')}
                      style={styles.googleIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.googleButtonText}>
                    {isReconnect
                      ? 'Reconnect with Google'
                      : 'Connect with Google Health'}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {!isReconnect && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={dismissPermissionPrompt}
              disabled={isConnecting}
            >
              <Text style={[styles.skipText, { color: colors.subtitle }]}>
                Skip for now
              </Text>
            </TouchableOpacity>
          )}

          {isReconnect && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={dismissPermissionPrompt}
              disabled={isConnecting}
            >
              <Text style={[styles.skipText, { color: colors.subtitle }]}>
                Dismiss
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    shadowColor: '#14CD2F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
    paddingHorizontal: 10,
    fontWeight: '500',
  },
  featuresCard: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    width: '100%',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  googleButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  googleGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
