import { Stack } from 'expo-router';
import { AuthProvider } from '../providers/AuthProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { GoogleHealthProvider } from '../providers/GoogleHealthProvider';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GoogleHealthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="setup" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </GoogleHealthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
