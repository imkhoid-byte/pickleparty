import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '../AppState';
import { goBack } from '../navigation';
import { Button, Card, Screen } from '../ui/components';
import { colors, radius } from '../ui/theme';

const MAX_CARDS = 100;

export function MyCards() {
  const { settings, updateSettings } = useApp();
  const [draft, setDraft] = useState('');
  const cards = settings.customCards;

  const add = () => {
    const text = draft.trim();
    if (!text || cards.length >= MAX_CARDS) return;
    updateSettings({ customCards: [{ id: `${Date.now()}`, text }, ...cards] });
    setDraft('');
  };

  return (
    <Screen title="My Cards" onBack={goBack}>
      <Text style={styles.intro}>
        Write your crew&apos;s inside jokes. They get shuffled into every deck you play.
      </Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        multiline
        maxLength={160}
        placeholder="e.g. Whoever says 'my bad' next has to serve lefty."
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <Button label="Add card" onPress={add} disabled={!draft.trim() || cards.length >= MAX_CARDS} />
      {cards.map((c) => (
        <Card key={c.id}>
          <Text style={styles.text}>{c.text}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Button
              small
              variant="ghost"
              label="Delete"
              onPress={() => updateSettings({ customCards: cards.filter((x) => x.id !== c.id) })}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  input: {
    minHeight: 90,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceHi,
    borderRadius: radius.md,
    padding: 14,
    textAlignVertical: 'top',
  },
  text: { color: colors.text, fontSize: 18, fontWeight: '700' },
});
