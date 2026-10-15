import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { PACKS, Pack, PackId } from '../game/cards';
import { canUsePack } from '../monetization/entitlements';
import { goBack, openPaywall } from '../navigation';
import { purchasePack, restorePurchases, storeReady } from '../purchases';
import { Button, Card, Screen, Takeover } from '../ui/components';
import { colors } from '../ui/theme';

export function Store() {
  const { settings, updateSettings, access, applyStoreState } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<PackId | 'restore' | null>(null);
  const [askConsent, setAskConsent] = useState(false);

  const packs = PACKS.filter((p) => !p.adult || settings.ageConfirmed);
  const usable = (id: PackId) => canUsePack(id, access, settings.unlockedPacks);
  const active = (id: PackId) => settings.activePacks.includes(id);
  const owned = (id: PackId) => settings.unlockedPacks.includes(id);

  const setActive = (id: PackId, on: boolean) => {
    const next = on ? [...new Set([...settings.activePacks, id])] : settings.activePacks.filter((p) => p !== id);
    if (next.length > 0) updateSettings({ activePacks: next });
  };

  const toggle = (pack: Pack) => {
    // Ask every time it's switched on: the group at the court may have changed.
    if (!active(pack.id) && pack.adult) {
      setAskConsent(true);
      return;
    }
    setActive(pack.id, !active(pack.id));
  };

  const buy = async (id: PackId) => {
    setBusy(id);
    const result = await purchasePack(id);
    setBusy(null);
    if (result.state) applyStoreState(result.state);
    if (result.cancelled) return;
    setMessage(result.message ?? null);
    if (result.ok && !PACKS.find((p) => p.id === id)?.adult) setActive(id, true);
  };

  const restore = async () => {
    setBusy('restore');
    const result = await restorePurchases();
    setBusy(null);
    if (result.state) applyStoreState(result.state);
    setMessage(result.message ?? null);
  };

  return (
    <Screen title="Party Packs" onBack={goBack}>
      {!access.isPro && (
        <Pressable onPress={() => openPaywall('pack')} accessibilityRole="button">
          <Card style={{ borderWidth: 2, borderColor: colors.pink }}>
            <Text style={styles.name}>👑 Every pack with Pro</Text>
            <Text style={styles.desc}>All packs + new drops, crew stats, round robins and custom cards.</Text>
            <Text style={[styles.desc, { color: colors.pink, fontWeight: '800' }]}>See Pro →</Text>
          </Card>
        </Pressable>
      )}
      <Text style={styles.intro}>Stack packs to build your deck. Toggle them on and off any time.</Text>
      {packs.map((p) => {
        const canUse = usable(p.id);
        const on = active(p.id) && canUse;
        return (
          <Card key={p.id} style={on ? { borderWidth: 2, borderColor: colors.pickle } : undefined}>
            <View style={styles.row}>
              <Text style={{ fontSize: 40 }}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                {p.season && <Text style={styles.season}>{p.season.badge}</Text>}
                <Text style={styles.desc}>{p.description}</Text>
                {p.premium && canUse && !owned(p.id) && (
                  <Text style={styles.tag}>{access.source === 'trial' ? 'Included in your trial' : 'Included with Pro'}</Text>
                )}
              </View>
            </View>
            {canUse ? (
              <Button
                small
                label={on ? '✓ In your deck' : 'Add to deck'}
                variant={on ? 'secondary' : 'primary'}
                onPress={() => toggle(p)}
              />
            ) : storeReady() ? (
              <Button
                small
                variant="pink"
                label={busy === p.id ? '…' : `Unlock ${p.price ?? ''}`}
                disabled={busy !== null}
                onPress={() => buy(p.id)}
              />
            ) : (
              <Button small variant="pink" label="🔒 Get it with Pro" onPress={() => openPaywall('pack')} />
            )}
          </Card>
        );
      })}
      {message && <Text style={styles.message}>{message}</Text>}
      {storeReady() && (
        <Button label="Restore purchases" variant="ghost" small onPress={restore} disabled={busy !== null} />
      )}

      <Takeover
        visible={askConsent}
        emoji="💋"
        title="Date Night rules"
        body="These cards are for couples. Every dare only involves your own partner, and anyone can Pass any card, no questions asked. Is everyone playing on board?"
        accent={colors.pink}
        onClose={() => setAskConsent(false)}
      >
        <Button
          label="We're all in"
          variant="pink"
          onPress={() => {
            updateSettings({
              dateNightConsent: true,
              activePacks: [...new Set([...settings.activePacks, 'datenight' as PackId])],
            });
            setAskConsent(false);
          }}
        />
        <Button label="Not tonight" variant="ghost" onPress={() => setAskConsent(false)} />
      </Takeover>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 15 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 6 },
  name: { color: colors.text, fontSize: 20, fontWeight: '900' },
  desc: { color: colors.muted, fontSize: 14, marginTop: 2 },
  season: { color: colors.orange, fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginTop: 2 },
  tag: { color: colors.orange, fontSize: 12, fontWeight: '800', marginTop: 4 },
  message: { color: colors.pickle, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
