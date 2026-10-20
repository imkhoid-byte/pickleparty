import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { Overlay, ReplayRecorder } from './recorder';

export interface Clip {
  id: string;
  /** The play, as shown on the video ("⚡ ACE"). */
  label: string;
  /** For playing it back in the app. */
  url: string;
  file: File;
}

/** Two clips this close together are the same moment (a tap, then the moment's auto-clip). */
const SAME_MOMENT_MS = 6000;

/**
 * Instant Replay for the match screen: the camera, the clips saved so far, and
 * how many are still being saved. Web only for now; `supported` is false elsewhere.
 */
export function useReplay() {
  const [supported] = useState(() => Platform.OS === 'web' && ReplayRecorder.supported());
  const recorder = useRef<ReplayRecorder | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [saving, setSaving] = useState(0);
  const lastClipAt = useRef(0);
  const urls = useRef<string[]>([]);

  const start = useCallback(async (sound: boolean) => {
    if (recorder.current) return;
    setError(null);
    setStarting(true);
    const r = new ReplayRecorder();
    recorder.current = r;
    try {
      await r.start(sound);
      setCanvas(r.canvas);
    } catch (e) {
      r.stop();
      recorder.current = null;
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      setError(
        denied
          ? 'The camera was blocked. Allow camera access for this site in your browser settings, then try again.'
          : "Couldn't start the camera on this device.",
      );
    } finally {
      setStarting(false);
    }
  }, []);

  const stop = useCallback(() => {
    recorder.current?.stop();
    recorder.current = null;
    setCanvas(null);
  }, []);

  /** Save the last 20–30 seconds as a clip, with `label` shown on it. */
  const clip = useCallback(async (label: string) => {
    const r = recorder.current;
    if (!r || Date.now() - lastClipAt.current < SAME_MOMENT_MS) return;
    lastClipAt.current = Date.now();
    r.showText(label);
    setSaving((n) => n + 1);
    const blob = await r.clip();
    setSaving((n) => n - 1);
    if (!blob || blob.size === 0) return;
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const id = `${Date.now()}`;
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    const file = new File([blob], `pickleparty-${id}.${ext}`, { type: blob.type });
    setClips((cs) => [...cs, { id, label, url, file }]);
  }, []);

  /** Keep the score on the video up to date. */
  const setOverlay = useCallback((o: Overlay) => {
    if (recorder.current) recorder.current.overlay = o;
  }, []);

  /** The preview closed: keep drawing off screen. */
  const park = useCallback(() => recorder.current?.park(), []);

  // Leaving the match: camera off, and the clips' memory freed.
  useEffect(
    () => () => {
      recorder.current?.stop();
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  return { supported, on: canvas !== null, canvas, starting, error, clips, saving, start, stop, clip, setOverlay, park };
}

export type Replay = ReturnType<typeof useReplay>;
