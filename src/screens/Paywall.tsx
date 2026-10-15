import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '../AppState';
import { PRIVACY_URL, TERMS_URL } from '../config';
import { PaywallReason, TRIAL_DAYS } from '../monetization/entitlements';
import { goBack } from '../navigation';
import {
  FALLBACK_PLANS,
  Plan,
  PlanId,
  joinWaitlist,
  loadPlans,
  purchasePro,
  restorePurchases,
  storeReady,
} from '../purchases';
import { Button, Card, Screen } from '../ui/components';
import { colors, radius } from '../ui/theme';

const HEADLINES: Record<PaywallReason, { emoji: string; title: string; sub: string }> = {
  trialEnded: {
    emoji: '⏰',
    title: 'Your Pro trial ended',
    sub: 'Your stats are all still saved. Keep Pro to keep the rivalries going.',
  },
  playerStats: {
    emoji: '⚔️',
    title: 'Settle it for good',
    sub: "Everyone's all-time record, head-to-head, best partner and nemesis.",
  },
  history: { emoji: '📜', title: 'Every game, forever', sub: 'Free keeps your latest 10. Pro keeps them all.' },
  rotation: {
    emoji: '🔄',
    title: 'Nobody sits out twice',
    sub: 'Fair rotation mixes partners every game, or let winners stay on.',
  },
  pack: { emoji: '🃏', title: 'Every pack. Every drop.', sub: 'All Party Packs today, plus new ones as they land.' },
  customCards: { emoji: '✏️', title: 'Your crew, your cards', sub: 'Put your inside jokes in the deck.' },
  upgrade: { emoji: '👑', title: 'PickleParty Pro', sub: 'For crews who play every week.' },
};

const BENEFITS = [
  ['⚔️', 'Player profiles', 'Head-to-head, best partner, nemesis'],
  ['🔄', 'Smart rotation', 'Fair sit-outs & new partners, or winners stay'],
  ['📜', 'Every game, forever', 'Free shows your latest 10'],
  ['🔥', 'Streaks & Hall of Shame', "Who's on fire, who keeps getting pickled"],
  ['🃏', 'Every Party Pack', 'Plus new packs as they drop'],
  ['✏️', 'Custom cards', "Your crew's inside jokes, in the deck"],
];

export function Paywall({ reason }: { reason: PaywallReason }) {
  const { access, applyStoreState } = useApp();
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [plan, setPlan] = useState<PlanId>('annual');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const live = storeReady();
  const head = HEADLINES[reason] ?? HEADLINES.upgrade;

  useEffect(() => {
    loadPlans().then(setPlans);
  }, []);

  const buy = async () => {
    setBusy(true);
    const result = await purchasePro(plan);
    setBusy(false);
    if (result.state) applyStoreState(result.state);
    if (result.cancelled) return;
    setMessage(result.message ?? null);
    if (result.ok) setTimeout(goBack, 900);
  };

  const restore = async () => {
    setBusy(true);
    const result = await restorePurchases();
    setBusy(false);
    if (result.state) applyStoreState(result.state);
    setMessage(result.message ?? null);
  };

  return (
    <Screen onBack={goBack} title=" ">
      <View style={styles.hero}>
        <Text style={{ fontSize: 64 }}>{head.emoji}</Text>
        <Text style={styles.title}>{head.title}</Text>
        <Text style={styles.sub}>{head.sub}</Text>
      </View>

      <Card>
        {BENEFITS.map(([emoji, name, detail]) => (
          <View key={name} style={styles.benefit}>
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitName}>{name}</Text>
              <Text style={styles.benefitDetail}>{detail}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.crew}>
          One phone runs the party, so your whole crew gets Pro whenever you play together.
        </Text>
      </Card>

      {access.source === 'subscription' ? (
        <Text style={styles.done}>👑 You&apos;re Pro. Thanks for supporting PickleParty!</Text>
      ) : live ? (
        <>
          <View style={{ gap: 10 }}>
            {plans.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setPlan(p.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: plan === p.id }}
                style={[styles.plan, plan === p.id && styles.planOn]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{p.title}</Text>
                  <Text style={styles.benefitDetail}>{p.detail}</Text>
                </View>
                {p.badge && <Text style={styles.badge}>{p.badge}</Text>}
                <Text style={styles.planPrice}>{p.price}</Text>
              </Pressable>
            ))}
          </View>
          <Button label={busy ? '…' : 'Continue'} onPress={buy} disabled={busy} />
          <Text style={styles.legal}>
            Subscriptions renew automatically until cancelled. Cancel anytime in your App Store or Google Play
            settings at least 24 hours before renewal.
          </Text>
          <View style={styles.links}>
            <Text style={styles.link} onPress={restore}>
              Restore purchases
            </Text>
            <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
              Terms
            </Text>
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
              Privacy
            </Text>
          </View>
        </>
      ) : (
        <Waitlist interest={reason} />
      )}

      {message && <Text style={styles.done}>{message}</Text>}
      {access.source === 'trial' && (
        <Text style={styles.trial}>
          You&apos;re on your free {TRIAL_DAYS}-day Pro trial: {access.trialDaysLeft} day
          {access.trialDaysLeft === 1 ? '' : 's'} left.
        </Text>
      )}
      <DevProToggle />
    </Screen>
  );
}

/** Before payments are live: measure real demand instead of guessing. */
function Waitlist({ interest }: { interest: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = async () => {
    setState('sending');
    setState((await joinWaitlist(email.trim(), interest)) ? 'done' : 'error');
  };

  if (state === 'done') {
    return <Text style={styles.done}>🎉 You&apos;re on the list. We&apos;ll email you when Pro launches.</Text>;
  }
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.sub}>Pro is launching soon. Get on the list to hear first.</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        style={styles.input}
      />
      <Button
        label={state === 'sending' ? '…' : 'Join the Pro waitlist'}
        onPress={submit}
        disabled={!valid || state === 'sending'}
      />
      {state === 'error' && <Text style={styles.error}>Couldn&apos;t sign you up. Check your connection.</Text>}
      <Text style={styles.legal}>We only use your email to tell you about PickleParty Pro.</Text>
    </View>
  );
}

/** Development builds only: flip Pro on/off to test both experiences. */
function DevProToggle() {
  const { access, applyStoreState, settings } = useApp();
  if (!__DEV__) return null;
  return (
    <Button
      small
      variant="ghost"
      label={`DEV: turn Pro ${access.source === 'subscription' ? 'off' : 'on'}`}
      onPress={() => applyStoreState({ pro: !settings.proCached, ownedPacks: [] })}
    />
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, marginBottom: 4 },
  title: { color: colors.pickle, fontSize: 30, fontWeight: '900', textAlign: 'center' },
  sub: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  benefit: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 4 },
  benefitName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  benefitDetail: { color: colors.muted, fontSize: 13 },
  crew: { color: colors.orange, fontSize: 13, fontWeight: '700', marginTop: 6 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: colors.surfaceHi,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: colors.surface,
  },
  planOn: { borderColor: colors.pickle },
  planTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  planPrice: { color: colors.text, fontSize: 16, fontWeight: '900' },
  badge: {
    color: colors.bg,
    backgroundColor: colors.pickle,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  legal: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  link: { color: colors.sky, fontSize: 13, fontWeight: '700' },
  done: { color: colors.pickle, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  trial: { color: colors.orange, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  input: {
    color: colors.text,
    fontSize: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceHi,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
