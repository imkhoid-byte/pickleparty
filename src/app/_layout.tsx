import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider, useApp } from '../AppState';
import { unlockAudio } from '../audio/announcer';
import { TERMS_VERSION } from '../config';
import { AgeGate } from '../screens/AgeGate';
import { colors } from '../ui/theme';

function Gate() {
  const { ready, settings } = useApp();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  // First launch, or the Terms changed since the player agreed to them.
  if (!settings.ageAsked || settings.termsVersion !== TERMS_VERSION) return <AgeGate />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="pro" options={{ presentation: 'modal' }} />
      <Stack.Screen name="match" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

/** Web only: unlock speech and sound on every tap anywhere (see unlockAudio). */
function useUnlockAudioOnTaps() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    // Every tap, not just the first: iPhone can stop the background silence that keeps the
    // announcer audible on silent (a call, another app), and only a tap can restart it.
    const events = ['touchend', 'click', 'keydown'] as const;
    events.forEach((e) => document.addEventListener(e, unlockAudio, true));
    return () => events.forEach((e) => document.removeEventListener(e, unlockAudio, true));
  }, []);
}

export default function RootLayout() {
  useUnlockAudioOnTaps();
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="light" />
        <Gate />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
