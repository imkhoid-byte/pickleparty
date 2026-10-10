import { StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { SPICES, isAlcoholic } from '../game/spice';
import { leaderboard } from '../game/stats';
import { Button, Chip, Label, Screen } from '../ui/components';
import { colors } from '../ui/theme';
import type { Navigate } from './routes';

export function Home({ go }: { go: Navigate }) {
  const { settings, updateSettings, history } = useApp();
  const champ = leaderboard(history)[0];
  const pickles = history.filter((g) => g.pickled).length;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logoEmoji}>🥒</Text>
        <Text style={styles.logo}>PICKLE</Text>
        <Text style={[styles.logo, { color: colors.pink, marginTop: -14 }]}>PARTY</Text>
        <Text style={styles.tagline}>Keep score. Cause chaos. Don't get pickled.</Text>
      </View>

      <Button label="🏓  Start a Match" onPress={() => go({ name: 'setup' })} />
      <Button label="🃏  Draw a Party Card" variant="pink" onPress={() => go({ name: 'deck' })} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button
          label="🏆 Stats"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => go({ name: 'history' })}
        />
        <Button label="🎁 Packs" variant="secondary" style={{ flex: 1 }} onPress={() => go({ name: 'store' })} />
      </View>

      <Label>Spice level</Label>
      <View style={styles.row}>
        {SPICES.filter((s) => settings.ageConfirmed || !isAlcoholic(s.id)).map((s) => (
          <Chip
            key={s.id}
            label={`${s.emoji} ${s.label}`}
            selected={settings.spice === s.id}
            color={s.id === 'wild' ? colors.orange : s.id === 'tipsy' ? colors.pink : colors.pickle}
            onPress={() => updateSettings({ spice: s.id })}
          />
        ))}
      </View>
      <Text style={styles.muted}>{SPICES.find((s) => s.id === settings.spice)?.blurb}</Text>
      {!settings.ageConfirmed && (
        <Text style={styles.link} onPress={() => updateSettings({ ageAsked: false })}>
          21+? Unlock drinking modes
        </Text>
      )}

      {history.length > 0 && (
        <View style={styles.stats}>
          <Stat value={history.length} label="games" />
          <Stat value={pickles} label="pickles 🥒" />
          <Stat value={champ ? champ.name : '—'} label="top dog" />
        </View>
      )}
    </Screen>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 24 },
  logoEmoji: { fontSize: 64, transform: [{ rotate: '-20deg' }] },
  logo: { color: colors.pickle, fontSize: 64, fontWeight: '900', letterSpacing: 2 },
  tagline: { color: colors.muted, fontSize: 16, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muted: { color: colors.muted, fontSize: 14 },
  link: { color: colors.sky, fontSize: 14, fontWeight: '700' },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
});
