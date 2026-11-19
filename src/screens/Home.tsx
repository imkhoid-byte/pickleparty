import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { previewAnnouncer } from '../audio/announcer';
import { ANNOUNCERS } from '../audio/personas';
import { ANNOUNCER_ART } from '../ui/announcerArt';
import { packsInSeason } from '../game/cards';
import { SPICES, isAlcoholic } from '../game/spice';
import { leaderboard } from '../game/stats';
import { autoPaywall, canUseAnnouncer, canUsePack, usableAnnouncer } from '../monetization/entitlements';
import { openPaywall, openRounds } from '../navigation';
import { Button, Card, Chip, Label, Screen, Takeover, click, tap } from '../ui/components';
import { Appear, Breathe, Float, usePressScale } from '../ui/motion';
import { alpha, colors, font, radius } from '../ui/theme';

const LOGO = require('../../assets/brand/logo-badge-512.png');

export function Home() {
  const { settings, updateSettings, history, access, roundRobin } = useApp();
  const [askWild, setAskWild] = useState(false);
  const champ = leaderboard(history)[0];
  const pickles = history.filter((g) => g.pickled).length;
  // Free players hear Classic; their own pick comes back if they go Pro.
  const announcer = usableAnnouncer(settings.announcer, access);
  // After the trial, remind players of the cards they wrote (still saved, just out of the deck).
  const savedCards = settings.customCards.length;
  const waitingCards = !access.isPro && savedCards > 0;

  // The only automatic paywall: once, right after the free trial ends.
  useEffect(() => {
    const reason = autoPaywall(access, settings.trialEndedPaywallShown);
    if (reason) {
      updateSettings({ trialEndedPaywallShown: true });
      openPaywall(reason);
    }
  }, [access, settings.trialEndedPaywallShown, updateSettings]);

  return (
    <Screen>
      <View style={styles.hero}>
        {/* The logo bobs gently over a breathing glow. */}
        <View style={styles.logoWrap}>
          <Breathe style={styles.logoGlow} />
          <Float>
            <Image source={LOGO} style={styles.logo} accessibilityLabel="PickleParty" />
          </Float>
        </View>
        <Text style={styles.tagline}>Play hard. Cause chaos. Don&apos;t get pickled.</Text>
      </View>

      <ResumeBanner />
      <ProBadge />
      <SeasonalBanner />

      <Appear delay={80} style={styles.block}>
        <Button label="🏓  New Game" onPress={() => router.push('/setup')} />
        <Button label="🃏  Draw a Party Card" variant="pink" onPress={() => router.push('/deck')} />
      </Appear>
      <Appear delay={160} style={styles.grid}>
        <Tile emoji="🏆" label="Stats" onPress={() => router.push('/stats')} />
        <Tile
          emoji="🏟️"
          label={roundRobin?.rounds.length ? `Round ${roundRobin.rounds.length} live` : 'Round Robin'}
          onPress={() => (access.isPro ? router.push('/roundrobin') : openPaywall('roundRobin'))}
        />
        <Tile emoji="🎁" label="Packs" onPress={() => router.push('/packs')} />
        <Tile
          emoji={waitingCards ? '🔒' : '✏️'}
          label={waitingCards ? `${savedCards} card${savedCards === 1 ? '' : 's'} waiting` : 'My Cards'}
          onPress={() => (access.isPro ? router.push('/mycards') : openPaywall('customCards'))}
        />
      </Appear>

      <Appear delay={240} style={styles.block}>
      <Label>Spice level</Label>
      <Card style={styles.group}>
      <View style={styles.row}>
        {SPICES.filter((s) => settings.ageConfirmed || !isAlcoholic(s.id)).map((s) => (
          <Chip
            key={s.id}
            label={`${s.emoji} ${s.label}`}
            selected={settings.spice === s.id}
            color={s.id === 'wild' ? colors.orange : s.id === 'tipsy' ? colors.pink : colors.pickle}
            onPress={() => (s.id === 'wild' && settings.spice !== 'wild' ? setAskWild(true) : updateSettings({ spice: s.id }))}
          />
        ))}
      </View>
      <Text style={styles.muted}>{SPICES.find((s) => s.id === settings.spice)?.blurb}</Text>
      </Card>
      <Label>Announcer</Label>
      <Card style={styles.group}>
      <View style={styles.row}>
        <Chip label="🔊 Sound effects" selected={settings.sound} onPress={() => updateSettings({ sound: !settings.sound })} />
        <Chip label="🗣️ Voice" selected={settings.voice} onPress={() => updateSettings({ voice: !settings.voice })} />
        <Chip label="👆 Tap sounds" selected={settings.uiSounds} onPress={() => updateSettings({ uiSounds: !settings.uiSounds })} />
      </View>
      {settings.voice && (
        <View style={styles.row}>
          {ANNOUNCERS.map((a) => {
            const locked = !canUseAnnouncer(a.id, access);
            return (
              <Chip
                key={a.id}
                label={ANNOUNCER_ART[a.id] ? `${locked ? '🔒 ' : ''}${a.label}` : `${locked ? '🔒' : a.emoji} ${a.label}`}
                icon={ANNOUNCER_ART[a.id]?.image}
                selected={announcer === a.id}
                color={colors.sky}
                onPress={() => {
                  // A locked voice still plays its sample, then offers Pro.
                  previewAnnouncer(a.id);
                  if (locked) openPaywall('voices');
                  else updateSettings({ announcer: a.id });
                }}
              />
            );
          })}
        </View>
      )}
      <Text style={styles.muted}>
        {settings.voice
          ? `${ANNOUNCERS.find((a) => a.id === announcer)?.blurb ?? ''} Calls out the drinks, the rotations and the workouts by name. Tap one to hear it.`
          : 'Calls out the drinks, the rotations and the workouts by name, so nobody has to check the phone.'}
      </Text>
      </Card>
      {!settings.ageConfirmed && (
        <Text style={styles.link} onPress={() => updateSettings({ ageAsked: false })}>
          21+? Unlock drinking modes
        </Text>
      )}

      {history.length > 0 && (
        <View style={styles.stats}>
          <Stat value={history.length} label="games" />
          <Stat value={pickles} label="pickles 🥒" />
          <Stat value={champ ? champ.name : '—'} label="top dog" />
        </View>
      )}
      </Appear>
      <Takeover
        visible={askWild}
        emoji="🔥"
        title="Wild is for couples"
        body="Each team is a couple. Every penalty is a drink plus a flirty act with your own partner, never anyone else. Anyone can skip an act, no questions asked. Is everyone playing on board?"
        accent={colors.orange}
        onClose={() => setAskWild(false)}
      >
        <Button
          label="We're all in 🔥"
          variant="pink"
          onPress={() => {
            updateSettings({ spice: 'wild' });
            setAskWild(false);
          }}
        />
        <Button label="Keep it Tipsy" variant="ghost" onPress={() => setAskWild(false)} />
      </Takeover>
    </Screen>
  );
}

/** A drinking game in progress (the page reloaded, or someone went back): pick it back up. */
function ResumeBanner() {
  const { rounds, setRounds } = useApp();
  const [now] = useState(() => Date.now());
  // Older than half a day, it's not the same night any more.
  if (!rounds || now - rounds.startedAt > 12 * 60 * 60 * 1000) return null;
  return (
    <View style={styles.resume}>
      <Pressable
        onPress={() => openRounds()}
        style={styles.resumeMain}
        accessibilityRole="button"
        accessibilityLabel={`Back to the drinking game, round ${rounds.rounds.length + 1}`}
      >
        <Text style={styles.resumeTitle}>▶ Back to King of the Court</Text>
        <Text style={styles.resumeScore} numberOfLines={1}>
          Round {rounds.rounds.length + 1} · {rounds.players.length} players
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setRounds(null)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="End that game"
        style={styles.resumeClose}
      >
        <Text style={styles.resumeCloseText}>✕</Text>
      </Pressable>
    </View>
  );
}

/** Promote a seasonal pack (e.g. Halloween in October) until it's in the deck. */
function SeasonalBanner() {
  const { settings, access } = useApp();
  const [month] = useState(() => new Date().getMonth());
  const pack = packsInSeason(month).find(
    (p) => !(settings.activePacks.includes(p.id) && canUsePack(p.id, access, settings.unlockedPacks)),
  );
  if (!pack) return null;
  return (
    <Pressable
      onPress={() => router.push('/packs')}
      style={[styles.badge, { borderColor: colors.orange, backgroundColor: colors.surface }]}
      accessibilityRole="button"
    >
      <Text style={styles.badgeText}>
        {pack.emoji} New: the {pack.name} pack is here!
      </Text>
      <Text style={[styles.badgeText, { color: colors.orange }]}>Get it →</Text>
    </Pressable>
  );
}

function ProBadge() {
  const { access } = useApp();
  if (access.source === 'subscription') {
    return <Text style={[styles.badgeText, { textAlign: 'center' }]}>👑 PickleParty Pro</Text>;
  }
  const trial = access.source === 'trial';
  return (
    <Pressable
      onPress={() => openPaywall('upgrade')}
      style={[styles.badge, { borderColor: trial ? colors.orange : colors.pink }]}
      accessibilityRole="button"
    >
      <Text style={styles.badgeText}>
        {trial
          ? `👑 Pro trial: ${access.trialDaysLeft} day${access.trialDaysLeft === 1 ? '' : 's'} left`
          : '👑 Go Pro: crew stats, round robins & every pack'}
      </Text>
      <Text style={[styles.badgeText, { color: trial ? colors.orange : colors.pink }]}>
        {trial ? 'Keep it →' : 'See →'}
      </Text>
    </Pressable>
  );
}

/** One of the four places to go from home: an icon in a soft square, and its name. */
function Tile({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  const press = usePressScale(0.95);
  return (
    <Animated.View style={[styles.tileWrap, { transform: [{ scale: press.scale }] }]}>
      <Pressable
        onPress={() => {
          tap();
          click();
          onPress();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.tile}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.tileIcon}>
          <Text style={styles.tileEmoji}>{emoji}</Text>
        </View>
        <Text style={styles.tileLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 4 },
  logoWrap: { width: 230, height: 230, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 230, height: 230 },
  // A soft pickle-green light behind the logo.
  logoGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: alpha(colors.pickle, 0.2),
    boxShadow: `0px 0px 70px 30px ${alpha(colors.pickle, 0.28)}`,
  },
  tagline: { color: colors.muted, fontSize: 17, fontFamily: font.medium, marginTop: 4, textAlign: 'center' },
  block: { gap: 14 },
  group: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tileWrap: { flexBasis: '46%', flexGrow: 1 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 64,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
  },
  tileEmoji: { fontSize: 20 },
  tileLabel: { flex: 1, color: colors.text, fontSize: 16, fontFamily: font.semi },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pickle,
    borderRadius: radius.md,
  },
  resumeMain: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, gap: 2 },
  resumeTitle: { color: colors.bg, fontSize: 17, fontFamily: font.bold },
  resumeScore: { color: colors.bg, fontSize: 14, fontWeight: '700' },
  resumeClose: { paddingHorizontal: 16, paddingVertical: 12 },
  resumeCloseText: { color: colors.bg, fontSize: 18, fontFamily: font.bold },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muted: { color: colors.muted, fontSize: 14 },
  link: { color: colors.sky, fontSize: 14, fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  badgeText: { color: colors.text, fontSize: 14, fontFamily: font.semi, flexShrink: 1 },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 16,
    marginTop: 8,
  },
  statValue: { color: colors.text, fontSize: 22, fontFamily: font.bold },
});
