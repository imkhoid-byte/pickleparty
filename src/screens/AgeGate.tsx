import { StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { Button, Screen } from '../ui/components';
import { colors } from '../ui/theme';

export function AgeGate() {
  const { updateSettings } = useApp();
  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <Text style={styles.emoji}>🥒🎉</Text>
        <Text style={styles.title}>Welcome to{'\n'}PickleParty</Text>
        <Text style={styles.body}>
          PickleParty has optional drinking-game modes. Are you of legal drinking age (21+) where you live?
        </Text>
        <View style={{ gap: 12, alignSelf: 'stretch' }}>
          <Button
            label="Yes, I'm 21+"
            onPress={() => updateSettings({ ageAsked: true, ageConfirmed: true, spice: 'tipsy' })}
          />
          <Button
            label="No — keep it alcohol-free"
            variant="secondary"
            onPress={() => updateSettings({ ageAsked: true, ageConfirmed: false, spice: 'chill' })}
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
  emoji: { fontSize: 80 },
  title: { color: colors.pickle, fontSize: 40, fontWeight: '900', textAlign: 'center' },
  body: { color: colors.text, fontSize: 18, textAlign: 'center', lineHeight: 26 },
  fine: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
