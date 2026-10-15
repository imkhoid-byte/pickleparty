import { router } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { nameKey, playerRecords, playerStreaks, sides, winPct } from '../game/players';
import { visibleHistory } from '../monetization/entitlements';
import { goBack, openPaywall } from '../navigation';
import { Button, Card, Label, Screen } from '../ui/components';
import { colors } from '../ui/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Stats() {
  const { history, resetHistory, access } = useApp();
  const records = playerRecords(history);
  const { shown, hidden } = visibleHistory(history, access);

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      resetHistory();
      return;
    }
    Alert.alert('Clear all games?', 'This wipes everyone’s stats for good.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: resetHistory },
    ]);
  };

  if (history.length === 0) {
    return (
      <Screen title="Stats" onBack={goBack}>
        <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 60 }}>🏆</Text>
          <Text style={styles.empty}>No games yet. Start a party and go get pickled.</Text>
        </Card>
      </Screen>
    );
  }

  const openPlayer = (name: string) =>
    access.isPro ? router.push({ pathname: '/player', params: { name } }) : openPaywall('playerStats');

  return (
    <Screen title="Stats" onBack={goBack}>
      <Label>Rankings · tap a player</Label>
      <Card>
        {records.map((r, i) => (
          <Pressable key={nameKey(r.name)} style={styles.row} onPress={() => openPlayer(r.name)} accessibilityRole="button">
            <Text style={styles.rank}>{MEDALS[i] ?? `${i + 1}.`}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={styles.sub}>
                {Math.round(winPct(r) * 100)}% · {r.games} game{r.games === 1 ? '' : 's'}
                {r.pickledOthers > 0 ? ` · 🥒 served ${r.pickledOthers}` : ''}
              </Text>
            </View>
            <Text style={styles.record}>
              {r.wins}-{r.losses} {access.isPro ? '›' : '🔒'}
            </Text>
          </Pressable>
        ))}
      </Card>

      {access.isPro ? <HallOfShame /> : <LockedStats players={records.length} games={history.length} />}

      <Label>Recent games</Label>
      <Card>
        {shown.slice(0, 50).map((g) => {
          const s = sides(g);
          const w = s[g.winner].join(' & ');
          const l = s[g.winner === 0 ? 1 : 0].join(' & ');
          return (
            <View key={g.id} style={styles.row}>
              <Text style={styles.game} numberOfLines={2}>
                {g.pickled ? '🥒 ' : ''}
                <Text style={{ color: colors.pickle }}>{w}</Text> def. {l}
              </Text>
              <Text style={styles.record}>
                {g.scores[g.winner]}-{g.scores[g.winner === 0 ? 1 : 0]}
              </Text>
            </View>
          );
        })}
        {hidden > 0 && (
          <Pressable onPress={() => openPaywall('history')} accessibilityRole="button">
            <Text style={styles.lockLine}>
              🔒 {hidden} older game{hidden === 1 ? ' is' : 's are'} saved. Unlock your full history with Pro →
            </Text>
          </Pressable>
        )}
      </Card>
      <Button label="Clear history" variant="ghost" small onPress={confirmReset} />
    </Screen>
  );
}

function HallOfShame() {
  const { history } = useApp();
  const records = playerRecords(history);
  const streaks = playerStreaks(history);
  const hot = records
    .map((r) => ({ name: r.name, ...(streaks.get(nameKey(r.name)) ?? { current: 0, best: 0 }) }))
    .filter((s) => s.current >= 2)
    .sort((a, b) => b.current - a.current)
    .slice(0, 3);
  const shame = records.filter((r) => r.gotPickled > 0).sort((a, b) => b.gotPickled - a.gotPickled).slice(0, 3);
  if (hot.length === 0 && shame.length === 0) return null;
  return (
    <>
      {hot.length > 0 && (
        <>
          <Label>🔥 On fire</Label>
          <Card>
            {hot.map((s) => (
              <View key={nameKey(s.name)} style={styles.row}>
                <Text style={styles.game}>{s.name}</Text>
                <Text style={styles.record}>{s.current} straight</Text>
              </View>
            ))}
          </Card>
        </>
      )}
      {shame.length > 0 && (
        <>
          <Label>💀 Hall of Shame</Label>
          <Card>
            {shame.map((r) => (
              <View key={nameKey(r.name)} style={styles.row}>
                <Text style={styles.game}>{r.name}</Text>
                <Text style={styles.record}>pickled ×{r.gotPickled}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  );
}

function LockedStats({ players, games }: { players: number; games: number }) {
  return (
    <Pressable onPress={() => openPaywall('playerStats')} accessibilityRole="button">
      <Card style={{ borderWidth: 2, borderColor: colors.pink }}>
        <Text style={styles.big}>🔒 Player profiles</Text>
        <Text style={styles.sub}>
          {players} players, {games} games of history. With Pro, tap anyone to see:
        </Text>
        <Text style={styles.line}>⚔️ Head-to-head vs everyone</Text>
        <Text style={styles.line}>🤝 Best partner · 😈 Nemesis</Text>
        <Text style={styles.line}>🔥 Win streaks · 💀 Hall of Shame</Text>
        <Text style={[styles.line, { color: colors.pink, fontWeight: '800' }]}>Unlock with Pro →</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  rank: { width: 32, fontSize: 20, color: colors.muted, fontWeight: '800' },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  record: { color: colors.muted, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  game: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  empty: { color: colors.muted, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  big: { color: colors.text, fontSize: 20, fontWeight: '900' },
  line: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  lockLine: { color: colors.pink, fontSize: 14, fontWeight: '800', paddingTop: 8 },
});
