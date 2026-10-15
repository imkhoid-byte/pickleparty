// Plays a sound effect, then reads the prompt aloud so players on the court
// hear who has to do what without walking over to the phone.

import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';

import type { PartyPrompt, SoundId } from '../game/party';
import { speechText } from './speechText';

const SOURCES: Record<SoundId, number> = {
  airhorn: require('../../assets/sounds/airhorn.wav'),
  fanfare: require('../../assets/sounds/fanfare.wav'),
  sadtrombone: require('../../assets/sounds/sadtrombone.wav'),
  ding: require('../../assets/sounds/ding.wav'),
  buzzer: require('../../assets/sounds/buzzer.wav'),
  whoosh: require('../../assets/sounds/whoosh.wav'),
  drumroll: require('../../assets/sounds/drumroll.wav'),
  zap: require('../../assets/sounds/zap.wav'),
};

/** Roughly when each sound has done its thing and the voice can start (ms). */
const VOICE_DELAY: Record<SoundId, number> = {
  airhorn: 1300,
  fanfare: 900,
  sadtrombone: 1500,
  ding: 300,
  buzzer: 500,
  whoosh: 300,
  drumroll: 1400,
  zap: 250,
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

export function speak(text: string) {
  try {
    Speech.stop();
    Speech.speak(text, { rate: 1.0, pitch: 1.05 });
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

export function announce(prompt: PartyPrompt, opts: { sound: boolean; voice: boolean }) {
  hush();
  const withSound = opts.sound && prompt.sound !== undefined;
  if (withSound) playSound(prompt.sound!);
  if (!opts.voice) return;
  const text = speechText(prompt);
  const delay = withSound ? VOICE_DELAY[prompt.sound!] : 0;
  pendingVoice = setTimeout(() => {
    pendingVoice = null;
    speak(text);
  }, delay);
}
