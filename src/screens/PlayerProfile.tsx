import { Share, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { APP_LINK, HASHTAG } from '../config';
import { VsRecord, profile, winPct } from '../game/players';
import { goBack } from '../navigation';
import { Button, Card, Label, Screen } from '../ui/components';
import { colors } from '../ui/theme';

/** Pro: everything about one player. */
export function PlayerProfile({ name }: { name: string }) {
  const { history } = useApp();
  const p = profile(history, name);

  if (!p) {
    return (
      <Screen title="Player" onBack={goBack}>
        <Text style={styles.muted}>No games for {name} yet.</Text>
      </Screen>
    );
  }
  const r = p.record;
  const diff = r.pointsFor - r.pointsAgainst;

  const share = () => {
    const lines = [
      `🥒 ${r.name} on PickleParty: ${r.wins}-${r.losses} (${Math.round(winPct(r) * 100)}%)`,
      p.bestPartner && `🤝 Best partner: ${p.bestPartner.name}`,
      p.nemesis && `😈 Nemesis: ${p.nemesis.name}`,
      p.streak.best > 1 && `🔥 Best streak: ${p.streak.best}`,
      `${HASHTAG} ${APP_LINK}`,
    ].filter(Boolean);
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  return (
    <Screen title={r.name} onBack={goBack}>
      <View style={styles.hero}>
        <Text style={styles.big}>
          {r.wins}-{r.losses}
        </Text>
        <Text style={styles.sub}>
          {Math.round(winPct(r) * 100)}% wins · {diff >= 0 ? '+' : ''}
          {diff} points · {r.games} games
        </Text>
      </View>

      <Card>
        <Fact emoji="🔥" label="Win streak" value={`${p.streak.current} now · best ${p.streak.best}`} />
        <Fact emoji="🤝" label="Best partner" value={vs(p.bestPartner) ?? 'Play more with the same partner'} />
        <Fact emoji="😈" label="Nemesis" value={vs(p.nemesis) ?? 'Nobody has your number (yet)'} />
        <Fact emoji="🎯" label="Favorite victim" value={vs(p.favoriteVictim) ?? '—'} />
        <Fact emoji="🥒" label="Pickles" value={`served ${r.pickledOthers} · got ${r.gotPickled}`} />
      </Card>

      {p.opponents.length > 0 && (
        <>
          <Label>Head-to-head</Label>
          <Card>
            {p.opponents.map((o) => (
              <Row key={o.name} r={o} />
            ))}
          </Card>
        </>
      )}
      {p.partners.length > 0 && (
        <>
          <Label>As partners</Label>
          <Card>
            {p.partners.map((o) => (
              <Row key={o.name} r={o} />
            ))}
          </Card>
        </>
      )}
      <Button label="📣 Share this card" variant="secondary" onPress={share} />
    </Screen>
  );
}

const vs = (r: VsRecord | null) => (r ? `${r.name} (${r.wins}-${r.losses})` : null);

function Fact({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.muted}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

function Row({ r }: { r: VsRecord }) {
  const color = r.wins > r.losses ? colors.pickle : r.wins < r.losses ? colors.pink : colors.text;
  return (
    <View style={styles.row}>
      <Text style={styles.value}>{r.name}</Text>
      <Text style={[styles.record, { color }]}>
        {r.wins}-{r.losses}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 2 },
  big: { color: colors.pickle, fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'] },
  sub: { color: colors.text, fontSize: 15, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 12 },
  value: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '800' },
  record: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
