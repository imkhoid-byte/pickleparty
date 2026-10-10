import { useMemo, useRef, useState } from 'react';
import { Animated, Share, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { APP_LINK, HASHTAG } from '../config';
import { Card, CardKind, PACKS, cardsForPacks, drawCard } from '../game/cards';
import { renderPenalty } from '../game/spice';
import { Button, Screen } from '../ui/components';
import { colors, radius } from '../ui/theme';

const KIND_STYLE: Record<CardKind, { label: string; color: string }> = {
  dare: { label: 'DARE', color: colors.pink },
  rule: { label: 'HOUSE RULE', color: colors.orange },
  trick: { label: 'TRICK SHOT', color: colors.sky },
  vote: { label: 'GROUP VOTE', color: colors.pickle },
};

export function Deck({ back, openStore }: { back: () => void; openStore: () => void }) {
  const { settings } = useApp();
  const deck = useMemo(() => cardsForPacks(settings.activePacks), [settings.activePacks]);
  const [card, setCard] = useState<{ card: Card; text: string } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const flip = useRef(new Animated.Value(1)).current;

  const draw = () => {
    const next = drawCard(deck, recent);
    if (!next) return;
    setRecent((r) => [next.id, ...r].slice(0, Math.floor(deck.length / 2)));
    flip.setValue(0);
    setCard({ card: next, text: renderPenalty(next.text, settings.spice) });
    Animated.spring(flip, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  const kind = card ? KIND_STYLE[card.card.kind] : null;
  const pack = card ? PACKS.find((p) => p.id === card.card.pack) : null;
  const scale = flip.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const rotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] });

  return (
    <Screen title="Party Deck" onBack={back}>
      <Animated.View
        style={[
          styles.card,
          { borderColor: kind?.color ?? colors.surfaceHi, transform: [{ scale }, { rotate }], opacity: flip },
        ]}
      >
        {card && kind ? (
          <>
            <Text style={[styles.kind, { color: kind.color }]}>{kind.label}</Text>
            <Text style={styles.text}>{card.text}</Text>
            <Text style={styles.pack}>
              {pack?.emoji} {pack?.name}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 80 }}>🃏</Text>
            <Text style={styles.text}>Tap draw between games, on side-outs, or whenever the vibe dips.</Text>
          </>
        )}
      </Animated.View>

      <Button label={card ? 'Draw another' : 'Draw a card'} onPress={draw} />
      {card && (
        <Button
          label="📣 Send to the group chat"
          variant="secondary"
          onPress={() =>
            Share.share({ message: `🃏 ${card.text}\n— PickleParty ${HASHTAG}\n${APP_LINK}` }).catch(() => {})
          }
        />
      )}
      <View style={styles.footer}>
        <Text style={styles.muted}>
          {deck.length} cards from {settings.activePacks.length} pack{settings.activePacks.length === 1 ? '' : 's'}
        </Text>
        <Text style={styles.link} onPress={openStore}>
          Get more packs →
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  kind: { fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  text: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 34 },
  pack: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  muted: { color: colors.muted, fontSize: 14 },
  link: { color: colors.sky, fontSize: 14, fontWeight: '700' },
});
