// Motion, kept small on purpose: a handful of primitives that only ever animate
// transform and opacity (cheap everywhere, and off the JS thread in the app), each
// short and with one job. With the phone's Reduce Motion setting on, they all jump
// straight to their end state.

import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';

import { colors } from './theme';

/** Animations run natively in the app; browsers have no native driver. */
const NATIVE = Platform.OS !== 'web';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((on) => {
    reduceMotion = on;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
  reduceMotion = on;
});

const EASE_OUT = Easing.out(Easing.cubic);

/** Content easing in as it arrives: a short fade and rise. `delay` staggers a group. */
export function Appear({
  children,
  delay = 0,
  rise = 14,
  style,
}: {
  children: ReactNode;
  delay?: number;
  /** How far it travels up, in points (0 for a plain fade). */
  rise?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(1);
      return;
    }
    const run = Animated.timing(v, { toValue: 1, duration: 380, delay, easing: EASE_OUT, useNativeDriver: NATIVE });
    run.start();
    return () => run.stop();
  }, [v, delay]);
  return (
    <Animated.View
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

/** Something landing with a little bounce (a pop-up's card, an emoji, a result). */
export function PopIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(1);
      return;
    }
    const run = Animated.spring(v, { toValue: 1, delay, friction: 7, tension: 90, useNativeDriver: NATIVE });
    run.start();
    return () => run.stop();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * A press you can see: the scale to drive an Animated.View with, and the handlers
 * that spring it down while a finger is on it.
 */
export function usePressScale(to = 0.96) {
  const [scale] = useState(() => new Animated.Value(1));
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, friction: 6, tension: 220, useNativeDriver: NATIVE }).start();
  return {
    scale,
    onPressIn: () => !reduceMotion && spring(to),
    onPressOut: () => !reduceMotion && spring(1),
  };
}

/** A value that pops when it changes (a score going up, a chip being picked). */
export function Pop({ trigger, children, style }: { trigger: unknown; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(1));
  const arrived = useRef(false);
  useEffect(() => {
    // Not on arrival: only when the value changes after that.
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    if (reduceMotion) return;
    v.setValue(1.22);
    Animated.spring(v, { toValue: 1, friction: 5, tension: 160, useNativeDriver: NATIVE }).start();
  }, [trigger, v]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/** A slow, endless bob (the logo on the home screen). */
export function Float({ children, distance = 6, style }: { children: ReactNode; distance?: number; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(v, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** A soft, endless breathing glow (behind the logo, on a live recording dot). */
export function Breathe({ children, style, min = 0.45 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; min?: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(v, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [min, 1] }) }]}>{children}</Animated.View>
  );
}

const CONFETTI = [colors.pickle, colors.pink, colors.sky, colors.orange, '#FFFFFF'];
const PIECES = 22;

interface Piece {
  left: number;
  drift: number;
  spin: number;
  size: number;
  color: string;
  /** When in the burst it starts falling (0–0.35 of the way through). */
  start: number;
  round: boolean;
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => ({
    left: Math.random() * 100,
    drift: (Math.random() - 0.5) * 120,
    spin: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4),
    size: 7 + Math.random() * 7,
    color: CONFETTI[i % CONFETTI.length],
    start: Math.random() * 0.35,
    round: i % 3 === 0,
  }));
}

/**
 * One burst of confetti falling down the screen (a win, a sweep). Every piece is
 * driven by a single animation, and it clears itself away when it lands.
 */
export function Confetti({ duration = 2200 }: { duration?: number }) {
  const { height } = useWindowDimensions();
  const [pieces] = useState(makePieces);
  const [v] = useState(() => new Animated.Value(0));
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (reduceMotion) {
      // No falling paper: nothing to show.
      const hide = setTimeout(() => setDone(true), 0);
      return () => clearTimeout(hide);
    }
    const run = Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: NATIVE });
    run.start(({ finished }) => finished && setDone(true));
    return () => run.stop();
  }, [v, duration]);
  if (done) return null;
  return (
    <View pointerEvents="none" style={styles.confetti}>
      {pieces.map((p, i) => {
        const range = [p.start, 1];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: -20,
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 1.6,
              borderRadius: p.round ? p.size : 2,
              backgroundColor: p.color,
              opacity: v.interpolate({ inputRange: [0, p.start, 0.85, 1], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' }),
              transform: [
                { translateY: v.interpolate({ inputRange: range, outputRange: [0, height * 0.9], extrapolate: 'clamp' }) },
                { translateX: v.interpolate({ inputRange: range, outputRange: [0, p.drift], extrapolate: 'clamp' }) },
                { rotate: v.interpolate({ inputRange: range, outputRange: ['0rad', `${p.spin * Math.PI}rad`], extrapolate: 'clamp' }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  confetti: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 50, elevation: 50 },
});
