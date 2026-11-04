import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '../AppState';
import { cleanNames, startSession } from '../game/rounds';
import { Team } from '../game/scoring';
import { isAlcoholic } from '../game/spice';
import { goBack, openRounds, startGame } from '../navigation';
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

/** Shown the first time someone sets up a game (and again from "How does it work?"). */
const HOW_IT_WORKS = [
  {
    emoji: '🏓',
    title: 'Just play',
    body: 'No tapping every point. In a regular game you enter the final score when it’s over. In the drinking game you tap how it went every 3 points.',
  },
  {
    emoji: '💪',
    title: 'Regular game: losers work out',
    body: 'Enter the final score and the losers get a workout: squats, push-ups, a plank… The bigger the loss, the more reps. Get pickled (shut out) and it’s the most.',
  },
];

/** The drinking game, for players who said they're 21+. */
const DRINKING_STEP = {
  emoji: '🍻',
  title: 'Drinking game: 3 points, then drink',
  body: 'King of the Court. Play 3 points, tap the result, and everyone drinks a sip for every point their side lost. The losers rotate off and the next two come on; the winners stay (for up to 3 rounds in a row).',
};

const REPLAY_STEP = {
  emoji: '🎬',
  title: 'Catch the highlights',
  body: 'Tap ● Film it and point the phone at the court (or prop it up). Tap the picture right after a great point to save the last 30 seconds, ready to share.',
};

type Mode = 'game' | 'drink';

type PartyStyle = 'calm' | 'party' | 'chaos';
const PARTY_STYLES: { id: PartyStyle; label: string; hint: string }[] = [
  { id: 'calm', label: '😌 Calm', hint: 'Just the rounds and the drinks.' },
  { id: 'party', label: '🎉 Party', hint: 'At any break, draw a Party Card for the next round.' },
  {
    id: 'chaos',
    label: '🌀 Chaos',
    hint: 'A new Court Rule every round: hands only, hold hands, silent rallies… Break it and you lose the point.',
  },
];

const randomName = (exclude: string, style: NameStyle = 'teams') => {
  const list = style === 'couples' ? COUPLE_NAMES : style === 'spooky' ? SPOOKY_NAMES : TEAM_NAMES;
  const pool = list.filter((n) => n !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
};

export function Setup() {
  const { settings, updateSettings, deck, rounds, setRounds } = useApp();
  // The drinking game is only for players who said they're 21+.
  const canDrink = settings.ageConfirmed;
  const [mode, setMode] = useState<Mode>(() => (canDrink && isAlcoholic(settings.spice) ? 'drink' : 'game'));
  const style: NameStyle = settings.spice === 'wild' ? 'couples' : deck.some((c) => c.pack === 'halloween') ? 'spooky' : 'teams';
  const [names, setNames] = useState<[string, string]>(() => {
    const a = randomName('', style);
    return [a, randomName(a, style)];
  });
  const [target, setTarget] = useState(11);
  // The drinking game's players: last time's crew to start with.
  const [players, setPlayers] = useState<string[]>(() => settings.lastPlayers);
  const [draft, setDraft] = useState('');
  const [howTo, setHowTo] = useState<number | null>(() => (settings.seenHowTo ? null : 0));
  // Instant Replay works where the browser can film (the web version for now).
  const [canFilm] = useState(replaySupported);
  const steps = [...HOW_IT_WORKS, ...(canDrink ? [DRINKING_STEP] : []), ...(canFilm ? [REPLAY_STEP] : [])];
  const partyStyle: PartyStyle = settings.chaos ? 'chaos' : settings.calm ? 'calm' : 'party';
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
  const addPlayers = () => {
    // "Ana, Ben, Cal" adds three at once.
    setPlayers((prev) => cleanNames([...prev, ...draft.split(',')]));
    setDraft('');
  };
  const ready = cleanNames(players);

  const startRegular = () => startGame(names.map((n, i) => n.trim() || `Team ${i + 1}`) as [string, string], target);
  const startDrinking = () => {
    if (ready.length < 4) return;
    updateSettings({ lastPlayers: ready });
    setRounds(startSession(ready));
    openRounds(true);
  };

  return (
    <Screen title="New Game" onBack={goBack}>
      {rounds && (
        <Pressable onPress={() => openRounds(true)} style={styles.resume} accessibilityRole="button">
          <Text style={styles.resumeText}>🍻 Round {rounds.rounds.length + 1} is in progress: tap to go back to it</Text>
        </Pressable>
      )}
      {canDrink && (
        <View style={styles.modes}>
          {(
            [
              ['game', '🏓', 'Regular game', 'Enter the final score. Losers work out.'],
              ['drink', '🍻', 'Drinking game', '3 points, drink, rotate. King of the Court.'],
            ] as const
          ).map(([id, emoji, title, blurb]) => (
            <Pressable
              key={id}
              onPress={() => setMode(id)}
              style={[styles.mode, mode === id && styles.modeOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === id }}
            >
              <Text style={styles.modeEmoji}>{emoji}</Text>
              <Text style={[styles.modeTitle, mode === id && { color: colors.pickle }]}>{title}</Text>
              <Text style={styles.modeBlurb}>{blurb}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {mode === 'game' ? (
        <>
          {([0, 1] as Team[]).map((t) => (
            <View key={t} style={{ gap: 6 }}>
              <Label>Team {t + 1}</Label>
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
          <Label>Play to</Label>
          <View style={styles.row}>
            {[7, 11, 15, 21].map((n) => (
              <Chip key={n} label={String(n)} selected={target === n} onPress={() => setTarget(n)} />
            ))}
          </View>
          <Text style={styles.hint}>
            Keep score yourselves; enter the final score when it&apos;s over. The bigger the loss, the bigger the workout. 💪
          </Text>
        </>
      ) : (
        <>
          <Label>Players ({ready.length})</Label>
          <View style={styles.row}>
            {ready.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPlayers((prev) => prev.filter((x) => x !== p))}
                style={styles.player}
                accessibilityRole="button"
                accessibilityHint={`Remove ${p}`}
              >
                <Text style={styles.playerText}>{p} ✕</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.nameRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={addPlayers}
              maxLength={60}
              placeholder="Add a name (or several: Ana, Ben)"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.playerInput]}
            />
            <Button label="Add" small onPress={addPlayers} disabled={!draft.trim()} />
          </View>
          <Text style={styles.hint}>
            {ready.length < 4
              ? `Add at least 4 players (${4 - ready.length} more).`
              : ready.length === 4
                ? 'Four players: partners switch every round. Add more and the losers rotate off.'
                : `${ready.length - 4} waiting at a time: the losers rotate off and the next two come on.`}
          </Text>

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
        </>
      )}

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
              ? 'The camera starts with the game. Point the phone at the court or prop it up, and tap the picture after a great point.'
              : 'Turn it on to film the game and save great points as clips to share.'}
          </Text>
        </>
      )}

      {mode === 'game' ? (
        <Button label="Let's Dink 🥒" onPress={startRegular} style={{ marginTop: 12 }} />
      ) : (
        <Button label="Start King of the Court 🍻" onPress={startDrinking} disabled={ready.length < 4} style={{ marginTop: 12 }} />
      )}
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
  modes: { flexDirection: 'row', gap: 10 },
  mode: {
    flex: 1,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.surfaceHi,
    backgroundColor: colors.surface,
    gap: 4,
  },
  modeOn: { borderColor: colors.pickle },
  modeEmoji: { fontSize: 30 },
  modeTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  modeBlurb: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  player: { backgroundColor: colors.surfaceHi, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  playerText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  playerInput: { fontSize: 17, borderColor: colors.surfaceHi },
  resume: { backgroundColor: colors.orange, borderRadius: radius.md, padding: 14 },
  resumeText: { color: colors.bg, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  link: { color: colors.sky, fontSize: 15, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
});
