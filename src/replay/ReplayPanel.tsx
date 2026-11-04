import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../AppState';
import { Chip } from '../ui/components';
import { colors, radius } from '../ui/theme';
import type { Overlay } from './recorder';
import { ClipStrip, ReplayPreview } from './ReplayViews';
import type { Replay } from './useReplay';

/**
 * Instant Replay on a game screen: an invitation to film while the camera's off, and a
 * big tap-to-clip preview while it's on. `overlay` is what's drawn on the video.
 * Renders nothing where filming isn't possible (the app version, for now).
 */
export function ReplayPanel({ replay, overlay }: { replay: Replay; overlay: Overlay }) {
  const { settings, updateSettings } = useApp();
  // The first couple of times filming starts: how to save a clip.
  const [tip, setTip] = useState(false);
  const { supported, on, setOverlay } = replay;

  /** The camera started (or didn't): the first-time tip, and remember the choice for next time. */
  const rolling = (ok: boolean) => {
    if (!ok) return;
    const firstTimes = settings.replayTipsShown < 2;
    if (firstTimes) setTip(true);
    updateSettings({ filmHighlights: true, ...(firstTimes ? { replayTipsShown: settings.replayTipsShown + 1 } : {}) });
  };
  const filmIt = async () => rolling(await replay.start(settings.replaySound));
  const stop = () => {
    replay.stop();
    updateSettings({ filmHighlights: false });
  };

  // The group chose to film: the camera starts with the game.
  useEffect(() => {
    if (settings.filmHighlights && supported) replay.start(settings.replaySound).then(rolling);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(() => setTip(false), 7000);
    return () => clearTimeout(timer);
  }, [tip]);
  // The names (and tag) on the video follow the game.
  useEffect(() => {
    if (on) setOverlay(overlay);
  }, [on, overlay, setOverlay]);

  if (!supported) return null;

  if (!replay.canvas) {
    return (
      <View style={styles.offCard}>
        <Pressable
          onPress={filmIt}
          disabled={replay.starting}
          style={styles.filmIt}
          accessibilityRole="button"
          accessibilityLabel="Film it: start Instant Replay"
        >
          <View style={styles.filmDot} />
          <Text style={styles.filmText}>{replay.starting ? 'Starting the camera…' : 'Film it'}</Text>
        </Pressable>
        <Text style={styles.offText}>
          {replay.error ??
            'Point the phone at the court (or prop it up). Tap the picture after a great point to save the last 30 seconds.'}
        </Text>
        <Chip
          label={settings.replaySound ? '🎙️ Court sound: on' : '🔇 Court sound: off'}
          selected={settings.replaySound}
          onPress={() => updateSettings({ replaySound: !settings.replaySound })}
        />
        {settings.replaySound && (
          <Text style={styles.note}>On some iPhones, recording sound makes the announcer quieter.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.onWrap}>
      {tip && <Text style={styles.tip}>👇 Tap the camera right after a great point to save it</Text>}
      <ReplayPreview
        canvas={replay.canvas}
        sideways={replay.sideways}
        count={replay.clips.length}
        saving={replay.saving}
        onClip={() => replay.clip('🔥 HIGHLIGHT')}
        onAttach={replay.attach}
        onClose={replay.park}
      />
      <ClipStrip clips={replay.clips} saving={replay.saving} />
      <Text style={styles.stop} onPress={stop} accessibilityRole="button">
        ⏹ Stop filming
      </Text>
    </View>
  );
}

/** Leaving a game with clips nobody has shared: ask first (they're gone once you leave). */
export function okToLeave(replay: Replay): boolean {
  const n = replay.clips.length;
  if (n === 0 || typeof window === 'undefined' || typeof window.confirm !== 'function') return true;
  return window.confirm(
    `Leave? Your ${n === 1 ? 'clip' : `${n} clips`} will be gone unless you share or save ${n === 1 ? 'it' : 'them'} first.`,
  );
}

const styles = StyleSheet.create({
  offCard: {
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.danger,
  },
  filmIt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
  filmDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff' },
  filmText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  offText: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  onWrap: { gap: 10, alignItems: 'stretch' },
  tip: {
    alignSelf: 'center',
    backgroundColor: colors.sky,
    color: colors.bg,
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  stop: { color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center', padding: 6 },
});
