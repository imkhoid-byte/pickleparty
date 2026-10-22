// Instant Replay (web): film the court and keep the last 20–30 seconds, so a
// great point can be saved after it happens.
//
// A video file can't simply be cut from the middle of a recording without
// re-encoding it, so instead several recordings overlap: a new one starts every
// SEGMENT_EVERY and each runs for at most SEGMENT_MAX. Saving a clip takes the
// oldest one still running, which always holds the last 20–30 seconds.
//
// The camera is drawn onto a canvas with the score on top, and the canvas is
// what's recorded, so every clip carries the score bar and the play's name.

export const SEGMENT_EVERY = 10_000;
export const SEGMENT_MAX = 32_000;
/** Keep filming a moment after the tap: the celebration is part of the clip. */
const POST_ROLL = 2500;
/** How long a play's name stays on the video. */
const FLASH_MS = 4000;
/** The longest side of the recorded video, in pixels. */
const MAX_SIDE = 1280;
/** No new camera frame for this long (after the phone turns, say): get the camera going again. */
const STALL_MS = 2500;
/** Don't restart the camera more often than this. */
const RESTART_GAP = 6000;

const CAMERA: MediaTrackConstraints = { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } };

export interface Overlay {
  names: [string, string];
  scores: [number, number];
  colors: [string, string];
  serving: 0 | 1;
}

interface Segment {
  rec: MediaRecorder;
  startedAt: number;
  done: Promise<Blob>;
  expire: ReturnType<typeof setTimeout>;
}

/** The segment to save as a clip: the oldest one still recording, which holds the most footage. */
export function pickSegment<T extends { startedAt: number }>(segments: T[]): T | null {
  return segments.reduce<T | null>((best, s) => (best === null || s.startedAt < best.startedAt ? s : best), null);
}

// H.264 MP4 first: it's what Photos, TikTok and Instagram take without converting.
const MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01F,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01F',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ReplayRecorder {
  /** The camera, drawn with the score on top. This is what's recorded, and what the preview shows. */
  readonly canvas: HTMLCanvasElement;
  overlay: Overlay | null = null;
  readonly mimeType: string;

  private video: HTMLVideoElement;
  private holder: HTMLDivElement;
  private camera: MediaStream | null = null;
  private output: MediaStream | null = null;
  private segments: Segment[] = [];
  /** How many recordings this browser can run at once (found out by trying). */
  private maxSegments = 4;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private frame = 0;
  private flash: { text: string; until: number } | null = null;
  private stopped = false;
  // Watching for a camera that stalled: the last frame seen, when it last moved on, the last restart.
  private lastVideoTime = -1;
  private lastFrameAt = 0;
  private lastCheckAt = 0;
  private lastRestartAt = 0;
  private restarting = false;

  /** Whether this browser can film and record (the web version on a recent phone or computer). */
  static supported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof MediaRecorder !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }

  constructor() {
    this.mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
    // Safari only keeps a camera's frames coming while its video is in the page, and can stop
    // a hidden one when the phone turns. So the camera video sits in the preview, under the
    // canvas (attach), and in a hidden holder only while there's no preview (park).
    this.holder = document.createElement('div');
    this.holder.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;';
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('muted', '');
    this.video.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;';
    this.canvas = document.createElement('canvas');
    // Sized by the preview it's shown in.
    this.canvas.style.cssText = 'position:relative;width:100%;height:100%;object-fit:cover;display:block;';
    this.holder.append(this.video, this.canvas);
    document.body.append(this.holder);
  }

  /** Start the camera (the back one) and start keeping the last 20–30 seconds. */
  async start(sound: boolean): Promise<void> {
    this.camera = await navigator.mediaDevices.getUserMedia({ video: CAMERA, audio: sound });
    if (this.stopped) {
      this.camera.getTracks().forEach((t) => t.stop());
      return;
    }
    this.video.srcObject = this.camera;
    await this.video.play();
    if (!this.video.videoWidth) await new Promise((resolve) => this.video.addEventListener('loadedmetadata', resolve, { once: true }));
    const scale = Math.min(1, MAX_SIDE / Math.max(this.video.videoWidth, this.video.videoHeight));
    this.canvas.width = Math.round(this.video.videoWidth * scale);
    this.canvas.height = Math.round(this.video.videoHeight * scale);
    this.lastFrameAt = Date.now();
    this.draw();
    window.addEventListener('orientationchange', this.wake);
    window.addEventListener('resize', this.wake);
    document.addEventListener('visibilitychange', this.wake);
    this.output = this.canvas.captureStream(30);
    this.camera.getAudioTracks().forEach((t) => this.output!.addTrack(t));
    this.startSegment();
    this.ticker = setInterval(() => this.startSegment(), SEGMENT_EVERY);
  }

  /** Show a play's name on the video for a few seconds. */
  showText(text: string) {
    this.flash = { text, until: Date.now() + FLASH_MS };
  }

  /** Save the last 20–30 seconds (plus a moment more). Null if nothing's been filmed yet. */
  async clip(): Promise<Blob | null> {
    await sleep(POST_ROLL);
    const seg = pickSegment(this.segments);
    if (!seg || this.stopped) return null;
    this.segments = this.segments.filter((s) => s !== seg);
    clearTimeout(seg.expire);
    seg.rec.stop();
    // Keep filming: the next great point might come right away.
    if (this.segments.length === 0) this.startSegment();
    return seg.done;
  }

  /** Turn the camera off and throw away anything not saved as a clip. */
  stop() {
    this.stopped = true;
    if (this.ticker) clearInterval(this.ticker);
    cancelAnimationFrame(this.frame);
    this.segments.forEach((s) => {
      clearTimeout(s.expire);
      if (s.rec.state !== 'inactive') s.rec.stop();
    });
    this.segments = [];
    window.removeEventListener('orientationchange', this.wake);
    window.removeEventListener('resize', this.wake);
    document.removeEventListener('visibilitychange', this.wake);
    this.camera?.getTracks().forEach((t) => t.stop());
    this.output?.getTracks().forEach((t) => t.stop());
    this.holder.remove();
    this.video.remove();
    this.canvas.remove();
  }

  /** Show the camera in the preview: the video underneath, the canvas (camera plus score) on top. */
  attach(host: HTMLElement) {
    if (!this.stopped) host.append(this.video, this.canvas);
  }

  /** The preview closed: back to the hidden holder, so the camera and drawing keep going. */
  park() {
    if (!this.stopped) this.holder.append(this.video, this.canvas);
  }

  /** The phone turned or the app came back: make sure the camera is still playing. */
  private wake = () => {
    if (this.stopped) return;
    setTimeout(() => this.video.play().catch(() => {}), 300);
  };

  /**
   * Called as the canvas draws: if the camera paused, play it again; if it ended or has
   * stopped sending frames (Safari, after the phone turns), start it again. Clips are
   * recorded from the canvas, so a fresh camera doesn't interrupt them.
   */
  private keepCameraGoing(now: number) {
    if (now - this.lastCheckAt < 500 || this.restarting) return;
    this.lastCheckAt = now;
    if (this.video.paused) this.video.play().catch(() => {});
    const track = this.camera?.getVideoTracks()[0];
    const ended = !track || track.readyState === 'ended';
    if ((ended || now - this.lastFrameAt > STALL_MS) && now - this.lastRestartAt > RESTART_GAP) this.restartCamera();
  }

  private async restartCamera() {
    this.restarting = true;
    this.lastRestartAt = Date.now();
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({ video: CAMERA });
      if (this.stopped) {
        fresh.getTracks().forEach((t) => t.stop());
        return;
      }
      // Keep the court sound (recorded separately), swap in the new camera.
      this.camera?.getVideoTracks().forEach((t) => t.stop());
      const sound = this.camera?.getAudioTracks().filter((t) => t.readyState === 'live') ?? [];
      this.camera = new MediaStream([...fresh.getVideoTracks(), ...sound]);
      this.video.srcObject = this.camera;
      await this.video.play();
      this.lastFrameAt = Date.now();
    } catch {
      // Try again at the next check.
    } finally {
      this.restarting = false;
    }
  }

  private startSegment() {
    if (this.stopped || !this.output || this.segments.length >= this.maxSegments) return;
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(this.output, {
        ...(this.mimeType ? { mimeType: this.mimeType } : {}),
        videoBitsPerSecond: 2_500_000,
      });
      rec.start(1000);
    } catch {
      // This browser can't run another recording alongside the others: stay at this many.
      this.maxSegments = Math.max(1, this.segments.length);
      return;
    }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const done = new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || this.mimeType || 'video/webm' }));
    });
    const seg: Segment = {
      rec,
      startedAt: Date.now(),
      done,
      // Nobody saved it in time: let it go and start a fresh one.
      expire: setTimeout(() => {
        this.segments = this.segments.filter((s) => s !== seg);
        if (rec.state !== 'inactive') rec.stop();
        this.startSegment();
      }, SEGMENT_MAX),
    };
    this.segments.push(seg);
  }

  private draw = () => {
    if (this.stopped) return;
    const ctx = this.canvas.getContext('2d');
    const now = Date.now();
    const newFrame = this.video.currentTime !== this.lastVideoTime;
    if (newFrame) {
      this.lastVideoTime = this.video.currentTime;
      this.lastFrameAt = now;
    }
    this.keepCameraGoing(now);
    const { videoWidth: vw, videoHeight: vh } = this.video;
    const live = this.camera?.getVideoTracks()[0]?.readyState === 'live';
    // Only draw a new frame from a live camera: a stalled or ended one gives black frames,
    // so while the camera recovers the last good frame stays.
    if (ctx && vw && vh && newFrame && live && this.video.readyState >= 2) {
      const { width: cw, height: ch } = this.canvas;
      // Fill the frame even if the phone turned after filming started.
      const s = Math.max(cw / vw, ch / vh);
      ctx.drawImage(this.video, (cw - vw * s) / 2, (ch - vh * s) / 2, vw * s, vh * s);
      this.drawOverlay(ctx, cw, ch);
    }
    this.frame = requestAnimationFrame(this.draw);
  };

  private drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const u = Math.min(w, h) / 720;
    const font = (size: number) => `900 ${Math.round(size * u)}px -apple-system, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';

    // The score bar, top left, like on TV.
    const o = this.overlay;
    if (o) {
      const x = 20 * u;
      const rowH = 46 * u;
      const boxW = Math.min(420 * u, w - 40 * u);
      ctx.fillStyle = 'rgba(22,10,43,0.82)';
      ctx.beginPath();
      ctx.roundRect(x, x, boxW, rowH * 2, 10 * u);
      ctx.fill();
      ([0, 1] as const).forEach((t) => {
        const y = x + rowH * t;
        ctx.fillStyle = o.colors[t];
        ctx.fillRect(x, y + 6 * u, 8 * u, rowH - 12 * u);
        ctx.font = font(24);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        const name = o.names[t].length > 18 ? `${o.names[t].slice(0, 17)}…` : o.names[t];
        ctx.fillText(name, x + 22 * u, y + rowH / 2);
        if (o.serving === t) {
          ctx.fillStyle = '#E8FF3A';
          ctx.beginPath();
          ctx.arc(x + boxW - 78 * u, y + rowH / 2, 7 * u, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.font = font(30);
        ctx.textAlign = 'right';
        ctx.fillStyle = o.colors[t];
        ctx.fillText(String(o.scores[t]), x + boxW - 16 * u, y + rowH / 2);
      });
    }

    // The play's name, along the bottom.
    if (this.flash && Date.now() < this.flash.until) {
      ctx.font = font(40);
      ctx.textAlign = 'center';
      const tw = ctx.measureText(this.flash.text).width;
      const bw = Math.min(w - 40 * u, tw + 60 * u);
      const by = h - 150 * u;
      ctx.fillStyle = '#B6F23A';
      ctx.beginPath();
      ctx.roundRect((w - bw) / 2, by, bw, 72 * u, 14 * u);
      ctx.fill();
      ctx.fillStyle = '#160A2B';
      ctx.fillText(this.flash.text, w / 2, by + 36 * u, w - 60 * u);
    }

    // The watermark, bottom right: every shared clip says where it came from.
    ctx.font = font(26);
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6 * u;
    ctx.fillStyle = '#B6F23A';
    ctx.fillText('🥒 PickleParty', w - 20 * u, h - 36 * u);
    ctx.shadowBlur = 0;
  }
}
