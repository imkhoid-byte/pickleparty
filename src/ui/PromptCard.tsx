import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from './theme';

/**
 * A big, centered prompt that's easy to read from across the court, and that
 * closes on its own once it's been read out (the bar along the bottom counts
 * down), so nobody has to walk over to the phone. A tap anywhere closes it early.
 */
export function PromptCard({
  emoji,
  title,
  body,
  footnote,
  duration,
  onClose,
}: {
  emoji: string;
  title: string;
  body: string;
  footnote?: string;
  /** How long it stays up, in milliseconds. */
  duration: number;
  onClose: () => void;
}) {
  const [left] = useState(() => new Animated.Value(1));
  useEffect(() => {
    left.setValue(1);
    const run = Animated.timing(left, {
      toValue: 0,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    run.start();
    return () => run.stop();
  }, [left, duration, title, body]);

  return (
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityHint="Closes the prompt">
      <View style={styles.card}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
        <Text style={styles.hint}>Closes on its own · tap to close now</Text>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.bar,
              { width: left.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,4,20,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 20,
    elevation: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.pickle,
    paddingTop: 26,
    paddingHorizontal: 24,
    paddingBottom: 18,
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  emoji: { fontSize: 72 },
  title: { color: colors.pickle, fontSize: 32, fontWeight: '900', textAlign: 'center' },
  body: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  footnote: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  track: { alignSelf: 'stretch', height: 5, borderRadius: 3, backgroundColor: colors.surfaceHi, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: colors.pickle },
});
