import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { APP_LINK, HASHTAG } from '../config';
import { recap, recapText, rivalries, streaks } from '../game/crew';
import { leaderboard } from '../game/stats';
import { visibleHistory } from '../monetization/entitlements';
import { goBack, openPaywall } from '../navigation';
import type { GameRecord } from '../storage';
import { Button, Card, Label, Screen, Takeover } from '../ui/components';
import { colors } from '../ui/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

/** "Thu, Oct 15 · 6:42 PM" */
const playedOn = (date: number) =>
  new Date(date).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function Stats() {
  const { history, resetHistory, deleteGame, restoreHistory, access } = useApp();
  const board = leaderboard(history);
  const { shown, hidden } = visibleHistory(history, access);

  // Tapping a game opens it, with the option to delete it. Every delete can be undone
  // until you leave this screen.
  const [selected, setSelected] = useState<GameRecord | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [undo, setUndo] = useState<{ games: GameRecord[]; message: string } | null>(null);

  const removeGame = (g: GameRecord) => {
    setUndo({ games: history, message: 'Game deleted.' });
    deleteGame(g.id);
    setSelected(null);
  };
  const clearAll = () => {
    setUndo({ games: history, message: `All ${history.length} games cleared.` });
    resetHistory();
    setConfirmClear(false);
  };
  const undoBar = undo && (
    <Pressable
      onPress={() => {
        restoreHistory(undo.games);
        setUndo(null);
      }}
      accessibilityRole="button"
      style={styles.undo}
    >
      <Text style={styles.undoText}>{undo.message}</Text>
      <Text style={styles.undoAction}>↶ Undo</Text>
    </Pressable>
  );

  if (history.length === 0) {
    return (
      <Screen title="Stats" onBack={goBack}>
        {undoBar}
        <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 60 }}>🏆</Text>
          <Text style={styles.empty}>No games yet. Go get pickled.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Stats" onBack={goBack}>
      <Label>Rankings</Label>
      <Card>
        {board.map((s, i) => (
          <View key={s.name.toLowerCase()} style={styles.row}>
            <Text style={styles.rank}>{MEDALS[i] ?? `${i + 1}.`}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {s.name}
            </Text>
            <Text style={styles.record}>
              {s.wins}-{s.losses}
              {s.pickledOthers > 0 ? `  🥒×${s.pickledOthers}` : ''}
            </Text>
          </View>
        ))}
      </Card>

      {access.isPro ? <CrewStats /> : <LockedCrewStats />}

      <Label>Recent games</Label>
      {undoBar}
      <Text style={styles.hint}>Tap a game to see it or remove it.</Text>
      <Card>
        {shown.slice(0, 50).map((g) => (
          <Pressable
            key={g.id}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            onPress={() => setSelected(g)}
            accessibilityRole="button"
            accessibilityHint="Shows the game, with an option to delete it"
          >
            <Text style={styles.game} numberOfLines={1}>
              {g.pickled ? '🥒 ' : ''}
              <Text style={{ color: colors.pickle }}>{g.teamNames[g.winner]}</Text> def. {g.teamNames[1 - g.winner]}
            </Text>
            <Text style={styles.record}>
              {g.scores[g.winner]}-{g.scores[1 - g.winner]} ›
            </Text>
          </Pressable>
        ))}
        {hidden > 0 && (
          <Pressable onPress={() => openPaywall('history')} accessibilityRole="button">
            <Text style={styles.lockLine}>
              🔒 {hidden} older game{hidden === 1 ? ' is' : 's are'} saved. Unlock your full history with Pro →
            </Text>
          </Pressable>
        )}
      </Card>
      <Button label="🗑️ Clear all games" variant="ghost" small onPress={() => setConfirmClear(true)} />

      <Takeover
        visible={selected !== null}
        emoji={selected?.pickled ? '🥒' : '🏆'}
        title={selected ? `${selected.teamNames[selected.winner]} ${selected.pickled ? 'pickled' : 'beat'} ${selected.teamNames[1 - selected.winner]}` : ''}
        body={selected ? `${selected.scores[selected.winner]} – ${selected.scores[1 - selected.winner]} · ${selected.rallies} rallies\n${playedOn(selected.date)}` : ''}
        onClose={() => setSelected(null)}
      >
        <Button label="Keep it" onPress={() => setSelected(null)} />
        <Button label="🗑️ Delete this game" variant="ghost" onPress={() => selected && removeGame(selected)} />
      </Takeover>

      <Takeover
        visible={confirmClear}
        emoji="🗑️"
        title={`Clear all ${history.length} game${history.length === 1 ? '' : 's'}?`}
        body="Rankings, rivalries and pickle counts start fresh. You can undo it right after."
        accent={colors.danger}
        onClose={() => setConfirmClear(false)}
      >
        <Button label="Keep my stats" onPress={() => setConfirmClear(false)} />
        <Button label="Clear everything" variant="ghost" onPress={clearAll} />
      </Takeover>
    </Screen>
  );
}

function CrewStats() {
  const { history } = useApp();
  const rivals = rivalries(history).filter((r) => r.games > 1).slice(0, 5);
  const hot = streaks(history).filter((s) => s.best > 1).slice(0, 5);
  const shame = [...leaderboard(history)].sort((a, b) => b.gotPickled - a.gotPickled).filter((s) => s.gotPickled > 0);
  const [weekStart] = useState(() => Date.now() - WEEK);
  const week = recap(history, weekStart);

  const shareRecap = () => {
    const r = week.games > 0 ? week : recap(history, 0);
    const period = week.games > 0 ? 'weekly' : 'all-time';
    Share.share({ message: recapText(r, period, APP_LINK, HASHTAG) }).catch(() => {});
  };

  return (
    <>
      <Label>👑 This week</Label>
      <Card>
        <Text style={styles.big}>
          {week.games} game{week.games === 1 ? '' : 's'} · {week.pickles} pickle{week.pickles === 1 ? '' : 's'}
        </Text>
        {week.champ && <Text style={styles.line}>Champs: {week.champ.name}</Text>}
        <Button label="📣 Share your recap" small onPress={shareRecap} />
      </Card>

      <Label>⚔️ Rivalries</Label>
      <Card>
        {rivals.length === 0 ? (
          <Text style={styles.line}>Play the same team twice to start a rivalry.</Text>
        ) : (
          rivals.map((r) => (
            <View key={`${r.a}|${r.b}`} style={styles.row}>
              <Text style={styles.game} numberOfLines={1}>
                <Text style={{ color: r.winsA >= r.winsB ? colors.pickle : colors.text }}>{r.a}</Text> vs{' '}
                <Text style={{ color: r.winsB > r.winsA ? colors.pickle : colors.text }}>{r.b}</Text>
              </Text>
              <Text style={styles.record}>
                {r.winsA}-{r.winsB}
              </Text>
            </View>
          ))
        )}
      </Card>

      {hot.length > 0 && (
        <>
          <Label>🔥 Win streaks</Label>
          <Card>
            {hot.map((s) => (
              <View key={s.name.toLowerCase()} style={styles.row}>
                <Text style={styles.game}>{s.name}</Text>
                <Text style={styles.record}>
                  {s.current > 1 ? `🔥${s.current} now · ` : ''}best {s.best}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {shame.length > 0 && (
        <>
          <Label>💀 Hall of Shame</Label>
          <Card>
            {shame.slice(0, 3).map((s) => (
              <View key={s.name.toLowerCase()} style={styles.row}>
                <Text style={styles.game}>{s.name}</Text>
                <Text style={styles.record}>pickled ×{s.gotPickled}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  );
}

function LockedCrewStats() {
  return (
    <Pressable onPress={() => openPaywall('crewStats')} accessibilityRole="button">
      <Card style={{ borderWidth: 2, borderColor: colors.pink }}>
        <Text style={styles.big}>🔒 Crew Stats</Text>
        <Text style={styles.line}>⚔️ Head-to-head rivalries</Text>
        <Text style={styles.line}>🔥 Win streaks</Text>
        <Text style={styles.line}>💀 Hall of Shame</Text>
        <Text style={styles.line}>📣 Weekly recaps to post in the group chat</Text>
        <Text style={[styles.line, { color: colors.pink, fontWeight: '800' }]}>Unlock with Pro →</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  hint: { color: colors.muted, fontSize: 13, marginTop: -6 },
  undo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceHi,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  undoText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  undoAction: { color: colors.pickle, fontSize: 16, fontWeight: '900' },
  rank: { width: 32, fontSize: 20, color: colors.muted, fontWeight: '800' },
  name: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '800' },
  record: { color: colors.muted, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  game: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  empty: { color: colors.muted, fontSize: 18, fontWeight: '700' },
  big: { color: colors.text, fontSize: 20, fontWeight: '900' },
  line: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  lockLine: { color: colors.pink, fontSize: 14, fontWeight: '800', paddingTop: 8 },
});
