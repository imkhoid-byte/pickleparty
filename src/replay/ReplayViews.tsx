// Instant Replay is web-only for now (see ReplayViews.web.tsx); the app version
// comes with the App Store release, so these render nothing.
import type { Clip } from './useReplay';

export function ReplayPreview(_: {
  canvas: HTMLCanvasElement;
  sideways: boolean;
  count: number;
  saving: number;
  onClip: () => void;
  onAttach: (host: HTMLElement) => void;
  onClose: () => void;
}) {
  return null;
}

export function ClipStrip(_: { clips: Clip[]; saving: number }) {
  return null;
}
