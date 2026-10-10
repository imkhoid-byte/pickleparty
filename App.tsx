import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider, useApp } from './src/AppState';
import { AgeGate } from './src/screens/AgeGate';
import { Deck } from './src/screens/Deck';
import { History } from './src/screens/History';
import { Home } from './src/screens/Home';
import { Match } from './src/screens/Match';
import type { Route } from './src/screens/routes';
import { Setup } from './src/screens/Setup';
import { Store } from './src/screens/Store';
import { colors } from './src/ui/theme';

function Router() {
  const { ready, settings } = useApp();
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const route = stack[stack.length - 1];

  const go = useCallback((r: Route) => {
    // Starting a match replaces the setup screen so "back" returns home.
    setStack((s) => (r.name === 'match' ? [...s.filter((x) => x.name !== 'setup'), r] : [...s, r]));
  }, []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length <= 1) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [stack.length, back]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!settings.ageAsked) return <AgeGate />;

  switch (route.name) {
    case 'home':
      return <Home go={go} />;
    case 'setup':
      return <Setup go={go} back={back} />;
    case 'match':
      return <Match config={route.config} firstServer={route.firstServer} back={back} />;
    case 'deck':
      return <Deck back={back} openStore={() => go({ name: 'store' })} />;
    case 'history':
      return <History back={back} />;
    case 'store':
      return <Store back={back} />;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="light" />
        <Router />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
