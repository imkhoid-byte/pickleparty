import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '../AppState';
import { APP_LINK, HASHTAG } from '../config';
import { Card as PartyCard, cardsForPacks, drawCard } from '../game/cards';
import { MOMENTS, MomentId, PartyPrompt, momentPrompt, promptForEvents } from '../game/party';
import { MatchConfig, MatchState, Team, callScore, newMatch, other, rallyWonBy, undo } from '../game/scoring';
import { renderPenalty } from '../game/spice';
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

export function Match({
  config,
  firstServer,
  back,
}: {
  config: MatchConfig;
  firstServer: Team;
  back: () => void;
}) {
  const { settings, recordGame } = useApp();
  const deck = useMemo(() => cardsForPacks(settings.activePacks), [settings.activePacks]);
  const rules = useMemo(() => deck.filter((c) => c.kind === 'rule'), [deck]);
  const [match, setMatch] = useState(() => newMatch(config, firstServer));
  const [houseRule, setHouseRule] = useState<PartyCard | null>(() => drawCard(rules));
  const [prompt, setPrompt] = useState<PartyPrompt | null>(null);
  const [pendingMoment, setPendingMoment] = useState<MomentId | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  const spice = settings.spice;
  const names = config.teamNames;

  const onRally = (team: Team) => {
    if (match.winner !== null) return;
    const { state, events } = rallyWonBy(match, team);
    setMatch(state);
    tap(settings.haptics, Haptics.ImpactFeedbackStyle.Medium);
    const p = promptForEvents(events, state, spice);
    if (p) setPrompt(p);
    if (state.winner !== null) {
      if (settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      recordGame({
        id: `${Date.now()}`,
        date: Date.now(),
        teamNames: names,
        scores: state.scores,
        winner: state.winner,
        pickled: state.scores[other(state.winner)] === 0,
        rallies: state.rallies,
      });
    }
  };

  const onDraw = () => {
    const card = drawCard(deck, recent);
    if (!card) return;
    setRecent((r) => [card.id, ...r].slice(0, 12));
    setPrompt({ emoji: '🃏', title: 'Party Card', body: renderPenalty(card.text, spice) });
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
      {pendingMoment !== null ? (
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
          accent={prompt.big ? colors.orange : colors.pickle}
          onClose={() => setPrompt(null)}
        />
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
