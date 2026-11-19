import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '../AppState';
import { APP_LINK, HASHTAG } from '../config';
import { RRLink, addPlayer, maxCourts, nextRound, pairName, recordResult, standings } from '../game/roundRobin';
import { goBack } from '../navigation';
import { Button, Card, Chip, Label, Screen, Takeover } from '../ui/components';
import { colors, font, radius, teamColors } from '../ui/theme';

export function RoundRobin() {
  const { roundRobin } = useApp();
  return roundRobin && roundRobin.rounds.length > 0 ? <Session /> : <NewSession />;
}

/** Someone sitting out runs the phone, taking turns from round to round. */
const hypeMan = (byes: string[], round: number) => byes[round % byes.length];

/** Add the players, pick courts and game length, start round 1. */
function NewSession() {
  const { setRoundRobin } = useApp();
  const [players, setPlayers] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [courts, setCourts] = useState(2);
  const [target, setTarget] = useState(11);

  const add = () => {
    const name = draft.trim();
    if (name && !players.some((p) => p.toLowerCase() === name.toLowerCase())) setPlayers([...players, name]);
    setDraft('');
  };
  const start = () => {
    const first = nextRound(players, courts, []);
    setRoundRobin(() => ({ players, courts, target, rounds: [first] }));
  };
  const usable = Math.min(courts, maxCourts(players.length));

  return (
    <Screen title="Round Robin" onBack={goBack}>
      <Text style={styles.intro}>
        For open play with a crowd. Add everyone who&apos;s playing: each round we pair up new partners, keep
        sit-outs fair and rank every player.
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
      <Label>Games to</Label>
      <View style={styles.chips}>
        {[7, 11, 15].map((n) => (
          <Chip key={n} label={String(n)} selected={target === n} onPress={() => setTarget(n)} />
        ))}
      </View>
      <Text style={styles.intro}>
        {players.length < 4
          ? 'Add at least 4 players.'
          : `${usable} court${usable === 1 ? '' : 's'} in play, ${players.length - usable * 4} sitting out each round.`}
      </Text>
      <Button label="Start round 1" disabled={players.length < 4} onPress={start} />
    </Screen>
  );
}

/** The session in progress. Saved on the phone, so leaving this screen doesn't lose it. */
function Session() {
  const { roundRobin, setRoundRobin } = useApp();
  const [late, setLate] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  if (!roundRobin) return null;
  const { players, rounds, target } = roundRobin;
  const roundIndex = rounds.length - 1;
  const current = rounds[roundIndex];
  const table = standings(players, rounds);
  const allScored = current.matches.every((m) => m.winner !== null);
  const newcomers = players.filter((p) => !rounds.some((r) => r.byes.includes(p) || r.matches.some((m) => m.teams.flat().includes(p))));

  const setWinner = (matchIndex: number, team: 0 | 1) => {
    const m = current.matches[matchIndex];
    const link: RRLink = { round: roundIndex, match: matchIndex };
    setRoundRobin((rr) => (rr ? recordResult(rr, link, [pairName(m.teams[0]), pairName(m.teams[1])], team) : rr));
  };
  const nextUp = () => {
    const next = nextRound(players, roundRobin.courts, rounds);
    setRoundRobin((rr) => (rr ? { ...rr, rounds: [...rr.rounds, next] } : rr));
  };
  const addLate = () => {
    setRoundRobin((rr) => (rr ? addPlayer(rr, late) : rr));
    setLate('');
  };
  const share = () => {
    const lines = table.slice(0, 5).map((s, i) => `${i + 1}. ${s.name} ${s.wins}-${s.losses}`);
    Share.share({
      message: `🏟️ Open play results (${rounds.length} rounds)\n${lines.join('\n')}\n${HASHTAG} ${APP_LINK}`,
    }).catch(() => {});
  };

  return (
    <Screen title={`Round ${rounds.length}`} onBack={goBack}>
      <Text style={styles.intro}>
        Play each court&apos;s game to {target}, then tap the winning pair.
      </Text>
      {current.matches.map((m, i) => (
        <Card key={m.court}>
          <Text style={styles.court}>COURT {m.court}</Text>
          {m.teams.map((team, t) => (
            <Pressable
              key={t}
              onPress={() => setWinner(i, t as 0 | 1)}
              accessibilityRole="button"
              accessibilityLabel={`${pairName(team)} won`}
              style={[
                styles.team,
                m.winner === t && { borderColor: teamColors[t], backgroundColor: colors.surfaceHi },
              ]}
            >
              <Text style={[styles.teamText, { color: teamColors[t] }]}>{pairName(team)}</Text>
              <Text style={styles.teamText}>
                {m.score ? m.score[t] : ''}
                {m.winner === t ? ' 🏆' : ''}
              </Text>
            </Pressable>
          ))}
          {m.winner !== null && <Text style={styles.hint}>Tap the other pair to change it.</Text>}
        </Card>
      ))}
      {current.byes.length > 0 && (
        <Card>
          <Text style={styles.hype}>📱 Hype Man: {hypeMan(current.byes, roundIndex)}</Text>
          <Text style={styles.intro}>
            Sitting out this round? You run the phone: score the game, call the moments and draw the cards.
            {current.byes.length > 1 ? ` Also sitting out: ${current.byes.filter((p) => p !== hypeMan(current.byes, roundIndex)).join(', ')}.` : ''}
          </Text>
        </Card>
      )}

      <Button
        label={allScored ? `Start round ${rounds.length + 1}` : 'Finish every court to continue'}
        disabled={!allScored}
        onPress={nextUp}
      />

      <Label>Standings</Label>
      <Card>
        {table.map((s, i) => (
          <View key={s.name} style={styles.row}>
            <Text style={styles.rank}>{i + 1}.</Text>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.record}>
              {newcomers.includes(s.name) ? 'next round' : `${s.wins}-${s.losses}`}
            </Text>
          </View>
        ))}
      </Card>

      <Label>Someone just showed up?</Label>
      <View style={styles.addRow}>
        <TextInput
          value={late}
          onChangeText={setLate}
          onSubmitEditing={addLate}
          placeholder="Player name"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          maxLength={20}
          style={styles.input}
        />
        <Button label="Add" small onPress={addLate} disabled={!late.trim()} />
      </View>
      <Text style={styles.hint}>They join from the next round.</Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="📣 Share" variant="secondary" small style={{ flex: 1 }} onPress={share} />
        <Button label="End session" variant="ghost" small style={{ flex: 1 }} onPress={() => setConfirmEnd(true)} />
      </View>

      <Takeover
        visible={confirmEnd}
        emoji="🏁"
        title="End the session?"
        body="The standings will be cleared. Share them first if you want to keep a record."
        accent={colors.pink}
        onClose={() => setConfirmEnd(false)}
      >
        <Button
          label="📣 Share standings"
          variant="secondary"
          onPress={share}
        />
        <Button
          label="End it"
          variant="pink"
          onPress={() => {
            setConfirmEnd(false);
            setRoundRobin(() => null);
          }}
        />
        <Button label="Keep playing" variant="ghost" onPress={() => setConfirmEnd(false)} />
      </Takeover>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  hype: { color: colors.pickle, fontSize: 18, fontFamily: font.bold },
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
  court: { color: colors.muted, fontSize: 12, fontFamily: font.bold, letterSpacing: 1.5 },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  team: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: colors.surfaceHi,
    borderRadius: radius.md,
    padding: 14,
  },
  teamText: { color: colors.text, fontSize: 18, fontFamily: font.bold },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  rank: { width: 28, color: colors.muted, fontSize: 16, fontFamily: font.semi },
  name: { flex: 1, color: colors.text, fontSize: 16, fontFamily: font.semi },
  record: { color: colors.muted, fontSize: 16, fontFamily: font.semi, fontVariant: ['tabular-nums'] },
});
