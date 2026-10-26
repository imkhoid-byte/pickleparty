// Plays a sound effect, then reads the prompt aloud so players on the court
// hear who has to do what without walking over to the phone.

import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

import type { PartyPrompt, SoundId } from '../game/party';
import { AnnouncerId, VoiceInfo, announcerFor, announcerScript, pickMaleVoice, voiceSettings } from './personas';

const SOURCES: Record<SoundId, number> = {
  airhorn: require('../../assets/sounds/airhorn.wav'),
  kazoo: require('../../assets/sounds/kazoo.wav'),
  sadtrombone: require('../../assets/sounds/sadtrombone.wav'),
  boing: require('../../assets/sounds/boing.wav'),
  slideup: require('../../assets/sounds/slideup.wav'),
  slidedown: require('../../assets/sounds/slidedown.wav'),
  honk: require('../../assets/sounds/honk.wav'),
  bonk: require('../../assets/sounds/bonk.wav'),
  whoosh: require('../../assets/sounds/whoosh.wav'),
  drumroll: require('../../assets/sounds/drumroll.wav'),
};

/** Roughly when each sound has done its thing and the voice can start (ms). */
const VOICE_DELAY: Record<SoundId, number> = {
  airhorn: 1300,
  kazoo: 1000,
  sadtrombone: 1700,
  boing: 450,
  slideup: 500,
  slidedown: 500,
  honk: 450,
  bonk: 300,
  whoosh: 300,
  drumroll: 1400,
};

const players = new Map<SoundId, AudioPlayer>();
let audioModeSet = false;
let pendingVoice: ReturnType<typeof setTimeout> | null = null;

function playerFor(id: SoundId): AudioPlayer {
  let player = players.get(id);
  if (!player) {
    player = createAudioPlayer(SOURCES[id]);
    players.set(id, player);
  }
  return player;
}

export function playSound(id: SoundId) {
  try {
    if (!audioModeSet) {
      audioModeSet = true;
      // The party is the point: play even with the ringer switch off, and duck the music.
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
    }
    const player = playerFor(id);
    player.muted = false;
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Sound is a bonus; never break the game over it.
  }
}

/** The phone's voices: undefined until looked up. */
let voices: VoiceInfo[] | undefined;

async function findVoices() {
  try {
    const found = await Speech.getAvailableVoicesAsync();
    // Browsers can report an empty list until their voices finish loading; try again later.
    if (found.length > 0) voices = found;
  } catch {
    voices = [];
  }
}
findVoices();

function settingsFor(id: AnnouncerId) {
  const a = announcerFor(id);
  if (voices === undefined) findVoices();
  const male = a.male && voices ? pickMaleVoice(voices, a.accent) : null;
  return voiceSettings(a, male);
}

let speaking = false;

/** The browser's speech engine (the web version), if there is one. */
const browserSpeech = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.speechSynthesis : undefined;

/**
 * iPhone Safari can be left paused after an interruption (the camera starting, a
 * call, switching apps), and then holds every new line forever. Unpause it.
 */
export function wakeSpeech() {
  const synth = browserSpeech();
  try {
    if (synth?.paused) synth.resume();
  } catch {
    // ignore
  }
}

/** Safari drops a line that starts right after a cancel, so give it a moment. */
const AFTER_CANCEL_MS = 80;
/** A line that hasn't started by now was dropped: try it once more. */
const START_TIMEOUT_MS = 2500;
/** Each line gets a number, so a retry or a late start for an old line is ignored. */
let lineId = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let lastCancelAt = -Infinity;

/** Stop the browser's speech, noting when (the next line has to wait a moment after). */
function cancelSpeech(synth: SpeechSynthesis) {
  synth.cancel();
  lastCancelAt = Date.now();
}

export function speak(text: string, voice: { voice?: string; pitch: number; rate: number } = { pitch: 1, rate: 1 }) {
  const synth = browserSpeech();
  if (!synth) {
    try {
      if (speaking) Speech.stop();
      speaking = true;
      const done = () => {
        speaking = false;
      };
      Speech.speak(text, { ...voice, onDone: done, onStopped: done, onError: done });
    } catch {
      speaking = false;
    }
    return;
  }
  // The web: go by what the browser says it's doing, not by our own record. A line Safari
  // cut off (when the camera started, say) never reports that it finished, and trusting a
  // stale "still speaking" would cancel-then-speak every line after it, which Safari drops.
  const id = ++lineId;
  if (retryTimer) clearTimeout(retryTimer);
  let started = false;
  const say = () => {
    if (id !== lineId) return;
    try {
      wakeSpeech();
      Speech.speak(text, {
        ...voice,
        onStart: () => {
          started = true;
        },
      });
    } catch {
      // ignore
    }
  };
  try {
    wakeSpeech();
    if (synth.speaking || synth.pending) cancelSpeech(synth);
    const wait = lastCancelAt + AFTER_CANCEL_MS - Date.now();
    if (wait > 0) setTimeout(say, wait);
    else say();
  } catch {
    return;
  }
  // Nothing started: Safari dropped it or is stuck. Clear it out and say it once more.
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (started || id !== lineId) return;
    try {
      cancelSpeech(synth);
      synth.resume();
    } catch {
      // ignore
    }
    setTimeout(say, AFTER_CANCEL_MS);
  }, START_TIMEOUT_MS);
}

// Coming back to the app (or the phone being turned) can leave Safari's speech paused.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') wakeSpeech();
  });
}

let unlocked = false;

/**
 * iPhone browsers only let a page speak or play sound after it has done so
 * during a tap. Call this on the first tap so later announcements (which start
 * on a timer, after the sound effect) are allowed. Native apps don't need it.
 */
export function unlockAudio() {
  if (unlocked || Platform.OS !== 'web') return;
  unlocked = true;
  try {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (synth) {
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0;
      synth.speak(silent);
    }
    // Play each sound once, muted, so it may play later. (No pause: pausing a
    // play() that hasn't started yet makes browsers reject it with an error.)
    (Object.keys(SOURCES) as SoundId[]).forEach((id) => {
      const player = playerFor(id);
      player.muted = true;
      player.play();
    });
  } catch {
    // ignore
  }
}

/** Cut off any announcement in progress (e.g. when the next one starts or sound is muted). */
export function hush() {
  if (pendingVoice) clearTimeout(pendingVoice);
  pendingVoice = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  // Any line still waiting to start is now out of date.
  lineId++;
  const synth = browserSpeech();
  try {
    // Only cancel when there's something to cancel: Safari drops a line that starts right after one.
    if (synth) {
      if (synth.speaking || synth.pending) cancelSpeech(synth);
      return;
    }
    Speech.stop();
  } catch {
    // ignore
  }
}

export function announce(
  prompt: PartyPrompt,
  opts: {
    sound: boolean;
    voice: boolean;
    announcer?: AnnouncerId;
    /**
     * Said first, plainly (the score call), so it's heard before the next serve
     * even when the party line runs long.
     */
    lead?: string;
  },
) {
  hush();
  const withSound = opts.sound && prompt.sound !== undefined;
  if (withSound) playSound(prompt.sound!);
  if (!opts.voice) return;
  const id = announcerFor(opts.announcer ?? '').id;
  const script = announcerScript(prompt, id);
  const text = opts.lead ? `${opts.lead} ${script.text}` : script.text;
  const { pitchScale } = script;
  const delay = withSound ? VOICE_DELAY[prompt.sound!] : 0;
  pendingVoice = setTimeout(() => {
    pendingVoice = null;
    const v = settingsFor(id);
    speak(text, { ...v, pitch: Math.min(2, v.pitch * pitchScale) });
  }, delay);
}

/** Say one plain line in the announcer's voice, with no sound effect (e.g. just the score). */
export function announceLine(text: string, opts: { voice: boolean; announcer?: AnnouncerId }) {
  if (!opts.voice || !text) return;
  hush();
  speak(text, settingsFor(announcerFor(opts.announcer ?? '').id));
}

/**
 * Let players hear an announcer before picking it. Speaks immediately, inside
 * the tap, so it works even before anything else has played (iPhone browsers).
 */
export function previewAnnouncer(id: AnnouncerId) {
  unlockAudio();
  hush();
  // Each character introduces itself, in character.
  speak(announcerFor(id).preview, settingsFor(id));
}
