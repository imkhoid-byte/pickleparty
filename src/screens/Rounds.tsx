import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

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
import { Button, Card, Label, Screen, Takeover, celebrate, tap } from '../ui/components';
import { alpha, colors, font, glow, gradients, radius, teamColors } from '../ui/theme';
import { Pop, usePressScale } from '../ui/motion';
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
    tap(true, Haptics.ImpactFeedbackStyle.Heavy);
    celebrate();
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


  return (
    <Screen title={`Round ${round}`} onBack={leave}>
      {/* Who's on court. */}
      <View style={styles.court}>
        {([kings, challengers] as const).map((pair, t) => (
          // A side pops when new players step onto it.
          <Pop key={t} trigger={pairName(pair)} style={{ flex: 1 }}>
            <View style={[styles.side, { borderColor: alpha(teamColors[t], 0.7), backgroundColor: alpha(teamColors[t], 0.07) }]}>
              <Text style={styles.sideTag}>{sideTag(t)}</Text>
              <Text style={[styles.sideNames, { color: teamColors[t] }]} numberOfLines={2}>
                {pairName(pair)}
              </Text>
            </View>
          </Pop>
        ))}
        <View style={styles.vs} pointerEvents="none">
          <Text style={styles.vsText}>VS</Text>
        </View>
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
            <ResultTile
              key={points.join('-')}
              score={`${Math.max(...points)}–${Math.min(...points)}`}
              name={pairName(kingsWon ? kings : challengers)}
              kings={kingsWon}
              onPress={() => enter(points)}
            />
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
              <BoardRow key={p.name} place={MEDALS[i]} name={p.name} stats={`${p.roundsWon} won · ${p.pointsWon} pts`} />
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
          confetti={drinkBreak.swept}
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
        <Takeover
          visible
          confetti
          emoji="👑"
          title={board[0]?.roundsWon ? `${board[0].name} rules the court` : 'Good night!'}
          onClose={() => setSummary(false)}
        >
          <View style={styles.board}>
            {board.map((p, i) => (
              <BoardRow
                key={p.name}
                place={MEDALS[i] ?? `${i + 1}.`}
                name={p.name}
                stats={`${p.roundsWon} won · ${p.pointsWon} pts · 🍺 ${p.sips}`}
              />
            ))}
          </View>
          <Button label="📣 Share the night" onPress={() => Share.share({ message: sessionRecap(session, APP_LINK, HASHTAG) }).catch(() => {})} />
          <Button label="Done" variant="secondary" onPress={done} />
        </Takeover>
      ) : null}
    </Screen>
  );
}

/** One way a round can end: the score, big, over who won it. Colored for that side. */
function ResultTile({ score, name, kings, onPress }: { score: string; name: string; kings: boolean; onPress: () => void }) {
  const press = usePressScale(0.94);
  const color = kings ? colors.pickle : colors.pink;
  return (
    <Animated.View style={[styles.resultWrap, glow(color), { transform: [{ scale: press.scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${score}`}
        style={styles.resultPress}
      >
        <LinearGradient colors={kings ? gradients.pickle : gradients.pink} style={styles.resultBtn}>
          <Text style={[styles.resultScore, !kings && { color: colors.text }]}>{score}</Text>
          <Text style={[styles.resultName, !kings && { color: colors.text }]} numberOfLines={2}>
            {name}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

/** A leaderboard line: place, name, and the numbers lined up on the right. */
function BoardRow({ place, name, stats }: { place: string; name: string; stats: string }) {
  return (
    <View style={styles.boardRow}>
      <Text style={styles.boardPlace}>{place}</Text>
      <Text style={styles.boardName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.boardStats}>{stats}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  court: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  side: {
    flex: 1,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 4,
    minHeight: 96,
    justifyContent: 'center',
  },
  sideTag: { color: colors.muted, fontSize: 12, fontFamily: font.semi, letterSpacing: 0.4 },
  sideNames: { fontSize: 21, fontFamily: font.bold, lineHeight: 25 },
  // The badge between the two sides.
  vs: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 36,
    height: 36,
    marginLeft: -18,
    marginTop: -18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
  },
  vsText: { color: colors.text, fontSize: 12, fontFamily: font.bold, letterSpacing: 0.5 },
  rule: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
  },
  courtRule: { borderLeftColor: colors.danger },
  ruleText: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  ruleLabel: { color: colors.orange, fontFamily: font.bold },
  how: { color: colors.text, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resultWrap: { width: '47%', flexGrow: 1, borderRadius: radius.md },
  resultPress: { borderRadius: radius.md, overflow: 'hidden' },
  resultBtn: { minHeight: 92, alignItems: 'center', justifyContent: 'center', padding: 10, gap: 2 },
  resultScore: { color: colors.onPickle, fontSize: 32, fontFamily: font.bold, lineHeight: 36, fontVariant: ['tabular-nums'] },
  resultName: { color: colors.onPickle, fontSize: 15, fontFamily: font.semi, textAlign: 'center', opacity: 0.85 },
  link: { color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  queue: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  queueChip: {
    backgroundColor: colors.surfaceHi,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  queueText: { color: colors.text, fontSize: 15, fontFamily: font.semi },
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
  board: { gap: 8, alignSelf: 'stretch' },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boardPlace: { width: 28, color: colors.muted, fontSize: 16, fontFamily: font.semi, textAlign: 'center' },
  boardName: { flex: 1, color: colors.text, fontSize: 17, fontFamily: font.semi },
  boardStats: { color: colors.muted, fontSize: 14, fontFamily: font.medium, fontVariant: ['tabular-nums'] },
});
