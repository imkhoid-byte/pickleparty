import { Image, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { Button, Screen } from '../ui/components';
import { colors } from '../ui/theme';

const LOGO = require('../../assets/brand/logo-badge-512.png');

export function AgeGate() {
  const { settings, updateSettings } = useApp();
  const answer = (adult: boolean) =>
    updateSettings({
      ageAsked: true,
      ageConfirmed: adult,
      spice: adult ? 'tipsy' : 'chill',
      // First launch also starts the free Pro trial.
      trialStartedAt: settings.trialStartedAt ?? Date.now(),
    });
  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <Image source={LOGO} style={styles.logo} accessibilityLabel="PickleParty" />
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.body}>
          PickleParty has optional drinking-game modes. Are you of legal drinking age (21+) where you live?
        </Text>
        <View style={{ gap: 12, alignSelf: 'stretch' }}>
          <Button
            label="Yes, I'm 21+"
            onPress={() => answer(true)}
          />
          <Button
            label="No — keep it alcohol-free"
            variant="secondary"
            onPress={() => answer(false)}
          />
        </View>
        <Text style={styles.fine}>
          Please play responsibly. Never drink and drive, stay hydrated, and know when to call it. Chill mode is
          always available and never mentions alcohol.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  logo: { width: 260, height: 260 },
  title: { color: colors.pickle, fontSize: 40, fontWeight: '900', textAlign: 'center' },
  body: { color: colors.text, fontSize: 18, textAlign: 'center', lineHeight: 26 },
  fine: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
