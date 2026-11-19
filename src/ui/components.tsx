import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
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

import { playSound } from '../audio/announcer';
import { Appear, Confetti, Pop, PopIn, usePressScale } from './motion';
import { alpha, colors, font, glow, gradients, lift, radius } from './theme';

/** The player's choices for how taps feel and sound (kept in step with settings by AppState). */
let feedback = { sound: true, haptics: true };
export function setFeedback(next: { sound: boolean; haptics: boolean }) {
  feedback = next;
}

/**
 * A tap you can feel: a light buzz in the app; on the web, a short vibration where the
 * browser allows one (Android; iPhone browsers can't vibrate).
 */
export function tap(enabled = true, style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (!enabled || !feedback.haptics) return;
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
  else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(style === Haptics.ImpactFeedbackStyle.Light ? 8 : 20);
  }
}

/** A bigger moment (a drink break, a final score): a success buzz. */
export function celebrate() {
  if (!feedback.haptics) return;
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate([15, 60, 25]);
}

/** A tap you can hear: the soft pop, when tap sounds are on. */
export function click() {
  if (feedback.sound) playSound('tap');
}

/** The page behind every screen: floodlit at the top, fading to night. */
export function Backdrop() {
  return (
    <View pointerEvents="none" style={styles.backdropFill}>
      <LinearGradient colors={gradients.page} locations={[0, 0.45, 1]} style={styles.backdropFill} />
      {/* A faint pickle-green glow from the top, like light spilling over the court. */}
      <LinearGradient colors={[alpha(colors.pickle, 0.1), alpha(colors.pickle, 0)]} style={styles.backdropGlow} />
    </View>
  );
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
  const back = usePressScale(0.9);
  // The whole screen eases in as it arrives.
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.scrollGrow} keyboardShouldPersistTaps="handled">
      <Appear style={styles.scroll}>{children}</Appear>
    </ScrollView>
  ) : (
    <Appear style={[styles.scroll, { flex: 1 }]}>{children}</Appear>
  );
  return (
    <SafeAreaView style={styles.safe}>
      <Backdrop />
      {(title || onBack) && (
        <View style={styles.header}>
          {onBack ? (
            <Animated.View style={{ transform: [{ scale: back.scale }] }}>
              <Pressable
                onPress={() => {
                  tap();
                  click();
                  onBack();
                }}
                onPressIn={back.onPressIn}
                onPressOut={back.onPressOut}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={styles.back}
              >
                <Text style={styles.backText}>‹</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.headerSide} />
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
        </View>
      )}
      {body}
    </SafeAreaView>
  );
}

type Variant = 'primary' | 'secondary' | 'pink' | 'ghost';

const FILL: Partial<Record<Variant, readonly [string, string]>> = { primary: gradients.pickle, pink: gradients.pink };

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
  const press = usePressScale();
  const fill = FILL[variant];
  const fg = variant === 'primary' ? colors.onPickle : variant === 'ghost' ? colors.muted : colors.text;
  const shape = [styles.button, small && styles.buttonSmall];
  const text = <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>{label}</Text>;
  return (
    <Animated.View
      style={[
        small ? styles.buttonSmallWrap : styles.buttonWrap,
        // Filled buttons glow in their own color; a disabled one goes quiet.
        fill && !disabled && glow(variant === 'pink' ? colors.pink : colors.pickle),
        { transform: [{ scale: press.scale }], opacity: disabled ? 0.4 : 1 },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => {
          tap();
          click();
          onPress();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[styles.buttonPress, small && { borderRadius: radius.sm }]}
      >
        {fill ? (
          <LinearGradient colors={fill} style={shape}>
            {text}
          </LinearGradient>
        ) : (
          <View style={[shape, variant === 'secondary' ? styles.buttonSecondary : styles.buttonGhost]}>{text}</View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.pickle,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  /** A small picture before the label (e.g. an announcer's face). */
  icon?: ImageSourcePropType;
}) {
  const press = usePressScale(0.94);
  return (
    // A chip pops as it's picked.
    <Pop trigger={selected}>
      <Animated.View style={{ transform: [{ scale: press.scale }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={() => {
            tap();
            click();
            onPress();
          }}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={[
            styles.chip,
            selected ? [{ backgroundColor: color, borderColor: color }, glow(color)] : styles.chipOff,
            icon ? styles.chipWithIcon : null,
          ]}
        >
          {icon ? <Image source={icon} style={styles.chipIcon} accessibilityIgnoresInvertColors /> : null}
          <Text style={[styles.chipText, { color: selected ? colors.onPickle : colors.text }]}>{label}</Text>
        </Pressable>
      </Animated.View>
    </Pop>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** The announcing character with a speech-bubble caption, at the top of a pop-up. */
export function Speaker({ image, caption }: { image: ImageSourcePropType; caption: string }) {
  return (
    <View style={styles.speaker}>
      <Image source={image} style={styles.speakerImage} accessibilityIgnoresInvertColors />
      <Text style={styles.speakerCaption}>{caption}</Text>
    </View>
  );
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
  speaker,
  confetti,
  onClose,
}: {
  visible: boolean;
  /** A burst of confetti as it opens (a sweep, a champion). */
  confetti?: boolean;
  /** Who's announcing (the Pro announcers' character art), shown at the top. */
  speaker?: { image: ImageSourcePropType; caption: string };
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
        {/* The card lands with a small bounce; the emoji follows a beat later. */}
        <PopIn style={styles.takeoverWrap}>
          <Pressable style={[styles.takeover, { borderColor: accent }, glow(accent, 'strong')]} onPress={() => {}}>
            <LinearGradient colors={gradients.surface} style={styles.takeoverFill} />
            {/* Scrolls when the content is taller than a small phone's screen. */}
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.takeoverContent} bounces={false}>
              {speaker ? <Speaker {...speaker} /> : null}
              {hero ?? (
                <>
                  {emoji ? (
                    <PopIn delay={120}>
                      <View style={[styles.takeoverHalo, { borderColor: alpha(accent, 0.35) }]}>
                        <Text style={styles.takeoverEmoji}>{emoji}</Text>
                      </View>
                    </PopIn>
                  ) : null}
                  {title ? <Text style={[styles.takeoverTitle, { color: accent }]}>{title}</Text> : null}
                  {body ? <Text style={styles.takeoverBody}>{body}</Text> : null}
                </>
              )}
              <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 10 }}>
                {children ?? <Button label="Let's go!" onPress={onClose} />}
              </View>
              {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
            </ScrollView>
          </Pressable>
        </PopIn>
        {confetti ? <Confetti /> : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  backdropFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  backdropGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  scrollGrow: { flexGrow: 1 },
  // Capped and centered, so screens don't stretch edge to edge on a sideways phone, a tablet or a laptop.
  scroll: { padding: 20, paddingTop: 12, gap: 14, paddingBottom: 44, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerSide: { minWidth: 44 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: 1,
    borderColor: colors.line,
  },
  backText: { color: colors.text, fontSize: 28, lineHeight: 30, fontFamily: font.medium, marginTop: -3, marginLeft: -2 },
  title: { color: colors.text, fontSize: 22, fontFamily: font.bold, flex: 1, textAlign: 'center', letterSpacing: 0.2 },
  buttonWrap: { borderRadius: radius.md },
  buttonSmallWrap: { borderRadius: radius.sm },
  buttonPress: { borderRadius: radius.md, overflow: 'hidden' },
  button: {
    minHeight: 58,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 42, paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.sm },
  buttonSecondary: { backgroundColor: colors.surfaceHi, borderWidth: 1, borderColor: colors.line },
  buttonGhost: { borderWidth: 1.5, borderColor: colors.lineStrong },
  buttonText: { fontSize: 19, fontFamily: font.bold, letterSpacing: 0.3, textAlign: 'center' },
  buttonTextSmall: { fontSize: 15, fontFamily: font.semi },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipOff: { backgroundColor: colors.surface, borderColor: colors.line },
  chipText: { fontSize: 15, fontFamily: font.semi },
  chipWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 5, paddingVertical: 5 },
  chipIcon: { width: 32, height: 32 },
  speaker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  speakerImage: { width: 76, height: 76 },
  speakerCaption: {
    backgroundColor: colors.surfaceHi,
    color: colors.muted,
    fontSize: 13,
    fontFamily: font.medium,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  label: {
    color: colors.faint,
    fontSize: 13,
    fontFamily: font.semi,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,3,16,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  takeoverWrap: { width: '100%', maxWidth: 420, maxHeight: '100%' },
  takeover: {
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: 24,
    maxHeight: '100%',
    overflow: 'hidden',
    ...lift,
  },
  takeoverFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  takeoverContent: { alignItems: 'center', gap: 10 },
  takeoverHalo: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  takeoverEmoji: { fontSize: 60 },
  takeoverTitle: { fontSize: 30, fontFamily: font.bold, textAlign: 'center', lineHeight: 36 },
  footnote: { color: colors.faint, fontSize: 13, textAlign: 'center' },
  takeoverBody: { color: colors.text, fontSize: 19, fontWeight: '600', textAlign: 'center', lineHeight: 27 },
});
