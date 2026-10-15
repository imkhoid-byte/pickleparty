import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider, useApp } from '../AppState';
import { unlockAudio } from '../audio/announcer';
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

/** Web only: unlock speech and sound on the first tap anywhere (see unlockAudio). */
function useUnlockAudioOnFirstTap() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const events = ['touchend', 'click', 'keydown'] as const;
    const onTap = () => {
      unlockAudio();
      events.forEach((e) => document.removeEventListener(e, onTap, true));
    };
    events.forEach((e) => document.addEventListener(e, onTap, true));
    return () => events.forEach((e) => document.removeEventListener(e, onTap, true));
  }, []);
}

export default function RootLayout() {
  useUnlockAudioOnFirstTap();
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="light" />
        <Gate />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
