// Plays a sound effect, then reads the prompt aloud so players on the court
// hear who has to do what without walking over to the phone.

import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

import type { PartyPrompt, SoundId } from '../game/party';
import { AnnouncerId, announcerScript } from './personas';

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

export function playSound(id: SoundId) {
  try {
    if (!audioModeSet) {
      audioModeSet = true;
      // The party is the point: play even with the ringer switch off, and duck the music.
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
    }
    let player = players.get(id);
    if (!player) {
      player = createAudioPlayer(SOURCES[id]);
      players.set(id, player);
    }
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Sound is a bonus; never break the game over it.
  }
}

export function speak(text: string, voice: { pitch: number; rate: number } = { pitch: 1, rate: 1 }) {
  try {
    Speech.stop();
    Speech.speak(text, voice);
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
  opts: { sound: boolean; voice: boolean; announcer?: AnnouncerId },
) {
  hush();
  const withSound = opts.sound && prompt.sound !== undefined;
  if (withSound) playSound(prompt.sound!);
  if (!opts.voice) return;
  const { text, pitch, rate } = announcerScript(prompt, opts.announcer ?? 'hype');
  const delay = withSound ? VOICE_DELAY[prompt.sound!] : 0;
  pendingVoice = setTimeout(() => {
    pendingVoice = null;
    speak(text, { pitch, rate });
  }, delay);
}

/** Let players hear an announcer before picking it. */
export function previewAnnouncer(id: AnnouncerId, sound: boolean) {
  announce(
    { emoji: '🥒', title: 'Brine time', body: "Let's dink, pickle people!", sound: 'kazoo' },
    { sound, voice: true, announcer: id },
  );
}
