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

export function speak(text: string, voice: { voice?: string; pitch: number; rate: number } = { pitch: 1, rate: 1 }) {
  try {
    // Safari can drop an utterance that starts right after a cancel, so only cancel when needed.
    if (speaking) Speech.stop();
    speaking = true;
    const done = () => {
      speaking = false;
    };
    Speech.speak(text, { ...voice, onDone: done, onStopped: done, onError: done });
  } catch {
    speaking = false;
  }
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
  try {
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
    /** Said last, plainly (e.g. the score), so it's what players hear as they get ready to serve. */
    tail?: string;
  },
) {
  hush();
  const withSound = opts.sound && prompt.sound !== undefined;
  if (withSound) playSound(prompt.sound!);
  if (!opts.voice) return;
  const id = announcerFor(opts.announcer ?? '').id;
  const script = announcerScript(prompt, id);
  const text = opts.tail ? `${script.text} ${opts.tail}` : script.text;
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
