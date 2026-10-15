import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { playerRecords } from '../game/players';
import { SPICES, isAlcoholic } from '../game/spice';
import { autoPaywall } from '../monetization/entitlements';
import { openPaywall } from '../navigation';
import { Button, Chip, Label, Screen } from '../ui/components';
import { colors, radius } from '../ui/theme';

export function Home() {
  const { settings, updateSettings, history, access, session } = useApp();
  const champ = playerRecords(history)[0];
  const pickles = history.filter((g) => g.pickled).length;
  const partyGames = session ? history.filter((g) => g.sessionId === session.id).length : 0;

  // The only automatic paywall: once, right after the free trial ends.
  useEffect(() => {
    const reason = autoPaywall(access, settings.trialEndedPaywallShown);
    if (reason) {
      updateSettings({ trialEndedPaywallShown: true });
      openPaywall(reason);
    }
  }, [access, settings.trialEndedPaywallShown, updateSettings]);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logoEmoji}>🥒</Text>
        <Text style={styles.logo}>PICKLE</Text>
        <Text style={[styles.logo, { color: colors.pink, marginTop: -14 }]}>PARTY</Text>
        <Text style={styles.tagline}>Play your games. We&apos;ll bring the chaos.</Text>
      </View>

      <ProBadge />

      {session ? (
        <>
          <Button
            label={`▶️  Back to the party (${partyGames} game${partyGames === 1 ? '' : 's'})`}
            onPress={() => router.push('/party')}
          />
          <Text style={styles.muted}>Party in progress with {session.present.join(', ')}.</Text>
        </>
      ) : (
        <Button label="🥒  Start a Party" onPress={() => router.push('/party/new')} />
      )}
      <Button label="🃏  Party Deck" variant="pink" onPress={() => router.push('/deck')} />
      <View style={styles.grid}>
        <Button label="🏆 Stats" variant="secondary" style={styles.cell} onPress={() => router.push('/stats')} />
        <Button label="🎁 Packs" variant="secondary" style={styles.cell} onPress={() => router.push('/packs')} />
        <Button
          label="✏️ My Cards"
          variant="secondary"
          style={styles.cell}
          onPress={() => (access.isPro ? router.push('/mycards') : openPaywall('customCards'))}
        />
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

      {!session && history.length === 0 && (
        <View style={styles.how}>
          <Text style={styles.howTitle}>How it works</Text>
          <Text style={styles.muted}>1. Add who&apos;s playing. The app picks teams and a house rule.</Text>
          <Text style={styles.muted}>2. Play like normal. Phone stays on the bench.</Text>
          <Text style={styles.muted}>3. Enter the score after each game. Losers pay up. 🥒</Text>
        </View>
      )}
    </Screen>
  );
}

function ProBadge() {
  const { access } = useApp();
  if (access.source === 'subscription') {
    return <Text style={[styles.badgeText, { textAlign: 'center' }]}>👑 PickleParty Pro</Text>;
  }
  const trial = access.source === 'trial';
  return (
    <Pressable
      onPress={() => openPaywall('upgrade')}
      style={[styles.badge, { borderColor: trial ? colors.orange : colors.pink }]}
      accessibilityRole="button"
    >
      <Text style={styles.badgeText}>
        {trial
          ? `👑 Pro trial: ${access.trialDaysLeft} day${access.trialDaysLeft === 1 ? '' : 's'} left`
          : '👑 Go Pro: player stats, fair rotation & every pack'}
      </Text>
      <Text style={[styles.badgeText, { color: trial ? colors.orange : colors.pink }]}>
        {trial ? 'Keep it →' : 'See →'}
      </Text>
    </Pressable>
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
  hero: { alignItems: 'center', paddingVertical: 12 },
  logoEmoji: { fontSize: 52, transform: [{ rotate: '-20deg' }] },
  logo: { color: colors.pickle, fontSize: 58, fontWeight: '900', letterSpacing: 2 },
  tagline: { color: colors.muted, fontSize: 16, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  grid: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, paddingVertical: 14, paddingHorizontal: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  link: { color: colors.sky, fontSize: 14, fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  badgeText: { color: colors.text, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  how: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, gap: 6 },
  howTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
});
