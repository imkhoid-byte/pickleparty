import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { previewAnnouncer } from '../audio/announcer';
import { ANNOUNCERS } from '../audio/personas';
import { SPICES, isAlcoholic } from '../game/spice';
import { leaderboard } from '../game/stats';
import { autoPaywall } from '../monetization/entitlements';
import { openPaywall } from '../navigation';
import { Button, Chip, Label, Screen, Takeover } from '../ui/components';
import { colors, radius } from '../ui/theme';

export function Home() {
  const { settings, updateSettings, history, access } = useApp();
  const [askWild, setAskWild] = useState(false);
  const champ = leaderboard(history)[0];
  const pickles = history.filter((g) => g.pickled).length;

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
        <Text style={styles.tagline}>Keep score. Cause chaos. Don&apos;t get pickled.</Text>
      </View>

      <ProBadge />

      <Button label="🏓  Start a Match" onPress={() => router.push('/setup')} />
      <Button label="🃏  Draw a Party Card" variant="pink" onPress={() => router.push('/deck')} />
      <View style={styles.grid}>
        <Button label="🏆 Stats" variant="secondary" style={styles.cell} onPress={() => router.push('/stats')} />
        <Button
          label="🏟️ Round Robin"
          variant="secondary"
          style={styles.cell}
          onPress={() => (access.isPro ? router.push('/roundrobin') : openPaywall('roundRobin'))}
        />
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
            onPress={() => (s.id === 'wild' && settings.spice !== 'wild' ? setAskWild(true) : updateSettings({ spice: s.id }))}
          />
        ))}
      </View>
      <Text style={styles.muted}>{SPICES.find((s) => s.id === settings.spice)?.blurb}</Text>
      <Label>Announcer</Label>
      <View style={styles.row}>
        <Chip label="🔊 Sound effects" selected={settings.sound} onPress={() => updateSettings({ sound: !settings.sound })} />
        <Chip label="🗣️ Voice" selected={settings.voice} onPress={() => updateSettings({ voice: !settings.voice })} />
      </View>
      {settings.voice && (
        <View style={styles.row}>
          {ANNOUNCERS.map((a) => (
            <Chip
              key={a.id}
              label={`${a.emoji} ${a.label}`}
              selected={settings.announcer === a.id}
              color={colors.sky}
              onPress={() => {
                updateSettings({ announcer: a.id });
                previewAnnouncer(a.id, settings.sound);
              }}
            />
          ))}
        </View>
      )}
      <Text style={styles.muted}>
        {settings.voice
          ? `${ANNOUNCERS.find((a) => a.id === settings.announcer)?.blurb ?? ''} Calls out penalties by team name. Tap one to hear it.`
          : 'Calls out penalties by team name, so nobody has to check the phone.'}
      </Text>
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
      <Takeover
        visible={askWild}
        emoji="🔥"
        title="Wild is for couples"
        body="Each team is a couple. Every penalty is a drink plus a flirty act with your own partner, never anyone else. Anyone can skip an act, no questions asked. Is everyone playing on board?"
        accent={colors.orange}
        onClose={() => setAskWild(false)}
      >
        <Button
          label="We're all in 🔥"
          variant="pink"
          onPress={() => {
            updateSettings({ spice: 'wild' });
            setAskWild(false);
          }}
        />
        <Button label="Keep it Tipsy" variant="ghost" onPress={() => setAskWild(false)} />
      </Takeover>
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
          : '👑 Go Pro: crew stats, round robins & every pack'}
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
  hero: { alignItems: 'center', paddingVertical: 16 },
  logoEmoji: { fontSize: 56, transform: [{ rotate: '-20deg' }] },
  logo: { color: colors.pickle, fontSize: 60, fontWeight: '900', letterSpacing: 2 },
  tagline: { color: colors.muted, fontSize: 16, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flexBasis: '46%', flexGrow: 1, paddingVertical: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muted: { color: colors.muted, fontSize: 14 },
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
});
