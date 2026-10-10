import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { leaderboard } from '../game/stats';
import { Button, Card, Label, Screen } from '../ui/components';
import { colors } from '../ui/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

export function History({ back }: { back: () => void }) {
  const { history, resetHistory } = useApp();
  const board = leaderboard(history);

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      resetHistory();
      return;
    }
    Alert.alert('Clear all games?', 'This wipes the leaderboard for good.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: resetHistory },
    ]);
  };

  if (history.length === 0) {
    return (
      <Screen title="Leaderboard" onBack={back}>
        <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 60 }}>🏆</Text>
          <Text style={styles.empty}>No games yet. Go get pickled.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Leaderboard" onBack={back}>
      <Label>Rankings</Label>
      <Card>
        {board.map((s, i) => (
          <View key={s.name} style={styles.row}>
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

      <Label>Recent games</Label>
      <Card>
        {history.slice(0, 30).map((g) => (
          <View key={g.id} style={styles.row}>
            <Text style={styles.game} numberOfLines={1}>
              {g.pickled ? '🥒 ' : ''}
              <Text style={{ color: colors.pickle }}>{g.teamNames[g.winner]}</Text> def. {g.teamNames[1 - g.winner]}
            </Text>
            <Text style={styles.record}>
              {g.scores[g.winner]}-{g.scores[1 - g.winner]}
            </Text>
          </View>
        ))}
      </Card>
      <Button label="Clear history" variant="ghost" small onPress={confirmReset} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  rank: { width: 32, fontSize: 20, color: colors.muted, fontWeight: '800' },
  name: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '800' },
  record: { color: colors.muted, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  game: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  empty: { color: colors.muted, fontSize: 18, fontWeight: '700' },
});
