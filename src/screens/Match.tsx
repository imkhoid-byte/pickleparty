import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '../AppState';
import { APP_LINK, HASHTAG } from '../config';
import { Card as PartyCard, PACKS, drawCard, drawWithTeaser } from '../game/cards';
import { MOMENTS, MomentId, PartyPrompt, momentPrompt, promptForEvents } from '../game/party';
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

function gameRecord(s: MatchState, players?: [string[], string[]], sessionId?: string): GameRecord {
  const winner = s.winner ?? 0;
  return {
    players,
    sessionId,
    id: `${Date.now()}`,
    date: Date.now(),
    teamNames: s.config.teamNames,
    scores: s.scores,
    winner,
    pickled: s.scores[other(winner)] === 0,
    rallies: s.rallies,
  };
}

/** A prompt on screen. Cards can be passed; samples from locked packs offer an unlock. */
type Shown = PartyPrompt & { card?: boolean; lockedPack?: string };

export function Match({
  config,
  firstServer,
  players,
  sessionId,
}: {
  config: MatchConfig;
  firstServer: Team;
  /** Set when scoring a party game: the result goes back to the party screen. */
  players?: [string[], string[]];
  sessionId?: string;
}) {
  const { settings, recordGame, deck, lockedCards, access, session } = useApp();
  const back = goBack;
  // Pop-ups are native modals: hide them while another screen is on top.
  const focused = useIsFocused();
  const rules = useMemo(() => deck.filter((c) => c.kind === 'rule'), [deck]);
  const [match, setMatch] = useState(() => newMatch(config, firstServer));
  const [houseRule, setHouseRule] = useState<PartyCard | null>(
    () => (sessionId && rules.find((c) => c.id === session?.houseRuleId)) || drawCard(rules),
  );
  const [prompt, setPrompt] = useState<Shown | null>(null);
  const [pendingMoment, setPendingMoment] = useState<MomentId | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  const spice = settings.spice;
  const names = config.teamNames;

  const onRally = (team: Team) => {
    if (match.winner !== null) return;
    const { state, events } = rallyWonBy(match, team);
    setMatch(state);
    tap(settings.haptics, Haptics.ImpactFeedbackStyle.Medium);
    if (sessionId && state.winner !== null) {
      // The party screen shows the results reveal for every game.
      recordGame(gameRecord(state, players, sessionId));
      back();
      return;
    }
    const p = promptForEvents(events, state, spice);
    if (p) setPrompt(p);
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
    setPrompt({
      emoji: locked ? '🔒' : '🃏',
      title: locked ? `Sneak peek: ${pack?.name}` : 'Party Card',
      body: renderPenalty(card.text, spice),
      card: true,
      lockedPack: locked ? pack?.name : undefined,
    });
  };

  const rematch = () => {
    const loser = match.winner === null ? firstServer : other(match.winner);
    setMatch(newMatch(config, loser));
    setHouseRule(drawCard(rules, houseRule ? [houseRule.id] : []));
    setPrompt(null);
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
        <Text style={styles.subtitle}>{subtitle}</Text>
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
            📜 {renderPenalty(houseRule.text, spice)}
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
          title="Who did it?"
          onClose={() => setPendingMoment(null)}
        >
          {([0, 1] as Team[]).map((t) => (
            <Button
              key={t}
              label={names[t]}
              variant={t === 0 ? 'primary' : 'pink'}
              onPress={() => {
                setPrompt(momentPrompt(pendingMoment, names[t], spice));
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
            onPress={() => (access.isPro ? router.push('/stats') : openPaywall('playerStats'))}
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
