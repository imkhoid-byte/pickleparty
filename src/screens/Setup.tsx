import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '../AppState';
import { Format, PARTY_TARGET, ScoringSystem, Team } from '../game/scoring';
import { isAlcoholic } from '../game/spice';
import { goBack, startMatch } from '../navigation';
import { replaySupported } from '../replay/useReplay';
import { Button, Chip, Label, Screen, Takeover } from '../ui/components';
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

/** Shown the first time someone sets up a match (and again from "How does it work?"). */
const REPLAY_STEP = {
  emoji: '🎬',
  title: 'Catch the highlights',
  body: 'Tap ● Film it beside the score and point the phone at the court (or prop it up). Aces, highlight shots and the winning point save themselves as clips with the score on them. Tap the little camera to save any other great point.',
};

const HOW_IT_WORKS = [
  {
    emoji: '📱',
    title: 'Pick a Hype Man',
    body: 'Someone sitting out, or the closest player, runs the phone. Got a Bluetooth speaker? Connect it so the whole court hears the announcer.',
  },
  {
    emoji: '👆',
    title: 'Tap who won each rally',
    body: 'The app keeps score, calls it out loud and tracks who serves from which side. Mis-tap? Hit Undo. A Bluetooth page-turner clicker works too: left button for the top team, right for the bottom.',
  },
  {
    emoji: '🎉',
    title: 'Let the party happen',
    body: 'Prompts pop up and close on their own. Tap a moment (net ball, ace…) when it happens, and draw a Party Card whenever the vibe dips.',
  },
];

type PartyStyle = 'calm' | 'party' | 'chaos';
const PARTY_STYLES: { id: PartyStyle; label: string; hint: string }[] = [
  {
    id: 'calm',
    label: '😌 Calm',
    hint: 'Only the big moments interrupt: Pickle Watch, game point and the win. Best when nobody is near the phone.',
  },
  {
    id: 'party',
    label: '🎉 Party',
    hint: 'Side-outs, hot streaks and ties all get called out. Best with a Hype Man on the phone.',
  },
  {
    id: 'chaos',
    label: '🌀 Chaos',
    hint: 'The full party, plus a new Court Rule every 3 points: hands only, hold hands, silent rallies… Break it and the other team wins the rally (tap 🚫 Rule broken).',
  },
];

const randomName = (exclude: string, style: NameStyle = 'teams') => {
  const list = style === 'couples' ? COUPLE_NAMES : style === 'spooky' ? SPOOKY_NAMES : TEAM_NAMES;
  const pool = list.filter((n) => n !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
};

export function Setup() {
  const { settings, updateSettings, deck } = useApp();
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
  // Party Rules: quick rally games to 7 with the Bar Tab (instead of a classic game).
  const [party, setParty] = useState(false);
  const [firstServer, setFirstServer] = useState<Team>(0);
  const [howTo, setHowTo] = useState<number | null>(() => (settings.seenHowTo ? null : 0));
  // Instant Replay works where the browser can film (the web version for now).
  const [canFilm] = useState(replaySupported);
  const steps = canFilm ? [...HOW_IT_WORKS, REPLAY_STEP] : HOW_IT_WORKS;
  const partyStyle: PartyStyle = settings.chaos ? 'chaos' : settings.calm ? 'calm' : 'party';
  const pickScoring = (next: ScoringSystem) => {
    setParty(false);
    setScoring(next);
    // Rally scoring to 11 is over in about 7 minutes, so it starts at 15 (still changeable).
    if (next === 'rally' && target === 11) setTarget(15);
    if (next === 'sideout' && target === 15) setTarget(11);
  };
  const closeHowTo = () => {
    setHowTo(null);
    if (!settings.seenHowTo) updateSettings({ seenHowTo: true });
  };

  const setName = (team: Team, value: string) =>
    setNames((prev) => {
      const next = [...prev] as [string, string];
      next[team] = value;
      return next;
    });

  const start = () => {
    const teamNames = names.map((n, i) => n.trim() || `Team ${i + 1}`) as [string, string];
    startMatch(
      party
        ? { format, scoring: 'rally', target: PARTY_TARGET, teamNames, partyRules: true }
        : { format, scoring, target, teamNames },
      firstServer,
    );
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
        <Chip label="🍻 Party Rules" selected={party} color={colors.orange} onPress={() => setParty(true)} />
        <Chip label="Classic side-out" selected={!party && scoring === 'sideout'} onPress={() => pickScoring('sideout')} />
        <Chip label="Rally scoring" selected={!party && scoring === 'rally'} onPress={() => pickScoring('rally')} />
      </View>
      {party && (
        <Text style={styles.hint}>
          {isAlcoholic(settings.spice)
            ? 'Quick games: every rally scores, first to 7 (at 6–6, next point wins). Penalties go on each team’s Bar Tab instead of being drunk mid-game. At 4, switch ends and pay up at the bench. At the end, the losers settle up and rotate off; the winners stay on.'
            : 'Quick games: every rally scores, first to 7 (at 6–6, next point wins). Switch ends at 4. The losers rotate off; the winners stay on.'}
        </Text>
      )}

      {/* Party Rules games are always to 7. */}
      {!party && (
        <>
          <Label>Play to</Label>
          <View style={styles.row}>
            {[7, 11, 15, 21].map((n) => (
              <Chip key={n} label={String(n)} selected={target === n} onPress={() => setTarget(n)} />
            ))}
          </View>
          <Text style={styles.hint}>
            {scoring === 'rally' ? 'Every rally scores, so games go about twice as fast. ' : ''}Win by 2. Shut out the
            other team to PICKLE them. 🥒
          </Text>
        </>
      )}

      <Label>Party style</Label>
      <View style={styles.row}>
        {PARTY_STYLES.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            selected={partyStyle === p.id}
            color={p.id === 'chaos' ? colors.danger : colors.pickle}
            onPress={() => updateSettings({ calm: p.id === 'calm', chaos: p.id === 'chaos' })}
          />
        ))}
      </View>
      <Text style={styles.hint}>{PARTY_STYLES.find((p) => p.id === partyStyle)?.hint}</Text>

      {canFilm && (
        <>
          <Label>Highlights</Label>
          <View style={styles.row}>
            <Chip
              label="🎬 Film the best points"
              selected={settings.filmHighlights}
              color={colors.danger}
              onPress={() => updateSettings({ filmHighlights: true })}
            />
            <Chip label="No camera" selected={!settings.filmHighlights} onPress={() => updateSettings({ filmHighlights: false })} />
          </View>
          <Text style={styles.hint}>
            {settings.filmHighlights
              ? 'The camera starts with the game. Point the phone at the court or prop it up: aces, highlight shots and the winning point save themselves as clips to share.'
              : 'Turn it on to film the game: big plays save themselves as clips, with the score on them.'}
          </Text>
        </>
      )}

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
      <Text style={styles.link} onPress={() => setHowTo(0)} accessibilityRole="button">
        How does it work?
      </Text>

      {howTo !== null && (
        <Takeover
          visible
          emoji={steps[howTo].emoji}
          title={steps[howTo].title}
          body={steps[howTo].body}
          footnote={`${howTo + 1} of ${steps.length}`}
          onClose={closeHowTo}
        >
          {howTo < steps.length - 1 ? (
            <>
              <Button label="Next" onPress={() => setHowTo(howTo + 1)} />
              <Button label="Skip" variant="ghost" onPress={closeHowTo} />
            </>
          ) : (
            <Button label="Got it, let's play" onPress={closeHowTo} />
          )}
        </Takeover>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    // Lets the box shrink so the 🎲 button fits beside it (browsers give inputs a minimum width).
    minWidth: 0,
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
  link: { color: colors.sky, fontSize: 15, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
});
