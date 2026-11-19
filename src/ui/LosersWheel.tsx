import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius } from './theme';

const SPIN_MS = 3000;

/**
 * Delays between ticks: quick at first, slowing right down at the end, adding
 * up to about SPIN_MS, so every spin feels the same length.
 */
function tickDelays(ticks: number): number[] {
  const weights = Array.from({ length: ticks }, (_, i) => 1 + 14 * (i / ticks) ** 3);
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (w / total) * SPIN_MS);
}

/**
 * The Loser's Wheel: flicks through the outcomes and lands on `landed`.
 * Calls `onDone` once it stops.
 */
export function LosersWheel({
  options,
  landed,
  onDone,
}: {
  options: string[];
  landed: number;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [turn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Go round twice, then on to the outcome it landed on.
    const delays = tickDelays(options.length * 2 + landed);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    delays.forEach((d, i) => {
      at += d;
      timers.push(setTimeout(() => setIndex((i + 1) % options.length), at));
    });
    timers.push(
      setTimeout(() => {
        setDone(true);
        onDone();
      }, at + 150),
    );
    Animated.timing(turn, {
      toValue: 1,
      duration: at,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    return () => timers.forEach(clearTimeout);
    // Runs once per spin; the parent mounts a new wheel for every spin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1440deg'] });
  return (
    <View style={styles.wrap}>
      <Animated.Text style={[styles.wheel, { transform: [{ rotate }] }]}>🎡</Animated.Text>
      <Text style={styles.title}>{done ? "The wheel has spoken!" : "Loser's Wheel"}</Text>
      <View style={[styles.slot, done && styles.slotDone]}>
        <Text style={[styles.option, done && styles.optionDone]}>{options[index]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  wheel: { fontSize: 72 },
  title: { color: colors.orange, fontSize: 28, fontFamily: font.bold, textAlign: 'center' },
  slot: {
    alignSelf: 'stretch',
    minHeight: 120,
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.surfaceHi,
    padding: 16,
  },
  slotDone: { borderColor: colors.orange },
  option: { color: colors.muted, fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 25 },
  optionDone: { color: colors.text, fontSize: 21, fontFamily: font.bold, lineHeight: 28 },
});
