import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Share, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { announce, hush } from '../audio/announcer';
import { APP_LINK, HASHTAG } from '../config';
import { CARD_KIND_LABEL, CUSTOM_PACK, Card, CardKind, PACKS, drawWithTeaser } from '../game/cards';
import { renderPenalty } from '../game/spice';
import { usableAnnouncer } from '../monetization/entitlements';
import { goBack, openPaywall } from '../navigation';
import { Button, Chip, Screen } from '../ui/components';
import { colors, radius } from '../ui/theme';

const KIND_STYLE: Record<CardKind, { label: string; color: string }> = {
  dare: { label: CARD_KIND_LABEL.dare.toUpperCase(), color: colors.pink },
  rule: { label: CARD_KIND_LABEL.rule.toUpperCase(), color: colors.orange },
  trick: { label: CARD_KIND_LABEL.trick.toUpperCase(), color: colors.sky },
  vote: { label: CARD_KIND_LABEL.vote.toUpperCase(), color: colors.pickle },
  court: { label: CARD_KIND_LABEL.court.toUpperCase(), color: colors.danger },
};

export function Deck() {
  const { settings, deck, courtRules, lockedCards, access } = useApp();
  const [drawn, setDrawn] = useState<{ card: Card; text: string; locked: boolean } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  // Court Rules only: play it like a card deck, keeping score yourselves.
  const [courtOnly, setCourtOnly] = useState(false);
  const pool = courtOnly ? courtRules : deck;
  const lockedPool = courtOnly ? lockedCards.filter((c) => c.kind === 'court') : lockedCards;
  const [flip] = useState(() => new Animated.Value(1));

  const draw = () => {
    const next = drawWithTeaser(pool, access.isPro ? [] : lockedPool, recent);
    if (!next) return;
    setRecent((r) => [next.card.id, ...r].slice(0, Math.floor(pool.length / 2)));
    flip.setValue(0);
    const text = renderPenalty(next.card.text, settings.spice);
    setDrawn({ card: next.card, text, locked: next.locked });
    announce(
      { emoji: '🃏', title: CARD_KIND_LABEL[next.card.kind], body: text, sound: 'whoosh' },
      { sound: settings.sound, voice: settings.voice, announcer: usableAnnouncer(settings.announcer, access) },
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
      <View style={styles.modes}>
        <Chip label="🃏 All cards" selected={!courtOnly} onPress={() => setCourtOnly(false)} />
        <Chip label="🌀 Court Rules only" selected={courtOnly} color={colors.danger} onPress={() => setCourtOnly(true)} />
      </View>
      {courtOnly && (
        <Text style={styles.muted}>
          No scorekeeping needed: deal a new Court Rule every 3 points. Break the rule and the other team wins the
          rally.
        </Text>
      )}
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
            Share.share({ message: `🃏 ${CARD_KIND_LABEL[drawn.card.kind]}: ${drawn.text}\n— PickleParty ${HASHTAG}\n${APP_LINK}` }).catch(() => {})
          }
        />
      )}
      <View style={styles.footer}>
        <Text style={styles.muted}>
          {pool.length} {courtOnly ? 'Court Rules' : 'cards'} in your deck
        </Text>
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
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muted: { color: colors.muted, fontSize: 14 },
  link: { color: colors.sky, fontSize: 14, fontWeight: '700' },
});
