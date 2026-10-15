import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '../AppState';
import { drawCard } from '../game/cards';
import { nameKey } from '../game/players';
import { planMatchup } from '../game/rotation';
import { Format } from '../game/scoring';
import { goBack, openPaywall } from '../navigation';
import type { RotationMode } from '../storage';
import { Button, Chip, Label, Screen } from '../ui/components';
import { colors, radius } from '../ui/theme';

const ROTATIONS: { id: RotationMode; label: string; blurb: string; pro: boolean }[] = [
  { id: 'mix', label: '🔄 Fair rotation', blurb: 'Everyone plays the same amount, with new partners each game.', pro: true },
  { id: 'winnersStay', label: '👑 Winners stay', blurb: 'Winners hold the court for up to 2 games.', pro: true },
  { id: 'random', label: '🎲 Random', blurb: 'Shuffle teams each game.', pro: false },
];

export function NewParty() {
  const { settings, access, deck, setSession, rememberPlayers } = useApp();
  const [present, setPresent] = useState<string[]>(() => settings.crew.slice(0, 4));
  const [draft, setDraft] = useState('');
  const [format, setFormat] = useState<Format>('doubles');
  const [target, setTarget] = useState(11);
  const [rotation, setRotation] = useState<RotationMode>(access.isPro ? 'mix' : 'random');

  const isHere = (n: string) => present.some((p) => nameKey(p) === nameKey(n));
  const toggle = (n: string) => setPresent(isHere(n) ? present.filter((p) => nameKey(p) !== nameKey(n)) : [...present, n]);
  const add = () => {
    const name = draft.trim();
    if (name && !isHere(name)) setPresent([...present, name]);
    setDraft('');
  };

  const teamSize = format === 'doubles' ? 2 : 1;
  const enough = present.length >= teamSize * 2;
  // People who are here but not saved yet show up as chips too.
  const roster = [...present.filter((p) => !settings.crew.some((c) => nameKey(c) === nameKey(p))), ...settings.crew];

  const start = () => {
    const now = Date.now();
    rememberPlayers(present);
    setSession({
      id: `party-${now}`,
      startedAt: now,
      present,
      format,
      target,
      rotation,
      upNext: planMatchup(rotation, access.isPro, present, [], teamSize),
      houseRuleId: drawCard(deck.filter((c) => c.kind === 'rule'))?.id ?? null,
      revealedGameId: null,
    });
    router.replace('/party');
  };

  return (
    <Screen title="New Party" onBack={goBack}>
      <Label>Who&apos;s playing? ({present.length})</Label>
      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder="Add a name"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          submitBehavior="submit"
          maxLength={20}
          style={styles.input}
        />
        <Button label="Add" small onPress={add} disabled={!draft.trim()} />
      </View>
      <View style={styles.chips}>
        {roster.map((n) => (
          <Chip key={nameKey(n)} label={n} selected={isHere(n)} onPress={() => toggle(n)} />
        ))}
      </View>
      {roster.length === 0 && (
        <Text style={styles.hint}>Add everyone at the court. Next time they&apos;ll be one tap away.</Text>
      )}

      <Label>Format</Label>
      <View style={styles.chips}>
        <Chip label="Doubles" selected={format === 'doubles'} onPress={() => setFormat('doubles')} />
        <Chip label="Singles" selected={format === 'singles'} onPress={() => setFormat('singles')} />
      </View>

      <Label>Games to</Label>
      <View style={styles.chips}>
        {[7, 9, 11, 15, 21].map((n) => (
          <Chip key={n} label={String(n)} selected={target === n} onPress={() => setTarget(n)} />
        ))}
      </View>

      <Label>Who plays next?</Label>
      <View style={{ gap: 8 }}>
        {ROTATIONS.map((r) => {
          const locked = r.pro && !access.isPro;
          return (
            <Chip
              key={r.id}
              label={`${r.label}${locked ? '  🔒' : ''}`}
              selected={rotation === r.id}
              onPress={() => (locked ? openPaywall('rotation') : setRotation(r.id))}
            />
          );
        })}
      </View>
      <Text style={styles.hint}>{ROTATIONS.find((r) => r.id === rotation)?.blurb}</Text>

      <Button
        label={enough ? "Let's party 🥒" : `Need ${teamSize * 2 - present.length} more player${teamSize * 2 - present.length === 1 ? '' : 's'}`}
        onPress={start}
        disabled={!enough}
        style={{ marginTop: 8 }}
      />
      <Text style={styles.hint}>
        Play like you normally do. Leave the phone on the bench and enter the score after each game.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
