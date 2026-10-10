import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { PACKS, PackId } from '../game/cards';
import { purchasePack, restorePurchases } from '../purchases';
import { Button, Card, Screen } from '../ui/components';
import { colors } from '../ui/theme';

export function Store({ back }: { back: () => void }) {
  const { settings, updateSettings } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<PackId | 'restore' | null>(null);

  const unlocked = (id: PackId) => settings.unlockedPacks.includes(id);
  const active = (id: PackId) => settings.activePacks.includes(id);

  const buy = async (id: PackId) => {
    setBusy(id);
    const result = await purchasePack(id);
    setBusy(null);
    setMessage(result.message ?? null);
    if (result.ok) {
      updateSettings({
        unlockedPacks: [...new Set([...settings.unlockedPacks, id])],
        activePacks: [...new Set([...settings.activePacks, id])],
      });
    }
  };

  const restore = async () => {
    setBusy('restore');
    const owned = await restorePurchases();
    setBusy(null);
    updateSettings({ unlockedPacks: [...new Set([...settings.unlockedPacks, ...owned])] });
    setMessage(owned.length ? `Restored ${owned.length} pack(s).` : 'No previous purchases found.');
  };

  const toggle = (id: PackId) => {
    const next = active(id) ? settings.activePacks.filter((p) => p !== id) : [...settings.activePacks, id];
    if (next.length > 0) updateSettings({ activePacks: next });
  };

  return (
    <Screen title="Party Packs" onBack={back}>
      <Text style={styles.intro}>Stack packs to build your deck. Toggle them on and off any time.</Text>
      {PACKS.map((p) => (
        <Card key={p.id} style={active(p.id) ? { borderWidth: 2, borderColor: colors.pickle } : undefined}>
          <View style={styles.row}>
            <Text style={{ fontSize: 40 }}>{p.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.desc}>{p.description}</Text>
            </View>
          </View>
          {unlocked(p.id) ? (
            <Button
              small
              label={active(p.id) ? '✓ In your deck' : 'Add to deck'}
              variant={active(p.id) ? 'secondary' : 'primary'}
              onPress={() => toggle(p.id)}
            />
          ) : (
            <Button
              small
              variant="pink"
              label={busy === p.id ? '…' : `Unlock ${p.price ?? ''}`}
              disabled={busy !== null}
              onPress={() => buy(p.id)}
            />
          )}
        </Card>
      ))}
      {message && <Text style={styles.message}>{message}</Text>}
      <Button label="Restore purchases" variant="ghost" small onPress={restore} disabled={busy !== null} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 15 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 6 },
  name: { color: colors.text, fontSize: 20, fontWeight: '900' },
  desc: { color: colors.muted, fontSize: 14, marginTop: 2 },
  message: { color: colors.pickle, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
