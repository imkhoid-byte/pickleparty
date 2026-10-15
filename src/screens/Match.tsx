import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '../AppState';
import { announce, hush } from '../audio/announcer';
import { APP_LINK, HASHTAG } from '../config';
import { Card as PartyCard, PACKS, addressCard, drawCard, drawWithTeaser } from '../game/cards';
import {
  MOMENTS,
  MomentId,
  PartyPrompt,
  WATER_BREAK,
  momentPrompt,
  momentRallyWinner,
  promptForEvents,
  waterBreakDue,
} from '../game/party';
import { MatchConfig, MatchState, Team, callScore, newMatch, other, rallyWonBy, undo } from '../game/scoring';
import { renderPenalty } from '../game/spice';
import { goBack, openPaywall } from '../navigation';
import type { GameRecord } from '../storage';
import { Button, Takeover, tap } from '../ui/components';
import { colors, radius, teamColors } from '../ui/theme';

export function shareText(s: MatchState): string {
  if (s.winner === null) return '';
  const w = s.winner;
  const [winner, loser] = [s.config.teamNames[w], s.config.teamNames[other(w)]];
  const score = `${s.scores[w]}-${s.scores[other(w)]}`;
  const brag = s.scores[other(w)] === 0 ? ` and PICKLED them 🥒💀` : ` 🏓`;
  return `${winner} beat ${loser} ${score}${brag}\nScored on PickleParty ${HASHTAG}\n${APP_LINK}`;
}

function gameRecord(s: MatchState): GameRecord {
  const winner = s.winner ?? 0;
  return {
    id: `${Date.now()}`,
    date: Date.now(),
    teamNames: s.config.teamNames,
    scores: s.scores,
    winner,
    pickled: s.scores[other(winner)] === 0,
    rallies: s.rallies,
  };
}

/** The game that last triggered a water break, so one break is only shown once. */
let lastWaterBreak: string | null = null;

/** The game id a water break is due for (every two games), if it hasn't been shown yet. */
function pendingWaterBreak(history: GameRecord[]): string | null {
  const due = waterBreakDue(history, Date.now());
  return due && due !== lastWaterBreak ? due : null;
}

/** A prompt on screen. Cards can be passed; samples from locked packs offer an unlock. */
type Shown = PartyPrompt & { card?: boolean; lockedPack?: string };

export function Match({ config, firstServer }: { config: MatchConfig; firstServer: Team }) {
  const { settings, updateSettings, recordGame, deck, lockedCards, access, history } = useApp();
  const back = goBack;
  // Pop-ups are native modals: hide them while another screen is on top.
  const focused = useIsFocused();
  const rules = useMemo(() => deck.filter((c) => c.kind === 'rule'), [deck]);
  const [match, setMatch] = useState(() => newMatch(config, firstServer));
  const [houseRule, setHouseRule] = useState<PartyCard | null>(() => drawCard(rules));
  // A match started from the setup screen can open with a water break.
  const [prompt, setPrompt] = useState<Shown | null>(() => (pendingWaterBreak(history) ? WATER_BREAK : null));
  const [pendingMoment, setPendingMoment] = useState<MomentId | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  // The team that lost the last rally gets the next Party Card dare.
  const [lastLoser, setLastLoser] = useState<Team | null>(null);

  const spice = settings.spice;
  // Rendered once per rule so random penalties (exercises, Wild acts) don't change on every rally.
  const houseRuleText = useMemo(() => (houseRule ? renderPenalty(houseRule.text, spice) : ''), [houseRule, spice]);
  const names = config.teamNames;
  const audioOn = settings.sound || settings.voice;

  /** Show a prompt and announce it out loud. */
  const show = (p: Shown) => {
    setPrompt(p);
    announce(p, { sound: settings.sound, voice: settings.voice, announcer: settings.announcer });
  };
  const toggleAudio = () => {
    if (audioOn) hush();
    updateSettings({ sound: !audioOn, voice: !audioOn });
  };
  // Stop talking when leaving the match.
  useEffect(() => hush, []);

  // Announce an opening water break.
  useEffect(() => {
    if (prompt !== WATER_BREAK) return;
    lastWaterBreak = pendingWaterBreak(history) ?? lastWaterBreak;
    announce(WATER_BREAK, { sound: settings.sound, voice: settings.voice, announcer: settings.announcer });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Score a rally. A moment (net ball, ace…) brings its own prompt; it's shown
   * instead of a smaller event prompt, but a game-ending prompt still wins.
   */
  const onRally = (team: Team, moment?: PartyPrompt) => {
    if (match.winner !== null) return;
    const { state, events } = rallyWonBy(match, team);
    setMatch(state);
    tap(settings.haptics, Haptics.ImpactFeedbackStyle.Medium);
    setLastLoser(other(team));
    const p = promptForEvents(events, state, spice);
    const next = p?.big ? p : (moment ?? p);
    if (next) show(next);
    if (state.winner !== null) {
      if (settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      recordGame(gameRecord(state));
    }
  };

  const onDraw = () => {
    const drawn = drawWithTeaser(deck, access.isPro ? [] : lockedCards, recent);
    if (!drawn) return;
    const { card, locked } = drawn;
    setRecent((r) => [card.id, ...r].slice(0, 12));
    const pack = PACKS.find((p) => p.id === card.pack);
    const who = names[lastLoser ?? (Math.random() < 0.5 ? 0 : 1)];
    show({
      emoji: locked ? '🔒' : '🃏',
      title: locked ? `Sneak peek: ${pack?.name}` : 'Party Card',
      body: addressCard(renderPenalty(card.text, spice), card.kind, who),
      card: true,
      lockedPack: locked ? pack?.name : undefined,
      sound: 'whoosh',
    });
  };

  const rematch = () => {
    const loser = match.winner === null ? firstServer : other(match.winner);
    setMatch(newMatch(config, loser));
    setHouseRule(drawCard(rules, houseRule ? [houseRule.id] : []));
    const due = pendingWaterBreak(history);
    if (due) {
      lastWaterBreak = due;
      show(WATER_BREAK);
    } else setPrompt(null);
  };

  const subtitle = `${config.format === 'doubles' ? 'Doubles' : 'Singles'} · to ${config.target} · ${
    config.scoring === 'rally' ? 'rally' : 'side-out'
  }`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button">
          <Text style={styles.headerBtn}>✕ Quit</Text>
        </Pressable>
        <Pressable
          onPress={toggleAudio}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={audioOn ? 'Mute announcer' : 'Turn on announcer'}
          style={styles.subtitleRow}
        >
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.speaker}>{audioOn ? '🔊' : '🔇'}</Text>
        </Pressable>
        <Pressable
          onPress={() => setMatch(undo(match))}
          disabled={match.history.length === 0}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={[styles.headerBtn, match.history.length === 0 && { opacity: 0.3 }]}>↶ Undo</Text>
        </Pressable>
      </View>

      {houseRule && (
        <Pressable
          style={styles.rule}
          onPress={() => setHouseRule(drawCard(rules, [houseRule.id]))}
          accessibilityHint="Draw a different house rule"
        >
          <Text style={styles.ruleText} numberOfLines={3}>
            📜 {houseRuleText}
          </Text>
          <Text style={styles.ruleHint}>tap for new rule</Text>
        </Pressable>
      )}

      <Text style={styles.call} accessibilityLabel={`Score ${callScore(match)}`}>
        {callScore(match)}
      </Text>

      <View style={styles.courts}>
        {([0, 1] as Team[]).map((t) => {
          const serving = match.servingTeam === t;
          return (
            <Pressable
              key={t}
              onPress={() => onRally(t)}
              accessibilityRole="button"
              accessibilityLabel={`${names[t]} won the rally`}
              style={({ pressed }) => [
                styles.team,
                { borderColor: serving ? teamColors[t] : colors.surfaceHi },
                pressed && { transform: [{ scale: 0.98 }], backgroundColor: colors.surfaceHi },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.teamName, { color: teamColors[t] }]} numberOfLines={1}>
                  {names[t]}
                </Text>
                <Text style={styles.serveTag}>
                  {serving
                    ? `🏓 Serving${
                        config.format === 'doubles' && config.scoring === 'sideout'
                          ? ` · server ${match.serverNumber}`
                          : ''
                      }`
                    : 'tap when this team wins a rally'}
                </Text>
              </View>
              <Text style={[styles.score, { color: teamColors[t] }]}>{match.scores[t]}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.moments}
      >
        {MOMENTS.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => {
              if (match.winner !== null) return;
              tap(settings.haptics);
              setPendingMoment(m.id);
            }}
            style={styles.moment}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
            <Text style={styles.momentText}>{m.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Button label="🃏  Draw a Party Card" variant="pink" onPress={onDraw} />
      </View>

      {/* One modal for everything: iOS can't present a second modal while another is closing. */}
      {!focused ? null : pendingMoment !== null ? (
        <Takeover
          visible
          emoji={MOMENTS.find((m) => m.id === pendingMoment)?.emoji ?? '❓'}
          title={MOMENTS.find((m) => m.id === pendingMoment)?.ask ?? 'Who did it?'}
          onClose={() => setPendingMoment(null)}
        >
          {([0, 1] as Team[]).map((t) => (
            <Button
              key={t}
              label={names[t]}
              variant={t === 0 ? 'primary' : 'pink'}
              onPress={() => {
                // The moment ended the rally, so it scores it too.
                onRally(
                  momentRallyWinner(pendingMoment, t),
                  momentPrompt(pendingMoment, names[t], spice, names[other(t)]),
                );
                setPendingMoment(null);
              }}
            />
          ))}
        </Takeover>
      ) : prompt !== null ? (
        <Takeover
          visible
          emoji={prompt.emoji}
          title={prompt.title}
          body={prompt.body}
          accent={prompt.lockedPack ? colors.sky : prompt.big ? colors.orange : colors.pickle}
          footnote={spice === 'wild' ? 'Not feeling the act? Skip it, no questions asked.' : undefined}
          onClose={() => setPrompt(null)}
        >
          {prompt.card ? (
            <>
              <Button label="Let's go!" onPress={() => setPrompt(null)} />
              {prompt.lockedPack ? (
                <Button
                  label={`🔓 Get ${prompt.lockedPack}`}
                  variant="secondary"
                  onPress={() => {
                    setPrompt(null);
                    openPaywall('pack');
                  }}
                />
              ) : (
                <Button label="Pass: draw another" variant="ghost" onPress={onDraw} />
              )}
            </>
          ) : undefined}
        </Takeover>
      ) : (
        <Takeover
          visible={match.winner !== null}
          emoji={match.winner !== null && match.scores[other(match.winner)] === 0 ? '🥒' : '🏆'}
          title={match.winner !== null ? `${names[match.winner]} wins!` : ''}
          body={`${match.scores[0]} – ${match.scores[1]} · ${match.rallies} rallies`}
          accent={match.winner !== null ? teamColors[match.winner] : colors.pickle}
          onClose={() => {}}
        >
          <Button
            label="📣 Share the result"
            onPress={() => Share.share({ message: shareText(match) }).catch(() => {})}
          />
          <Button label="🔁 Rematch" variant="pink" onPress={rematch} />
          <Button
            label={access.isPro ? '📊 Crew stats & rivalries' : '👑 Who owns this rivalry? See Crew Stats'}
            variant="secondary"
            onPress={() => (access.isPro ? router.push('/stats') : openPaywall('crewStats'))}
          />
          <Button label="Home" variant="ghost" onPress={back} />
        </Takeover>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerBtn: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speaker: { fontSize: 18 },
  rule: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
  },
  ruleText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  ruleHint: { color: colors.muted, fontSize: 11, marginTop: 4, textAlign: 'right' },
  call: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 8,
    letterSpacing: 4,
  },
  courts: { flex: 1, paddingHorizontal: 16, gap: 12 },
  team: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    paddingHorizontal: 20,
  },
  teamName: { fontSize: 24, fontWeight: '900' },
  serveTag: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 4 },
  score: { fontSize: 96, fontWeight: '900', fontVariant: ['tabular-nums'] },
  moments: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  moment: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 78,
  },
  momentText: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 2 },
});
