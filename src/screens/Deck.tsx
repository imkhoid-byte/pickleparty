import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Share, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { announce, hush } from '../audio/announcer';
import { APP_LINK, HASHTAG } from '../config';
import { CUSTOM_PACK, Card, CardKind, PACKS, drawWithTeaser } from '../game/cards';
import { renderPenalty } from '../game/spice';
import { goBack, openPaywall } from '../navigation';
import { Button, Screen } from '../ui/components';
import { colors, radius } from '../ui/theme';

const KIND_STYLE: Record<CardKind, { label: string; color: string }> = {
  dare: { label: 'DARE', color: colors.pink },
  rule: { label: 'HOUSE RULE', color: colors.orange },
  trick: { label: 'TRICK SHOT', color: colors.sky },
  vote: { label: 'GROUP VOTE', color: colors.pickle },
};

export function Deck() {
  const { settings, deck, lockedCards, access } = useApp();
  const [drawn, setDrawn] = useState<{ card: Card; text: string; locked: boolean } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [flip] = useState(() => new Animated.Value(1));

  const draw = () => {
    const next = drawWithTeaser(deck, access.isPro ? [] : lockedCards, recent);
    if (!next) return;
    setRecent((r) => [next.card.id, ...r].slice(0, Math.floor(deck.length / 2)));
    flip.setValue(0);
    const text = renderPenalty(next.card.text, settings.spice);
    setDrawn({ card: next.card, text, locked: next.locked });
    announce(
      { emoji: '🃏', title: KIND_STYLE[next.card.kind].label.toLowerCase(), body: text, sound: 'whoosh' },
      { sound: settings.sound, voice: settings.voice },
    );
    Animated.spring(flip, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  useEffect(() => hush, []);

  const kind = drawn ? KIND_STYLE[drawn.card.kind] : null;
  const pack = drawn
    ? drawn.card.pack === 'custom'
      ? CUSTOM_PACK
      : PACKS.find((p) => p.id === drawn.card.pack)
    : null;
  const scale = flip.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const rotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] });

  return (
    <Screen title="Party Deck" onBack={goBack}>
      <Animated.View
        style={[
          styles.card,
          {
            borderColor: drawn?.locked ? colors.sky : (kind?.color ?? colors.surfaceHi),
            transform: [{ scale }, { rotate }],
            opacity: flip,
          },
        ]}
      >
        {drawn && kind ? (
          <>
            {drawn.locked && <Text style={styles.peek}>🔒 SNEAK PEEK</Text>}
            <Text style={[styles.kind, { color: kind.color }]}>{kind.label}</Text>
            <Text style={styles.text}>{drawn.text}</Text>
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

      {drawn?.locked && pack ? (
        <Button label={`🔓 Get ${pack.name} + every pack`} variant="secondary" onPress={() => openPaywall('pack')} />
      ) : null}
      <Button label={drawn ? 'Pass: draw another' : 'Draw a card'} onPress={draw} />
      {drawn && (
        <Button
          label="📣 Send to the group chat"
          variant="ghost"
          onPress={() =>
            Share.share({ message: `🃏 ${drawn.text}\n— PickleParty ${HASHTAG}\n${APP_LINK}` }).catch(() => {})
          }
        />
      )}
      <View style={styles.footer}>
        <Text style={styles.muted}>{deck.length} cards in your deck</Text>
        <Text style={styles.link} onPress={() => router.push('/packs')}>
          {access.isPro ? 'Choose packs →' : 'Get more packs →'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  peek: { color: colors.sky, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  kind: { fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  text: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 34 },
  pack: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  muted: { color: colors.muted, fontSize: 14 },
  link: { color: colors.sky, fontSize: 14, fontWeight: '700' },
});
