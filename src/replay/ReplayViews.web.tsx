import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { APP_LINK, HASHTAG } from '../config';
import { Button } from '../ui/components';
import { colors, radius } from '../ui/theme';
import type { Clip } from './useReplay';

/**
 * The live camera, small in the corner, with the score drawn on it exactly as
 * it'll be in the clip. Tapping it saves the last 20–30 seconds.
 */
export function ReplayPreview({
  canvas,
  sideways,
  count,
  saving,
  onClip,
  onAttach,
  onClose,
}: {
  /** What's recorded. */
  canvas: HTMLCanvasElement;
  /** The video's shape, which the preview matches (it turns when the phone does). */
  sideways: boolean;
  count: number;
  saving: number;
  onClip: () => void;
  /** Put the camera and canvas into the preview. */
  onAttach: (host: HTMLElement) => void;
  /** The preview is going away: the canvas has to keep drawing somewhere. */
  onClose: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    onAttach(el);
    return onClose;
  }, [canvas, onAttach, onClose]);
  return (
    <Pressable
      onPress={onClip}
      style={[styles.preview, sideways ? styles.previewWide : styles.previewTall]}
      accessibilityRole="button"
      accessibilityLabel="Save the last 20 to 30 seconds as a clip"
    >
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      <View style={styles.rec}>
        <View style={styles.recDot} />
        {count > 0 && <Text style={styles.recText}>{count}</Text>}
      </View>
      <Text style={styles.tapText}>{saving > 0 ? 'Saving…' : '🎬 Tap to clip the last 30 seconds'}</Text>
    </Pressable>
  );
}

async function shareFiles(files: File[], text: string) {
  try {
    if (navigator.canShare?.({ files })) {
      await navigator.share({ files, text });
      return;
    }
  } catch (e) {
    // Cancelled: nothing more to do.
    if (e instanceof DOMException && e.name === 'AbortError') return;
  }
  // No share sheet (most computers): download instead.
  files.forEach((f) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  });
}

const shareLine = `Scored on PickleParty ${HASHTAG}\n${APP_LINK}`;

/** The clips saved so far: watch them, share one, or share them all. */
export function ClipStrip({ clips, saving }: { clips: Clip[]; saving: number }) {
  if (clips.length === 0 && saving === 0) return null;
  return (
    <View style={styles.strip}>
      <Text style={styles.stripTitle}>
        🎬 Highlights{clips.length > 0 ? ` (${clips.length})` : ''}
        {saving > 0 ? ' · saving…' : ''}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {clips.map((c) => (
          <View key={c.id} style={styles.clip}>
            <video src={c.url} controls playsInline preload="metadata" style={{ width: '100%', height: 120, borderRadius: 10, background: '#000' }} />
            <Text style={styles.clipLabel} numberOfLines={1}>
              {c.label}
            </Text>
            <Button label="📤 Share" small variant="secondary" onPress={() => shareFiles([c.file], shareLine)} />
          </View>
        ))}
      </ScrollView>
      {clips.length > 1 && (
        <Button label={`📣 Share all ${clips.length} clips`} small onPress={() => shareFiles(clips.map((c) => c.file), shareLine)} />
      )}
      <Text style={styles.stripNote}>Clips stay on this phone until you share them, and are gone once you leave this game.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Big and in the middle of the screen: during a game there's nothing else to look at.
  preview: {
    alignSelf: 'center',
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.danger,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  previewTall: { maxWidth: 270, aspectRatio: 3 / 4 },
  previewWide: { maxWidth: 520, aspectRatio: 16 / 9 },
  rec: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  recDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.danger },
  recText: { color: '#fff', fontSize: 16, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 3 },
  tapText: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  strip: { alignSelf: 'stretch', gap: 8, marginTop: 4 },
  stripTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  clip: { width: 170, gap: 6 },
  clipLabel: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  stripNote: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
