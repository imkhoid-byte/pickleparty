import { useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { APP_LINK, HASHTAG } from '../config';
import { recap, recapText, rivalries, streaks } from '../game/crew';
import { leaderboard } from '../game/stats';
import { visibleHistory } from '../monetization/entitlements';
import { goBack, openPaywall } from '../navigation';
import { Button, Card, Label, Screen } from '../ui/components';
import { colors } from '../ui/theme';

const MEDALS = ['🥇', '🥈', '🥉'];
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function Stats() {
  const { history, resetHistory, access } = useApp();
  const board = leaderboard(history);
  const { shown, hidden } = visibleHistory(history, access);

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      resetHistory();
      return;
    }
    Alert.alert('Clear all games?', 'This wipes your stats for good.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: resetHistory },
    ]);
  };

  if (history.length === 0) {
    return (
      <Screen title="Stats" onBack={goBack}>
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
      <Card>
        {shown.slice(0, 50).map((g) => (
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
  rank: { width: 32, fontSize: 20, color: colors.muted, fontWeight: '800' },
  name: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '800' },
  record: { color: colors.muted, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  game: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  empty: { color: colors.muted, fontSize: 18, fontWeight: '700' },
  big: { color: colors.text, fontSize: 20, fontWeight: '900' },
  line: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  lockLine: { color: colors.pink, fontSize: 14, fontWeight: '800', paddingTop: 8 },
});
