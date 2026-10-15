import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius } from './theme';

export function tap(enabled = true, style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (enabled && Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
}

export function Screen({
  title,
  onBack,
  children,
  scroll = true,
  right,
}: {
  title?: string;
  onBack?: () => void;
  children: ReactNode;
  scroll?: boolean;
  right?: ReactNode;
}) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>
  ) : (
    <View style={[styles.scroll, { flex: 1 }]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe}>
      {(title || onBack) && (
        <View style={styles.header}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
              <Text style={styles.back}>‹ Back</Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ minWidth: 60, alignItems: 'flex-end' }}>{right}</View>
        </View>
      )}
      {body}
    </SafeAreaView>
  );
}

type Variant = 'primary' | 'secondary' | 'pink' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  style,
  disabled,
  small,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  small?: boolean;
}) {
  const bg = {
    primary: colors.pickle,
    secondary: colors.surfaceHi,
    pink: colors.pink,
    ghost: 'transparent',
  }[variant];
  const fg = variant === 'primary' ? colors.bg : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === 'ghost' && { borderWidth: 2, borderColor: colors.surfaceHi },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      <Text style={[styles.buttonText, small && { fontSize: 15 }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.pickle,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[
        styles.chip,
        selected ? { backgroundColor: color, borderColor: color } : { borderColor: colors.surfaceHi },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.bg : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Full-screen party takeover used for prompts, cards and game over. */
export function Takeover({
  visible,
  emoji,
  title,
  body,
  accent = colors.pickle,
  children,
  footnote,
  hero,
  onClose,
}: {
  visible: boolean;
  emoji?: string;
  title?: string;
  /** Custom content shown instead of the emoji, title and body (e.g. the result card). */
  hero?: ReactNode;
  body?: string;
  accent?: string;
  children?: ReactNode;
  /** Small print under the buttons. */
  footnote?: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss">
        <Pressable style={[styles.takeover, { borderColor: accent }]} onPress={() => {}}>
          {/* Scrolls when the content is taller than a small phone's screen. */}
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.takeoverContent} bounces={false}>
            {hero ?? (
              <>
                {emoji ? <Text style={styles.takeoverEmoji}>{emoji}</Text> : null}
                {title ? <Text style={[styles.takeoverTitle, { color: accent }]}>{title}</Text> : null}
                {body ? <Text style={styles.takeoverBody}>{body}</Text> : null}
              </>
            )}
            <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 8 }}>
              {children ?? <Button label="Let's go!" onPress={onClose} />}
            </View>
            {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  back: { color: colors.muted, fontSize: 17, fontWeight: '600', width: 60 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', flex: 1, textAlign: 'center' },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.sm },
  buttonText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  chipText: { fontSize: 15, fontWeight: '800' },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,4,20,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  takeover: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    padding: 26,
    width: '100%',
    maxWidth: 420,
    maxHeight: '100%',
  },
  takeoverContent: { alignItems: 'center', gap: 10 },
  takeoverEmoji: { fontSize: 72 },
  takeoverTitle: { fontSize: 32, fontWeight: '900', textAlign: 'center' },
  footnote: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  takeoverBody: { color: colors.text, fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 28 },
});
