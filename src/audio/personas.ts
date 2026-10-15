// Announcer personalities. Same built-in phone voice, different pitch, speed
// and lines. All lines are original, so there's nothing to license.

import type { PartyPrompt, SoundId } from '../game/party';
import { speechText } from './speechText';

export type AnnouncerId = 'squeaky' | 'bigdill' | 'classic';

export interface Announcer {
  id: AnnouncerId;
  label: string;
  emoji: string;
  blurb: string;
  pitch: number;
  rate: number;
  /** Use a male voice when the phone has one. */
  male?: boolean;
  /** Pitch to use instead when no male voice is installed (deepens the default voice). */
  fallbackPitch?: number;
}

export const ANNOUNCERS: Announcer[] = [
  { id: 'squeaky', label: 'Squeaky Pickle', emoji: '🐿️', blurb: 'A very small, very excited pickle.', pitch: 1.9, rate: 1.1 },
  {
    id: 'bigdill',
    label: 'Big Dill',
    emoji: '🥒',
    blurb: 'Deep, dramatic movie-trailer voice.',
    pitch: 0.65,
    rate: 0.85,
    male: true,
    fallbackPitch: 0.55,
  },
  { id: 'classic', label: 'Classic', emoji: '📢', blurb: 'Just the facts.', pitch: 1, rate: 1 },
];

type Mood = 'hype' | 'shame' | 'drama' | 'neutral';

const MOOD: Record<SoundId, Mood> = {
  airhorn: 'hype',
  kazoo: 'hype',
  slideup: 'hype',
  sadtrombone: 'shame',
  honk: 'shame',
  bonk: 'shame',
  slidedown: 'shame',
  drumroll: 'drama',
  boing: 'neutral',
  whoosh: 'neutral',
};

const INTROS: Record<Exclude<AnnouncerId, 'classic'>, Record<Mood, string[]>> = {
  squeaky: {
    hype: ['Wheee!', 'Yippee!', 'Holy pickles!'],
    shame: ['Uh-oh, spaghetti-o!', 'Oopsie daisy!', 'Ouchie!'],
    drama: ['Ooooh, ooooh!', "I can't look!"],
    neutral: ['Hiii!', 'Guess what, guess what!'],
  },
  bigdill: {
    hype: ['Legends will speak of this day.', 'Behold.'],
    shame: ['And so... it ends in shame.', 'A dark day... for the brine.'],
    drama: ['In a world... where one team stood alone...', 'One point... could change everything.'],
    neutral: ['Listen closely.', 'It is written.'],
  },
};

const PUNS = [
  'Brine time!',
  "That's a big dill!",
  'Dill with it!',
  'Relish the moment!',
  'Somebody get the brine!',
  'Pickle out.',
  'Kind of a big dill.',
  'In a pickle now!',
];

const pick = (items: string[], rng: () => number) => items[Math.floor(rng() * items.length)];

/** Falls back to the default (first) announcer for unknown ids, e.g. one that was removed. */
export function announcerFor(id: string): Announcer {
  return ANNOUNCERS.find((a) => a.id === id) ?? ANNOUNCERS[0];
}

/** What the announcer says for a prompt, and how. Classic reads it straight. */
export function announcerScript(
  prompt: Pick<PartyPrompt, 'title' | 'body' | 'sound'>,
  id: AnnouncerId,
  rng: () => number = Math.random,
): { text: string; pitch: number; rate: number } {
  const a = announcerFor(id);
  const core = speechText(prompt);
  if (a.id === 'classic') return { text: core, pitch: a.pitch, rate: a.rate };
  const mood = prompt.sound ? MOOD[prompt.sound] : 'neutral';
  const intro = rng() < 0.8 ? `${pick(INTROS[a.id][mood], rng)} ` : '';
  const outro = rng() < 0.45 ? ` ${pick(PUNS, rng)}` : '';
  return { text: `${intro}${core}${outro}`, pitch: a.pitch, rate: a.rate };
}

// --- Choosing a voice ---------------------------------------------------------
// Phones don't label voices by gender, so match known male voice names across
// iOS, Android and desktop browsers.

export interface VoiceInfo {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
}

const MALE_NAMES = new Set([
  'male', 'aaron', 'arthur', 'daniel', 'gordon', 'tom', 'alex', 'evan', 'nathan', 'reed', 'rocko',
  'eddy', 'rishi', 'oliver', 'david', 'guy', 'mark', 'george', 'ryan', 'christopher', 'eric',
  'roger', 'andrew', 'brian', 'davis', 'tony', 'jason', 'james', 'liam', 'thomas', 'lee', 'malcolm',
]);
const FEMALE_NAMES = new Set([
  'female', 'samantha', 'victoria', 'karen', 'zira', 'susan', 'moira', 'tessa', 'fiona', 'kate',
  'serena', 'ava', 'allison', 'nicky', 'zoe', 'aria', 'jenny', 'emma', 'catherine', 'hazel', 'sonia',
]);
/** Apple's joke voices sound robotic, not like an announcer. */
const NOVELTY = new Set([
  'fred', 'ralph', 'junior', 'albert', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'wobble',
  'zarvox', 'trinoids', 'whisper', 'jester', 'organ', 'superstar', 'hysterical', 'grandpa', 'grandma',
]);
/** Google's Android male voices, e.g. "en-us-x-iom-local". */
const ANDROID_MALE = /-x-(iob|iol|iom|tpd|gbb|gbd|rjs)-/i;

const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter(Boolean);

/** The best male English voice on this device, or null if there isn't one. */
export function pickMaleVoice(voices: VoiceInfo[]): string | null {
  let best: { id: string; score: number } | null = null;
  for (const v of voices) {
    if (!/^en/i.test(v.language)) continue;
    const w = words(`${v.name} ${v.identifier}`);
    if (w.some((x) => NOVELTY.has(x) || FEMALE_NAMES.has(x))) continue;
    const male = w.some((x) => MALE_NAMES.has(x)) || ANDROID_MALE.test(v.identifier);
    if (!male) continue;
    const score =
      (/^en[-_]us/i.test(v.language) ? 3 : 1) +
      (v.quality === 'Enhanced' || /enhanced|premium|neural|natural/i.test(v.name + v.identifier) ? 2 : 0);
    if (!best || score > best.score) best = { id: v.identifier, score };
  }
  return best?.id ?? null;
}

/** Voice, pitch and speed for an announcer, given the male voice found (if any). */
export function voiceSettings(
  a: Announcer,
  maleVoice: string | null,
): { voice?: string; pitch: number; rate: number } {
  if (a.male && maleVoice) return { voice: maleVoice, pitch: a.pitch, rate: a.rate };
  return { pitch: a.male ? (a.fallbackPitch ?? a.pitch) : a.pitch, rate: a.rate };
}
