import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '../AppState';
import { announce, hush } from '../audio/announcer';
import { APP_LINK, HASHTAG } from '../config';
import { Card as PartyCard, drawCard } from '../game/cards';
import {
  MAX_REIGN,
  ROUND_POINTS,
  ROUND_SCORES,
  RoundScore,
  RoundsSession,
  addPlayer,
  breakText,
  pairName,
  recordRound,
  removeFromQueue,
  sessionRecap,
  tallies,
} from '../game/rounds';
import { renderPenalty } from '../game/spice';
import { usableAnnouncer } from '../monetization/entitlements';
import { ReplayPanel, okToLeave } from '../replay/ReplayPanel';
import { useReplay } from '../replay/useReplay';
import { ANNOUNCER_ART } from '../ui/announcerArt';
import { Button, Card, Label, Screen, Takeover, tap } from '../ui/components';
import { colors, radius, teamColors } from '../ui/theme';
import { useScreenAwake } from '../ui/useScreenAwake';

const MEDALS = ['🥇', '🥈', '🥉'];

/** The drinking game: King of the Court in 3-point rounds (see game/rounds.ts). */
export function Rounds() {
  const { rounds: session } = useApp();
  // Ended (or never started): back to setting one up.
  if (!session) return <Redirect href="/setup" />;
  return <RoundsGame session={session} />;
}

function RoundsGame({ session }: { session: RoundsSession }) {
  const { setRounds, settings, access, deck, courtRules } = useApp();
  useScreenAwake();
  const replay = useReplay();
  const voice = { sound: settings.sound, voice: settings.voice, announcer: usableAnnouncer(settings.announcer, access) };
  const speaker = settings.voice ? ANNOUNCER_ART[voice.announcer] : undefined;
  // Penalties on cards are drunk at the break, like everything else.
  const render = (text: string) => renderPenalty(text, 'tipsy');

  const [drinkBreak, setDrinkBreak] = useState<{ title: string; body: string; swept: boolean } | null>(null);
  /** The session before the last round, for Undo. */
  const [before, setBefore] = useState<RoundsSession | null>(null);
  // Chaos: a Court Rule every round. Party: a Party Card when someone asks for one.
  const [rule, setRule] = useState<PartyCard | null>(() => (settings.chaos ? drawCard(courtRules) : null));
  const [card, setCard] = useState<PartyCard | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [summary, setSummary] = useState(false);
  useEffect(() => hush, []);

  const [kings, challengers] = session.court;
  const nobodyWaits = session.queue.length === 0;
  const singles = kings.length === 1;
  /** What each side of the court is called: Kings and Challengers (singular in singles). */
  const sideTag = (t: number) => {
    if (nobodyWaits && !singles) return `Team ${t + 1}`;
    if (t === 1) return singles ? 'Challenger' : 'Challengers';
    const king = singles ? '👑 King' : '👑 Kings';
    return session.reign > 0 ? `${king} · ${session.reign} in a row` : king;
  };
  const round = session.rounds.length + 1;
  const overlay = useMemo(
    () => ({
      names: [pairName(kings), pairName(challengers)] as [string, string],
      colors: [teamColors[0], teamColors[1]] as [string, string],
      label: `ROUND ${round}`,
    }),
    [kings, challengers, round],
  );
  const board = tallies(session);
  const thirstiest = [...board].sort((a, b) => b.sips - a.sips)[0];

  const enter = (points: RoundScore) => {
    const { session: next, result } = recordRound(session, points);
    setBefore(session);
    setRounds(next);
    setCard(null);
    const text = breakText(result);
    setDrinkBreak(text);
    tap(settings.haptics);
    announce(
      { emoji: text.swept ? '🥒' : '🍻', title: text.title, body: text.body, big: true, sound: text.swept ? 'airhorn' : 'kazoo' },
      voice,
    );
    if (text.swept && replay.on) replay.clip('🥒 SWEPT 3–0');
  };
  const nextRound = () => {
    setDrinkBreak(null);
    if (settings.chaos) setRule(drawCard(courtRules, rule ? [rule.id] : []));
  };
  const undoRound = () => {
    if (!before) return;
    setRounds(before);
    setBefore(null);
    setDrinkBreak(null);
    hush();
  };
  const drawPartyCard = () => {
    setCard(drawCard(deck.filter((c) => c.kind !== 'court'), card ? [card.id] : []));
    setDrinkBreak(null);
  };
  const add = () => {
    if (!draft.trim()) return;
    setRounds(addPlayer(session, draft));
    setDraft('');
  };
  const leave = () => okToLeave(replay) && router.replace('/');
  const endNight = () => {
    setConfirmEnd(false);
    setSummary(true);
  };
  const done = () => {
    router.replace('/');
    setRounds(null);
  };

  /** "Ana & Ben 2–1": a result button, colored for the side that won it. */
  const resultLabel = ([k, c]: RoundScore) => `${pairName(k > c ? kings : challengers)}\n${Math.max(k, c)}–${Math.min(k, c)}`;

  return (
    <Screen title={`Round ${round}`} onBack={leave}>
      {/* Who's on court. */}
      <View style={styles.court}>
        {([kings, challengers] as const).map((pair, t) => (
          <View key={t} style={[styles.side, { borderColor: teamColors[t] }]}>
            <Text style={styles.sideTag}>
              {sideTag(t)}
            </Text>
            <Text style={[styles.sideNames, { color: teamColors[t] }]} numberOfLines={2}>
              {pairName(pair)}
            </Text>
          </View>
        ))}
      </View>

      {rule && (
        <Pressable onPress={() => setRule(drawCard(courtRules, [rule.id]))} style={[styles.rule, styles.courtRule]} accessibilityHint="Draw a different Court Rule">
          <Text style={styles.ruleText}>
            🌀 <Text style={styles.ruleLabel}>Court Rule: </Text>
            {render(rule.text)}
          </Text>
        </Pressable>
      )}
      {card && (
        <View style={styles.rule}>
          <Text style={styles.ruleText}>
            🃏 <Text style={styles.ruleLabel}>This round: </Text>
            {render(card.text)}
          </Text>
        </View>
      )}

      <Text style={styles.how}>
        Play {ROUND_POINTS} points (every rally scores), then tap how it went. A sip for every point your side loses.
      </Text>
      <View style={styles.results}>
        {ROUND_SCORES.map((points) => {
          const kingsWon = points[0] > points[1];
          return (
            <Pressable
              key={points.join('-')}
              onPress={() => enter(points)}
              style={[styles.resultBtn, { backgroundColor: kingsWon ? colors.pickle : colors.pink }]}
              accessibilityRole="button"
            >
              <Text style={styles.resultText} numberOfLines={3}>
                {resultLabel(points)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {before && !drinkBreak && (
        <Text style={styles.link} onPress={undoRound} accessibilityRole="button">
          ↶ Undo round {before.rounds.length + 1}
        </Text>
      )}

      <ReplayPanel replay={replay} overlay={overlay} />

      <Label>Up next</Label>
      <Card style={{ gap: 10 }}>
        {nobodyWaits ? (
          <Text style={styles.muted}>
            {singles
              ? 'Nobody waiting: the two of you play on. Add people and the loser rotates off.'
              : 'Nobody waiting: partners switch every round. Add people to start rotating.'}
          </Text>
        ) : (
          <View style={styles.queue}>
            {session.queue.map((name, i) => (
              <Pressable
                key={name}
                onPress={() => setRounds(removeFromQueue(session, name))}
                style={styles.queueChip}
                accessibilityRole="button"
                accessibilityHint={`Take ${name} out of the line`}
              >
                <Text style={styles.queueText}>
                  {i + 1}. {name} ✕
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            placeholder="Someone new? Add them"
            placeholderTextColor={colors.muted}
            maxLength={20}
            style={styles.input}
          />
          <Button label="Add" small onPress={add} disabled={!draft.trim()} />
        </View>
        <Text style={styles.muted}>
          {singles ? 'The loser rotates off; the winner stays' : 'Losers rotate off; winners stay'} on for up to {MAX_REIGN} rounds in a
          row. Tap a name to take them out of the line.
        </Text>
      </Card>

      {session.rounds.length > 0 && (
        <>
          <Label>Tonight</Label>
          <Card style={{ gap: 6 }}>
            {board.slice(0, 3).map((p, i) => (
              <Text key={p.name} style={styles.boardRow}>
                {MEDALS[i]} {p.name}: {p.roundsWon} won · {p.pointsWon} pts
              </Text>
            ))}
            {thirstiest && thirstiest.sips > 0 && (
              <Text style={styles.muted}>
                🍺 Thirstiest: {thirstiest.name} ({thirstiest.sips} sips)
              </Text>
            )}
          </Card>
        </>
      )}
      <Button label="🏁 End the night" variant="ghost" onPress={() => setConfirmEnd(true)} />

      {drinkBreak ? (
        <Takeover
          visible
          emoji={drinkBreak.swept ? '🥒' : '🍻'}
          title={drinkBreak.title}
          body={drinkBreak.body}
          accent={drinkBreak.swept ? colors.orange : colors.pickle}
          speaker={speaker}
          onClose={nextRound}
        >
          <Button label={`▶ Round ${round}`} onPress={nextRound} />
          {!settings.calm && !settings.chaos && (
            <Button label="🃏 Party Card for the next round" variant="pink" onPress={drawPartyCard} />
          )}
          <Button label="↶ Undo that round" variant="ghost" small onPress={undoRound} />
        </Takeover>
      ) : confirmEnd ? (
        <Takeover visible emoji="🏁" title="End the night?" body="You'll see who ruled the court, then start fresh next time." onClose={() => setConfirmEnd(false)}>
          <Button label="End it" onPress={endNight} />
          <Button label="Keep playing" variant="ghost" onPress={() => setConfirmEnd(false)} />
        </Takeover>
      ) : summary ? (
        <Takeover visible emoji="👑" title={board[0]?.roundsWon ? `${board[0].name} rules the court` : 'Good night!'} onClose={() => setSummary(false)}>
          <View style={{ gap: 6, alignSelf: 'stretch' }}>
            {board.map((p, i) => (
              <Text key={p.name} style={styles.boardRow}>
                {MEDALS[i] ?? `${i + 1}.`} {p.name}: {p.roundsWon} won · {p.pointsWon} pts · 🍺 {p.sips}
              </Text>
            ))}
          </View>
          <Button label="📣 Share the night" onPress={() => Share.share({ message: sessionRecap(session, APP_LINK, HASHTAG) }).catch(() => {})} />
          <Button label="Done" variant="secondary" onPress={done} />
        </Takeover>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  court: { flexDirection: 'row', gap: 10 },
  side: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 2,
    backgroundColor: colors.surface,
    gap: 4,
    minHeight: 92,
  },
  sideTag: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  sideNames: { fontSize: 20, fontWeight: '900' },
  rule: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, borderLeftWidth: 4, borderLeftColor: colors.orange },
  courtRule: { borderLeftColor: colors.danger },
  ruleText: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  ruleLabel: { color: colors.orange, fontWeight: '900' },
  how: { color: colors.text, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resultBtn: {
    width: '48%',
    flexGrow: 1,
    minHeight: 76,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  resultText: { color: colors.bg, fontSize: 17, fontWeight: '900', textAlign: 'center', lineHeight: 22 },
  link: { color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  queue: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  queueChip: { backgroundColor: colors.surfaceHi, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 12 },
  queueText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    // Lets the box shrink so Add fits beside it (browsers give inputs a minimum width).
    minWidth: 0,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  boardRow: { color: colors.text, fontSize: 16, fontWeight: '800' },
});
