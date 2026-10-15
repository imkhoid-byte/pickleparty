import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '../AppState';
import { PACKS, drawCard, drawWithTeaser } from '../game/cards';
import { MOMENTS, MomentId, PartyPrompt, momentPrompt, resultPrompt } from '../game/party';
import { nameKey, playerRecords, storylines } from '../game/players';
import { Teams, planMatchup } from '../game/rotation';
import { renderPenalty } from '../game/spice';
import { openLiveScore, openPaywall } from '../navigation';
import type { GameRecord } from '../storage';
import { Button, Card, Chip, Label, Screen, Takeover, tap } from '../ui/components';
import { colors, radius, teamColors } from '../ui/theme';

/** One pop-up at a time: native modals can't stack. */
type Overlay =
  | { kind: 'score' }
  | { kind: 'moment'; id: MomentId }
  | { kind: 'prompt'; prompt: PartyPrompt & { lockedPack?: string; card?: boolean } }
  | { kind: 'players' }
  | { kind: 'end' };

export function Party() {
  const app = useApp();
  const { session, setSession, history, settings, deck, lockedCards, access, recordGame, rememberPlayers } = app;
  const focused = useIsFocused();
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  const games = useMemo(
    () => (session ? history.filter((g) => g.sessionId === session.id) : []),
    [history, session],
  );
  const rules = useMemo(() => deck.filter((c) => c.kind === 'rule'), [deck]);
  const latest = games[0];
  const unrevealed = session && latest && latest.id !== session.revealedGameId ? latest : null;
  // Memoized per game so chill-mode exercises don't reshuffle on every render.
  const reveal = useMemo(() => {
    if (!unrevealed || !session) return null;
    const prior = history.filter((g) => g.id !== unrevealed.id && g.date <= unrevealed.date);
    return {
      prompt: resultPrompt(
        { players: unrevealed.players ?? [[unrevealed.teamNames[0]], [unrevealed.teamNames[1]]], scores: unrevealed.scores, winner: unrevealed.winner },
        session.target,
        settings.spice,
      ),
      lines: storylines(unrevealed, prior),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unrevealed?.id]);

  if (!session) {
    return (
      <Screen title="Party" onBack={() => router.replace('/')}>
        <Text style={styles.muted}>No party in progress.</Text>
        <Button label="Start a party" onPress={() => router.replace('/party/new')} />
      </Screen>
    );
  }

  const teamSize: 1 | 2 = session.format === 'doubles' ? 2 : 1;
  const houseRule = rules.find((c) => c.id === session.houseRuleId) ?? null;
  const upNext = session.upNext;
  const onCourt = upNext ? upNext.flat() : [];
  const bench = session.present.filter((p) => !onCourt.some((c) => nameKey(c) === nameKey(p)));
  const tonight = playerRecords(games);
  const rotationLocked = session.rotation !== 'random' && !access.isPro;

  const plan = (present = session.present): Teams | null =>
    planMatchup(session.rotation, access.isPro, present, games, teamSize);

  const nextGame = () =>
    setSession({
      ...session,
      revealedGameId: latest?.id ?? null,
      upNext: plan(),
      houseRuleId: drawCard(rules, houseRule ? [houseRule.id] : [])?.id ?? null,
    });

  /** Tap one player, then another (on court or sitting out) to swap them. */
  const pick = (name: string) => {
    if (!upNext) return;
    if (!selected) return setSelected(name);
    if (nameKey(selected) === nameKey(name)) return setSelected(null);
    const swap = (n: string) =>
      nameKey(n) === nameKey(selected) ? name : nameKey(n) === nameKey(name) ? selected : n;
    setSession({ ...session, upNext: [upNext[0].map(swap), upNext[1].map(swap)] });
    setSelected(null);
  };

  const record = (winner: 0 | 1, scores: [number, number]) => {
    if (!upNext) return;
    const now = Date.now();
    const game: GameRecord = {
      id: `${now}`,
      date: now,
      teamNames: [upNext[0].join(' & '), upNext[1].join(' & ')],
      scores,
      winner,
      pickled: scores[winner === 0 ? 1 : 0] === 0,
      rallies: 0,
      players: upNext,
      sessionId: session.id,
    };
    if (settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    recordGame(game);
    setOverlay(null);
  };

  const drawFor = (title: string) => {
    const drawn = drawWithTeaser(deck, access.isPro ? [] : lockedCards, recent);
    if (!drawn) return;
    setRecent((r) => [drawn.card.id, ...r].slice(0, 15));
    const pack = PACKS.find((p) => p.id === drawn.card.pack);
    setOverlay({
      kind: 'prompt',
      prompt: {
        emoji: drawn.locked ? '🔒' : '🃏',
        title: drawn.locked ? `Sneak peek: ${pack?.name}` : title,
        body: renderPenalty(drawn.card.text, settings.spice),
        card: true,
        lockedPack: drawn.locked ? pack?.name : undefined,
      },
    });
  };

  const endParty = () => {
    const id = session.id;
    setSession(null);
    router.replace({ pathname: '/recap', params: { id } });
  };

  const renderOverlay = () => {
    if (!focused) return null;
    if (unrevealed && reveal) {
      return (
        <Takeover
          visible
          emoji={reveal.prompt.emoji}
          title={reveal.prompt.title}
          body={reveal.prompt.body}
          accent={reveal.prompt.big ? colors.orange : colors.pickle}
          onClose={nextGame}
        >
          {reveal.lines.map((l) => (
            <Text key={l} style={styles.storyline}>
              {l}
            </Text>
          ))}
          <Button label="Next game →" onPress={nextGame} />
          <Button
            label="🃏 Losers draw a card"
            variant="pink"
            onPress={() => {
              nextGame();
              drawFor('Losers’ card');
            }}
          />
        </Takeover>
      );
    }
    if (!overlay) return null;
    switch (overlay.kind) {
      case 'score':
        return upNext ? (
          <ScoreEntry teams={upNext} target={session.target} onDone={record} onClose={() => setOverlay(null)} />
        ) : null;
      case 'moment': {
        const m = MOMENTS.find((x) => x.id === overlay.id)!;
        return (
          <Takeover visible emoji={m.emoji} title="Who did it?" onClose={() => setOverlay(null)}>
            <View style={styles.chips}>
              {onCourt.map((n) => (
                <Chip
                  key={n}
                  label={n}
                  selected={false}
                  onPress={() =>
                    setOverlay({ kind: 'prompt', prompt: momentPrompt(overlay.id, n, settings.spice) })
                  }
                />
              ))}
            </View>
          </Takeover>
        );
      }
      case 'prompt': {
        const p = overlay.prompt;
        return (
          <Takeover
            visible
            emoji={p.emoji}
            title={p.title}
            body={p.body}
            accent={p.lockedPack ? colors.sky : colors.pickle}
            onClose={() => setOverlay(null)}
          >
            <Button label="Let's go!" onPress={() => setOverlay(null)} />
            {p.lockedPack ? (
              <Button
                label={`🔓 Get ${p.lockedPack}`}
                variant="secondary"
                onPress={() => {
                  setOverlay(null);
                  openPaywall('pack');
                }}
              />
            ) : p.card ? (
              <Button label="Pass: draw another" variant="ghost" onPress={() => drawFor(p.title)} />
            ) : null}
          </Takeover>
        );
      }
      case 'players':
        return (
          <PlayersEditor
            present={session.present}
            crew={settings.crew}
            onClose={() => setOverlay(null)}
            onSave={(present) => {
              rememberPlayers(present);
              const stillValid = upNext?.flat().every((n) => present.some((p) => nameKey(p) === nameKey(n)));
              setSession({ ...session, present, upNext: stillValid ? upNext : plan(present) });
              setOverlay(null);
            }}
          />
        );
      case 'end':
        return (
          <Takeover
            visible
            emoji="🌙"
            title="End the party?"
            body={`${games.length} game${games.length === 1 ? '' : 's'} played. You'll get the recap to share.`}
            onClose={() => setOverlay(null)}
          >
            <Button label="End & see recap" variant="pink" onPress={endParty} />
            <Button label="Keep playing" variant="ghost" onPress={() => setOverlay(null)} />
          </Takeover>
        );
    }
  };

  return (
    <Screen
      title={`Game ${games.length + 1}`}
      onBack={() => router.replace('/')}
      right={
        <Text style={styles.end} onPress={() => setOverlay({ kind: 'end' })}>
          End
        </Text>
      }
    >
      {houseRule && (
        <Pressable
          style={styles.rule}
          onPress={() => setSession({ ...session, houseRuleId: drawCard(rules, [houseRule.id])?.id ?? null })}
          accessibilityHint="Draw a different house rule"
        >
          <Text style={styles.ruleText}>📜 {renderPenalty(houseRule.text, settings.spice)}</Text>
          <Text style={styles.ruleHint}>house rule for this game · tap to change</Text>
        </Pressable>
      )}

      <Card>
        <Text style={styles.cardLabel}>UP NEXT · TAP TWO NAMES TO SWAP</Text>
        {upNext ? (
          <>
            {upNext.map((team, t) => (
              <View key={t}>
                {t === 1 && <Text style={styles.vs}>VS</Text>}
                <View style={styles.teamRow}>
                  {team.map((n) => (
                    <PlayerPill
                      key={n}
                      name={n}
                      color={teamColors[t]}
                      selected={selected !== null && nameKey(selected) === nameKey(n)}
                      onPress={() => pick(n)}
                    />
                  ))}
                </View>
              </View>
            ))}
            {bench.length > 0 && (
              <View style={styles.benchRow}>
                <Text style={styles.muted}>Sitting out:</Text>
                {bench.map((n) => (
                  <PlayerPill
                    key={n}
                    name={n}
                    color={colors.muted}
                    selected={selected !== null && nameKey(selected) === nameKey(n)}
                    onPress={() => pick(n)}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.muted}>Not enough players. Add someone to keep going.</Text>
        )}
        <View style={styles.row}>
          <Button
            small
            variant="secondary"
            style={{ flex: 1 }}
            label={session.rotation === 'random' || rotationLocked ? '🎲 Shuffle' : '🔄 New matchup'}
            onPress={() => setSession({ ...session, upNext: plan() })}
          />
          <Button small variant="secondary" style={{ flex: 1 }} label="👥 Players" onPress={() => setOverlay({ kind: 'players' })} />
        </View>
        {rotationLocked && (
          <Text style={styles.lock} onPress={() => openPaywall('rotation')}>
            🔒 Fair rotation is a Pro feature. Shuffling randomly for now →
          </Text>
        )}
      </Card>

      <Button
        label="🏁 Game over: enter score"
        onPress={() => setOverlay({ kind: 'score' })}
        disabled={!upNext}
      />
      <View style={styles.row}>
        <Button small variant="pink" style={{ flex: 1 }} label="🃏 Party card" onPress={() => drawFor('Party Card')} />
        <Button
          small
          variant="secondary"
          style={{ flex: 1 }}
          label="📺 Live score"
          disabled={!upNext}
          onPress={() =>
            upNext &&
            openLiveScore(
              {
                format: session.format,
                scoring: 'sideout',
                target: session.target,
                teamNames: [upNext[0].join(' & '), upNext[1].join(' & ')],
              },
              0,
              upNext,
              session.id,
            )
          }
        />
      </View>
      <Text style={styles.muted}>
        Someone sitting out? They can run 📺 Live score and call penalties rally by rally.
      </Text>

      <Label>Moments</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {MOMENTS.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => {
              tap(settings.haptics);
              setOverlay({ kind: 'moment', id: m.id });
            }}
            style={styles.moment}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
            <Text style={styles.momentText}>{m.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tonight.length > 0 && (
        <>
          <Label>Tonight</Label>
          <Card>
            {tonight.map((r, i) => (
              <View key={nameKey(r.name)} style={styles.standing}>
                <Text style={styles.rank}>{i === 0 ? '👑' : `${i + 1}.`}</Text>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.record}>
                  {r.wins}-{r.losses}
                  {r.gotPickled > 0 ? ' 🥒' : ''}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {renderOverlay()}
    </Screen>
  );
}

function PlayerPill({
  name,
  color,
  selected,
  onPress,
}: {
  name: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.pill, { borderColor: color }, selected && { backgroundColor: color }]}
    >
      <Text style={[styles.pillText, { color: selected ? colors.bg : color }]} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

/** Two taps: who won, then the losing score. */
function ScoreEntry({
  teams,
  target,
  onDone,
  onClose,
}: {
  teams: Teams;
  target: number;
  onDone: (winner: 0 | 1, scores: [number, number]) => void;
  onClose: () => void;
}) {
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [extra, setExtra] = useState<number | null>(null); // winning score when past target
  const label = (t: 0 | 1) => teams[t].join(' & ');
  const finish = (w: 0 | 1, ws: number, ls: number) => onDone(w, w === 0 ? [ws, ls] : [ls, ws]);

  if (winner === null) {
    return (
      <Takeover visible emoji="🏁" title="Who won?" onClose={onClose}>
        <Button label={label(0)} onPress={() => setWinner(0)} />
        <Button label={label(1)} variant="pink" onPress={() => setWinner(1)} />
      </Takeover>
    );
  }
  if (extra !== null) {
    return (
      <Takeover visible emoji="😮‍💨" title="Extra points" body={`${label(winner)} won ${extra}-${extra - 2}`} onClose={onClose}>
        <View style={styles.row}>
          <Button small variant="secondary" style={{ flex: 1 }} label="−" disabled={extra <= target + 1} onPress={() => setExtra(extra - 1)} />
          <Button small variant="secondary" style={{ flex: 1 }} label="+" onPress={() => setExtra(extra + 1)} />
        </View>
        <Button label="Save" onPress={() => finish(winner, extra, extra - 2)} />
      </Takeover>
    );
  }
  return (
    <Takeover
      visible
      emoji="🏆"
      title="Final score?"
      body={`${label(winner)} won. How many did the other team get?`}
      accent={teamColors[winner]}
      onClose={onClose}
    >
      <View style={styles.scoreGrid}>
        {Array.from({ length: target - 1 }, (_, n) => (
          <Pressable key={n} style={styles.scoreBtn} onPress={() => finish(winner, target, n)} accessibilityRole="button">
            <Text style={styles.scoreText}>
              {target}-{n}
            </Text>
          </Pressable>
        ))}
        <Pressable style={styles.scoreBtn} onPress={() => setExtra(target + 1)} accessibilityRole="button">
          <Text style={styles.scoreText}>
            {target + 1}-{target - 1}+
          </Text>
        </Pressable>
      </View>
      <Button label="‹ Back" variant="ghost" small onPress={() => setWinner(null)} />
    </Takeover>
  );
}

function PlayersEditor({
  present,
  crew,
  onSave,
  onClose,
}: {
  present: string[];
  crew: string[];
  onSave: (present: string[]) => void;
  onClose: () => void;
}) {
  const [here, setHere] = useState(present);
  const [draft, setDraft] = useState('');
  const has = (n: string) => here.some((p) => nameKey(p) === nameKey(n));
  const roster = [...here.filter((p) => !crew.some((c) => nameKey(c) === nameKey(p))), ...crew];
  const add = () => {
    const n = draft.trim();
    if (n && !has(n)) setHere([...here, n]);
    setDraft('');
  };
  return (
    <Takeover visible emoji="👥" title="Who's here?" onClose={onClose}>
      <View style={styles.row}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder="Someone new"
          placeholderTextColor={colors.muted}
          maxLength={20}
          style={styles.input}
        />
        <Button small label="Add" onPress={add} disabled={!draft.trim()} />
      </View>
      <View style={styles.chips}>
        {roster.map((n) => (
          <Chip
            key={nameKey(n)}
            label={n}
            selected={has(n)}
            onPress={() => setHere(has(n) ? here.filter((p) => nameKey(p) !== nameKey(n)) : [...here, n])}
          />
        ))}
      </View>
      <Button label="Save" onPress={() => onSave(here)} />
    </Takeover>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  end: { color: colors.pink, fontSize: 16, fontWeight: '800' },
  rule: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
  },
  ruleText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  ruleHint: { color: colors.muted, fontSize: 11, marginTop: 4, textAlign: 'right' },
  cardLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  teamRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  vs: { color: colors.muted, fontSize: 12, fontWeight: '900', letterSpacing: 2, marginVertical: 6, textAlign: 'center' },
  benchRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  pill: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, maxWidth: '48%' },
  pillText: { fontSize: 18, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  lock: { color: colors.pink, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  moment: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 78,
  },
  momentText: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 2 },
  standing: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 10 },
  rank: { width: 28, color: colors.muted, fontSize: 16, fontWeight: '800' },
  name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
  record: { color: colors.muted, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  storyline: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  scoreBtn: {
    backgroundColor: colors.surfaceHi,
    borderRadius: radius.sm,
    paddingVertical: 12,
    width: 72,
    alignItems: 'center',
  },
  scoreText: { color: colors.text, fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.surfaceHi,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
