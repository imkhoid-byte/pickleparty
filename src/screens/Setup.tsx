import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '../AppState';
import { Format, ScoringSystem, Team } from '../game/scoring';
import { goBack, startMatch } from '../navigation';
import { Button, Chip, Label, Screen } from '../ui/components';
import { colors, radius, teamColors } from '../ui/theme';

const TEAM_NAMES = [
  'Dink Floyd',
  'The Big Dills',
  'Kitchen Bandits',
  'Net Ninjas',
  'Paddle Daddies',
  'Lob Squad',
  'Brine Time',
  'Third Shot Drops',
  'Erne Your Keep',
  'Volley Llamas',
  'Pickle Rickers',
  'Dill With It',
  'Spice Girls',
  'Smash Brothers',
  'Kitchen Sink',
];

/** Wild mode is couples only, so teams get couple names. */
const COUPLE_NAMES = [
  'The Lovebirds',
  'Dill & Darling',
  'Sweet & Sour',
  'Power Couple',
  'Two Peas in a Pod',
  'Love All',
  'Kitchen Crushes',
  'The Newlyweds',
  'Dink & Dash',
  'Pickle Pair',
  'Soulmates Serve',
  'Mixed Doubles Trouble',
];

/** Used when the Halloween pack is in the deck. */
const SPOOKY_NAMES = [
  'The Dink Dead',
  'Boo Crew',
  'Ghouls Gone Wild',
  'Skeleton Crew',
  'Pumpkin Smashers',
  'Kitchen Creepers',
  'Night of the Living Dinks',
  'Hocus Paddle-us',
  'The Ghostbangers',
  'Bat Out of the Kitchen',
];

type NameStyle = 'teams' | 'couples' | 'spooky';

const randomName = (exclude: string, style: NameStyle = 'teams') => {
  const list = style === 'couples' ? COUPLE_NAMES : style === 'spooky' ? SPOOKY_NAMES : TEAM_NAMES;
  const pool = list.filter((n) => n !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
};

export function Setup() {
  const { settings, deck } = useApp();
  const couples = settings.spice === 'wild';
  // Couples mode wins; otherwise go spooky when the Halloween pack is in play.
  const style: NameStyle = couples ? 'couples' : deck.some((c) => c.pack === 'halloween') ? 'spooky' : 'teams';
  const [names, setNames] = useState<[string, string]>(() => {
    const a = randomName('', style);
    return [a, randomName(a, style)];
  });
  const [format, setFormat] = useState<Format>('doubles');
  const [scoring, setScoring] = useState<ScoringSystem>('sideout');
  const [target, setTarget] = useState(11);
  const [firstServer, setFirstServer] = useState<Team>(0);

  const setName = (team: Team, value: string) =>
    setNames((prev) => {
      const next = [...prev] as [string, string];
      next[team] = value;
      return next;
    });

  const start = () => {
    const teamNames = names.map((n, i) => n.trim() || `Team ${i + 1}`) as [string, string];
    startMatch({ format, scoring, target, teamNames }, firstServer);
  };

  return (
    <Screen title="New Match" onBack={goBack}>
      {([0, 1] as Team[]).map((t) => (
        <View key={t} style={{ gap: 6 }}>
          <Label>{couples ? 'Couple' : 'Team'} {t + 1}</Label>
          <View style={styles.nameRow}>
            <TextInput
              value={names[t]}
              onChangeText={(v) => setName(t, v)}
              maxLength={24}
              placeholder={`Team ${t + 1}`}
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: teamColors[t] }]}
            />
            <Button label="🎲" small variant="secondary" onPress={() => setName(t, randomName(names[1 - t], style))} />
          </View>
        </View>
      ))}

      <Label>Format</Label>
      <View style={styles.row}>
        <Chip label="Doubles" selected={format === 'doubles'} onPress={() => setFormat('doubles')} />
        <Chip label="Singles" selected={format === 'singles'} onPress={() => setFormat('singles')} />
      </View>

      <Label>Scoring</Label>
      <View style={styles.row}>
        <Chip label="Classic side-out" selected={scoring === 'sideout'} onPress={() => setScoring('sideout')} />
        <Chip label="Rally scoring" selected={scoring === 'rally'} onPress={() => setScoring('rally')} />
      </View>

      <Label>Play to</Label>
      <View style={styles.row}>
        {[7, 11, 15, 21].map((n) => (
          <Chip key={n} label={String(n)} selected={target === n} onPress={() => setTarget(n)} />
        ))}
      </View>
      <Text style={styles.hint}>Win by 2. Shut out the other team to PICKLE them. 🥒</Text>

      <Label>First serve</Label>
      <View style={styles.row}>
        {([0, 1] as Team[]).map((t) => (
          <Chip
            key={t}
            label={names[t] || `Team ${t + 1}`}
            color={teamColors[t]}
            selected={firstServer === t}
            onPress={() => setFirstServer(t)}
          />
        ))}
      </View>

      <Button label="Let's Dink 🥒" onPress={start} style={{ marginTop: 12 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  hint: { color: colors.muted, fontSize: 14 },
});
