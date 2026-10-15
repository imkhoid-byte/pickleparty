import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider, useApp } from '../AppState';
import { AgeGate } from '../screens/AgeGate';
import { colors } from '../ui/theme';

function Gate() {
  const { ready, settings } = useApp();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!settings.ageAsked) return <AgeGate />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="pro" options={{ presentation: 'modal' }} />
      <Stack.Screen name="match" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="light" />
        <Gate />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
