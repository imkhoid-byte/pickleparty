import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { APP_LINK, HASHTAG } from '../config';
import { RRRound, maxCourts, nextRound, standings } from '../game/roundRobin';
import { goBack } from '../navigation';
import { Button, Card, Chip, Label, Screen } from '../ui/components';
import { colors, radius, teamColors } from '../ui/theme';

export function RoundRobin() {
  const [players, setPlayers] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [courts, setCourts] = useState(2);
  const [rounds, setRounds] = useState<RRRound[]>([]);

  const add = () => {
    const name = draft.trim();
    if (name && !players.some((p) => p.toLowerCase() === name.toLowerCase())) setPlayers([...players, name]);
    setDraft('');
  };

  if (rounds.length === 0) {
    const usable = Math.min(courts, maxCourts(players.length));
    return (
      <Screen title="Round Robin" onBack={goBack}>
        <Text style={styles.intro}>
          Add everyone at open play. We rotate partners, keep sit-outs fair and track who&apos;s winning.
        </Text>
        <Label>Players ({players.length})</Label>
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            placeholder="Player name"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            blurOnSubmit={false}
            maxLength={20}
            style={styles.input}
          />
          <Button label="Add" small onPress={add} disabled={!draft.trim()} />
        </View>
        <View style={styles.chips}>
          {players.map((p) => (
            <Chip key={p} label={`${p}  ✕`} selected onPress={() => setPlayers(players.filter((x) => x !== p))} />
          ))}
        </View>
        <Label>Courts</Label>
        <View style={styles.chips}>
          {[1, 2, 3, 4].map((n) => (
            <Chip key={n} label={String(n)} selected={courts === n} onPress={() => setCourts(n)} />
          ))}
        </View>
        <Text style={styles.intro}>
          {players.length < 4
            ? 'Add at least 4 players.'
            : `${usable} court${usable === 1 ? '' : 's'} in play, ${players.length - usable * 4} sitting out each round.`}
        </Text>
        <Button
          label="Start round 1"
          disabled={players.length < 4}
          onPress={() => setRounds([nextRound(players, courts, [])])}
        />
      </Screen>
    );
  }

  const current = rounds[rounds.length - 1];
  const table = standings(players, rounds);
  const allScored = current.matches.every((m) => m.winner !== null);

  const setWinner = (matchIndex: number, team: 0 | 1) => {
    setRounds((rs) =>
      rs.map((r, i) =>
        i !== rs.length - 1
          ? r
          : { ...r, matches: r.matches.map((m, j) => (j === matchIndex ? { ...m, winner: team } : m)) },
      ),
    );
  };

  const share = () => {
    const lines = table.slice(0, 5).map((s, i) => `${i + 1}. ${s.name} ${s.wins}-${s.losses}`);
    Share.share({
      message: `🏟️ Open play results (${rounds.length} rounds)\n${lines.join('\n')}\n${HASHTAG} ${APP_LINK}`,
    }).catch(() => {});
  };

  return (
    <Screen title={`Round ${rounds.length}`} onBack={goBack}>
      {current.matches.map((m, i) => (
        <Card key={m.court}>
          <Text style={styles.court}>COURT {m.court} · tap the winners</Text>
          {m.teams.map((team, t) => (
            <Pressable
              key={t}
              onPress={() => setWinner(i, t as 0 | 1)}
              accessibilityRole="button"
              style={[
                styles.team,
                m.winner === t && { borderColor: teamColors[t], backgroundColor: colors.surfaceHi },
              ]}
            >
              <Text style={[styles.teamText, { color: teamColors[t] }]}>{team.join(' & ')}</Text>
              {m.winner === t && <Text style={styles.teamText}>🏆</Text>}
            </Pressable>
          ))}
        </Card>
      ))}
      {current.byes.length > 0 && <Text style={styles.intro}>Sitting out: {current.byes.join(', ')}</Text>}

      <Button
        label={allScored ? `Start round ${rounds.length + 1}` : 'Enter all winners to continue'}
        disabled={!allScored}
        onPress={() => setRounds([...rounds, nextRound(players, courts, rounds)])}
      />

      <Label>Standings</Label>
      <Card>
        {table.map((s, i) => (
          <View key={s.name} style={styles.row}>
            <Text style={styles.rank}>{i + 1}.</Text>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.record}>
              {s.wins}-{s.losses}
            </Text>
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="📣 Share" variant="secondary" small style={{ flex: 1 }} onPress={share} />
        <Button label="End session" variant="ghost" small style={{ flex: 1 }} onPress={() => setRounds([])} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceHi,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  court: { color: colors.muted, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  team: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: colors.surfaceHi,
    borderRadius: radius.md,
    padding: 14,
  },
  teamText: { color: colors.text, fontSize: 18, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  rank: { width: 28, color: colors.muted, fontSize: 16, fontWeight: '800' },
  name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
  record: { color: colors.muted, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
