import { router } from 'expo-router';
import { Share, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { APP_LINK, HASHTAG } from '../config';
import { nameKey, nightRecap, recapText } from '../game/players';
import { openPaywall } from '../navigation';
import { Button, Card, Label, Screen } from '../ui/components';
import { colors } from '../ui/theme';

/** End-of-party recap. Free for everyone: sharing it is how the app spreads. */
export function Recap({ id }: { id: string }) {
  const { history, access } = useApp();
  const games = history.filter((g) => g.sessionId === id);
  const r = nightRecap(games);
  const home = () => router.replace('/');

  if (games.length === 0) {
    return (
      <Screen title="Recap" onBack={home}>
        <Text style={styles.muted}>No games were played. Next time!</Text>
        <Button label="Home" onPress={home} />
      </Screen>
    );
  }

  return (
    <Screen title="Party Recap" onBack={home}>
      <View style={styles.hero}>
        <Text style={{ fontSize: 64 }}>🏆</Text>
        <Text style={styles.title}>{r.mvp ? `${r.mvp.name} ran the court` : 'What a party'}</Text>
        <Text style={styles.sub}>
          {r.games} game{r.games === 1 ? '' : 's'}
          {r.pickles > 0 ? ` · ${r.pickles} pickle${r.pickles === 1 ? '' : 's'} 🥒` : ''}
        </Text>
      </View>

      <Card>
        {r.mvp && <Award emoji="👑" label="MVP" value={`${r.mvp.name} (${r.mvp.wins}-${r.mvp.losses})`} />}
        {r.bestDuo && (
          <Award
            emoji="🤝"
            label="Best duo"
            value={`${r.bestDuo.names.join(' & ')} (${r.bestDuo.wins}-${r.bestDuo.losses})`}
          />
        )}
        {r.mostPickled && (
          <Award emoji="💀" label="Most pickled" value={`${r.mostPickled.names.join(' & ')} (×${r.mostPickled.times})`} />
        )}
      </Card>

      <Button
        label="📣 Share the recap"
        onPress={() => Share.share({ message: recapText(r, APP_LINK, HASHTAG) }).catch(() => {})}
      />

      <Label>Standings</Label>
      <Card>
        {r.standings.map((s, i) => (
          <View key={nameKey(s.name)} style={styles.row}>
            <Text style={styles.rank}>{i + 1}.</Text>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.record}>
              {s.wins}-{s.losses}
            </Text>
          </View>
        ))}
      </Card>

      {access.isPro ? (
        <Button label="📊 All-time stats" variant="secondary" onPress={() => router.replace('/stats')} />
      ) : (
        <Card style={{ borderWidth: 2, borderColor: colors.pink }}>
          <Text style={styles.name}>Who&apos;s really the best?</Text>
          <Text style={styles.muted}>
            Pro keeps everyone&apos;s all-time record: head-to-head, best partner and nemesis.
          </Text>
          <Button small variant="pink" label="See Pro" onPress={() => openPaywall('playerStats')} />
        </Card>
      )}
      <Button label="Done" variant="ghost" onPress={home} />
    </Screen>
  );
}

function Award({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.muted}>{label}</Text>
        <Text style={styles.name}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4 },
  title: { color: colors.pickle, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  sub: { color: colors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 12 },
  rank: { width: 28, color: colors.muted, fontSize: 16, fontWeight: '800' },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '800' },
  record: { color: colors.muted, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
