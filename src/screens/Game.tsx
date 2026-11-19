import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useApp } from '../AppState';
import { announce, hush, playSound } from '../audio/announcer';
import { APP_LINK, HASHTAG } from '../config';
import { spinLosersWheel, winsTitle } from '../game/party';
import { Team, other } from '../game/scoring';
import { scoreProblem, workoutFor } from '../game/workout';
import { usableAnnouncer } from '../monetization/entitlements';
import { goBack, openPaywall } from '../navigation';
import { ReplayPanel, okToLeave } from '../replay/ReplayPanel';
import { ClipStrip } from '../replay/ReplayViews';
import { useReplay } from '../replay/useReplay';
import { shareImage } from '../shareImage';
import { Button, Card, Label, Screen, Takeover, celebrate, click, tap } from '../ui/components';
import { LosersWheel } from '../ui/LosersWheel';
import { FinalScore, ResultCard } from '../ui/ResultCard';
import { alpha, colors, font, radius, teamColors } from '../ui/theme';
import { Appear, Confetti, Pop, PopIn } from '../ui/motion';
import { useScreenAwake } from '../ui/useScreenAwake';

export function shareText(r: FinalScore): string {
  const [winner, loser] = [r.teamNames[r.winner], r.teamNames[other(r.winner)]];
  const score = `${r.scores[r.winner]}-${r.scores[other(r.winner)]}`;
  const brag = r.scores[other(r.winner)] === 0 ? ' 🥒 PICKLED!' : '';
  return `${winner} beat ${loser} ${score}${brag}\nScored on PickleParty ${HASHTAG}\n${APP_LINK}`;
}

/**
 * A regular game: no tapping every point. Play it out, enter the final score, and
 * the losers work it off (the bigger the loss, the more reps).
 */
export function Game({ teamNames, target }: { teamNames: [string, string]; target: number }) {
  const { settings, access, recordGame } = useApp();
  useScreenAwake();
  const replay = useReplay();
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [result, setResult] = useState<FinalScore | null>(null);
  const [workout, setWorkout] = useState('');
  const [wheel, setWheel] = useState<{ options: string[]; landed: number } | null>(null);
  const [wheelDone, setWheelDone] = useState(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<{ key: string; uri: string } | null>(null);
  const cardRef = useRef<View>(null);
  const voice = { sound: settings.sound, voice: settings.voice, announcer: usableAnnouncer(settings.announcer, access) };
  const overlay = useMemo(
    () => ({ names: teamNames, colors: [teamColors[0], teamColors[1]] as [string, string], label: `GAME TO ${target}` }),
    [teamNames, target],
  );
  // Stop talking when leaving.
  useEffect(() => hush, []);

  const back = () => okToLeave(replay) && goBack();
  const problem = scoreProblem(scores);
  const bump = (t: Team, by: number) => {
    tap();
    click();
    setScores((s) => {
      const next = [...s] as [number, number];
      next[t] = Math.max(0, Math.min(99, next[t] + by));
      return next;
    });
  };
  /** "They won": the winner's score is at least the target. */
  const won = (t: Team) => {
    tap();
    click();
    setScores((s) => {
      const next = [...s] as [number, number];
      next[t] = Math.max(target, next[other(t)] + 2);
      return next;
    });
  };

  const submit = () => {
    if (problem) return;
    const winner: Team = scores[0] > scores[1] ? 0 : 1;
    const loser = other(winner);
    const r: FinalScore = { teamNames, scores, winner, target };
    const w = workoutFor(scores);
    const pickled = scores[loser] === 0;
    const line = `${teamNames[loser]}: ${w.text} each${pickled ? ', then a lap of shame' : ''}. ${teamNames[winner]}, count them out loud.`;
    setResult(r);
    setWorkout(line);
    setWheelResult(null);
    celebrate();
    recordGame({
      id: `${Date.now()}`,
      date: Date.now(),
      teamNames,
      scores,
      winner,
      pickled,
      rallies: 0,
    });
    announce(
      {
        emoji: pickled ? '🥒' : '🏆',
        title: pickled ? 'PICKLED!' : winsTitle(teamNames[winner]),
        body: `${teamNames[winner]} win ${scores[winner]} to ${scores[loser]}. Workout time! ${line}`,
        sound: pickled ? 'airhorn' : 'kazoo',
      },
      voice,
    );
  };

  const spinWheel = () => {
    if (!result) return;
    setWheelDone(false);
    // No drinking in a regular game: the wheel's penalties are workouts too.
    setWheel(spinLosersWheel(teamNames[other(result.winner)], teamNames[result.winner], 'chill'));
    if (settings.sound) playSound('drumroll');
  };
  const onWheelDone = () => {
    if (!wheel) return;
    const landed = wheel.options[wheel.landed];
    setWheelDone(true);
    setWheelResult(landed);
    announce({ emoji: '🎡', title: "Loser's Wheel", body: landed, sound: 'kazoo' }, voice);
  };

  const rematch = () => {
    setResult(null);
    setScores([0, 0]);
    setResultImage(null);
  };

  // Capture the result card for sharing as an image once it's on screen.
  const imageKey = result ? result.scores.join('-') : '';
  useEffect(() => {
    if (!result || resultImage?.key === imageKey) return;
    const timer = setTimeout(() => {
      if (!cardRef.current) return;
      captureRef(cardRef, { format: 'png', quality: 1, result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile' })
        .then((uri) => setResultImage({ key: imageKey, uri }))
        .catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [result, imageKey, resultImage]);

  if (result) {
    return (
      <Screen title="Final score" onBack={back}>
        <Confetti />
        {/* The card lands with a bounce; the workout follows. */}
        <PopIn>
          <ResultCard ref={cardRef} result={result} />
        </PopIn>
        <Appear delay={250}>
        <Card style={styles.workout}>
          <Text style={styles.workoutTitle}>💪 Workout time</Text>
          <Text style={styles.workoutText}>{workout}</Text>
          {wheelResult && <Text style={styles.wheelResult}>🎡 {wheelResult}</Text>}
        </Card>
        </Appear>
        <Button
          label="📣 Share the result"
          onPress={() => shareImage(resultImage?.key === imageKey ? resultImage.uri : null, shareText(result))}
        />
        {!wheelResult && <Button label="🎡 Spin the Loser's Wheel" variant="pink" onPress={spinWheel} />}
        <ClipStrip clips={replay.clips} saving={replay.saving} />
        <Button label="🔁 Rematch" variant="secondary" onPress={rematch} />
        <View style={styles.row}>
          <Button
            label={access.isPro ? '📊 Crew stats' : '👑 Crew stats'}
            variant="ghost"
            small
            style={{ flex: 1 }}
            onPress={() => (access.isPro ? router.push('/stats') : openPaywall('crewStats'))}
          />
          <Button label="Home" variant="ghost" small style={{ flex: 1 }} onPress={back} />
        </View>
        {wheel && (
          <Takeover
            visible
            accent={colors.orange}
            hero={<LosersWheel key={wheel.options.join('|')} options={wheel.options} landed={wheel.landed} onDone={onWheelDone} />}
            onClose={() => wheelDone && setWheel(null)}
          >
            {wheelDone ? <Button label="Back to the results" onPress={() => setWheel(null)} /> : <></>}
          </Takeover>
        )}
      </Screen>
    );
  }

  return (
    <Screen title="Game on" onBack={back}>
      <View style={styles.matchup}>
        <Text style={[styles.matchName, { color: teamColors[0] }]} numberOfLines={2}>
          {teamNames[0]}
        </Text>
        <View style={styles.vsBadge}>
          <Text style={styles.vs}>VS</Text>
        </View>
        <Text style={[styles.matchName, { color: teamColors[1] }]} numberOfLines={2}>
          {teamNames[1]}
        </Text>
        <Text style={styles.matchMeta}>Game to {target} · win by 2</Text>
      </View>
      <Text style={styles.intro}>
        Go play! No need to touch the phone until it&apos;s over. Then enter the final score and the losers work it off.
      </Text>

      <ReplayPanel replay={replay} overlay={overlay} />

      <Label>Final score</Label>
      {([0, 1] as Team[]).map((t) => (
        <View key={t} style={[styles.scoreRow, { borderColor: alpha(teamColors[t], 0.7), backgroundColor: alpha(teamColors[t], 0.06) }]}>
          <Pressable onPress={() => won(t)} style={{ flex: 1 }} accessibilityRole="button" accessibilityHint="Mark this team as the winner">
            <Text style={[styles.scoreName, { color: teamColors[t] }]} numberOfLines={2}>
              {teamNames[t]}
            </Text>
            <Text style={styles.wonHint}>tap if they won</Text>
          </Pressable>
          <Pressable onPress={() => bump(t, -1)} style={styles.step} accessibilityRole="button" accessibilityLabel={`${teamNames[t]} minus one`}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Pop trigger={scores[t]}>
            <Text style={[styles.scoreNum, { color: teamColors[t] }]}>{scores[t]}</Text>
          </Pop>
          <Pressable onPress={() => bump(t, 1)} style={styles.step} accessibilityRole="button" accessibilityLabel={`${teamNames[t]} plus one`}>
            <Text style={styles.stepText}>＋</Text>
          </Pressable>
        </View>
      ))}
      {problem && (scores[0] > 0 || scores[1] > 0) && <Text style={styles.problem}>{problem}</Text>}
      <Button label="✅ That's the final score" onPress={submit} disabled={!!problem} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  matchup: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  matchName: { fontSize: 30, fontFamily: font.bold, textAlign: 'center', lineHeight: 34 },
  vsBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  vs: { color: colors.text, fontSize: 12, fontFamily: font.bold, letterSpacing: 0.5 },
  matchMeta: { color: colors.muted, fontSize: 14, fontWeight: '700', marginTop: 6 },
  intro: { color: colors.text, fontSize: 16, textAlign: 'center', lineHeight: 23 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  scoreName: { fontSize: 18, fontFamily: font.bold },
  wonHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  step: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.text, fontSize: 26, fontFamily: font.bold },
  scoreNum: { fontSize: 40, fontFamily: font.bold, minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
  problem: { color: colors.orange, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  workout: { gap: 6, borderWidth: 1.5, borderColor: colors.orange, backgroundColor: alpha(colors.orange, 0.08) },
  workoutTitle: { color: colors.orange, fontSize: 20, fontFamily: font.bold },
  workoutText: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 25 },
  wheelResult: { color: colors.pink, fontSize: 16, fontFamily: font.semi, marginTop: 4 },
  row: { flexDirection: 'row', gap: 10 },
});
