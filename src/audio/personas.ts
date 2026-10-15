// Announcer personalities. Same built-in phone voice, different pitch, speed
// and lines. All lines are original, so there's nothing to license.

import type { PartyPrompt, SoundId } from '../game/party';
import { speechText } from './speechText';

export type AnnouncerId = 'hype' | 'squeaky' | 'bigdill' | 'classic';

export interface Announcer {
  id: AnnouncerId;
  label: string;
  emoji: string;
  blurb: string;
  pitch: number;
  rate: number;
}

export const ANNOUNCERS: Announcer[] = [
  { id: 'hype', label: 'Hype', emoji: '🎙️', blurb: 'Sports-announcer energy.', pitch: 1.15, rate: 1.08 },
  { id: 'squeaky', label: 'Squeaky Pickle', emoji: '🐿️', blurb: 'A very small, very excited pickle.', pitch: 1.9, rate: 1.1 },
  { id: 'bigdill', label: 'Big Dill', emoji: '🥒', blurb: 'Deep, dramatic movie-trailer voice.', pitch: 0.55, rate: 0.85 },
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
  hype: {
    hype: ['BOOM!', 'Ladies and gentlemen!', 'Are you kidding me?!', 'Somebody call the fire department!'],
    shame: ['Oh nooo!', 'Yikes!', 'That is gonna leave a mark!', 'Oof. Oof. OOF.'],
    drama: ['Here we go, here we go!', 'The tension! The drama!'],
    neutral: ['Alright, alright!', 'Listen up, people!'],
  },
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

export function announcerFor(id: AnnouncerId): Announcer {
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
