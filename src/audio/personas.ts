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
  /** What it says when tapped on the home screen. */
  preview: string;
  pitch: number;
  rate: number;
  /** Use a male voice when the phone has one. */
  male?: boolean;
  /** Preferred accent for that voice, e.g. 'en-GB'. */
  accent?: string;
  /** Pitch to use instead when no male voice is installed (deepens the default voice). */
  fallbackPitch?: number;
  /** Needs Pro (or the free trial). */
  pro?: boolean;
}

export const ANNOUNCERS: Announcer[] = [
  {
    id: 'squeaky',
    label: 'Squeaky Pickle',
    emoji: '🐿️',
    blurb: 'A tiny pickle who has had way too much juice.',
    preview: "Hiii! I'm Squeaky Pickle and I'm gonna call EVERY point! Every single one! Okay okay okay, let's go!",
    pitch: 1.9,
    rate: 1.2,
    pro: true,
  },
  {
    id: 'bigdill',
    label: 'Big Dill',
    emoji: '🥒',
    blurb: 'A terribly posh British gentleman, far too polite about your terrible shots.',
    preview: 'Good afternoon. I am Big Dill, and I shall be announcing your little game. Do try not to embarrass yourselves.',
    pitch: 0.65,
    rate: 0.9,
    male: true,
    accent: 'en-GB',
    fallbackPitch: 0.55,
    pro: true,
  },
  { id: 'classic', label: 'Classic', emoji: '📢', blurb: 'Just the facts.', preview: "Let's dink, pickle people!", pitch: 1, rate: 1 },
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
  tap: 'neutral',
};

/** How a character talks: what it says before and after a prompt, and how it rewords it. */
interface Character {
  intros: Record<Mood, string[]>;
  /** How often an everyday prompt gets an opener (big moments nearly always do). Keeps rallies moving. */
  introChance: number;
  outros: Record<Mood, string[]>;
  /** Rewords the prompt in the character's voice. Must keep every name and number. */
  restyle: (core: string, rng: () => number) => string;
  /** Per-line pitch change, so the voice doesn't sound the same every time. */
  pitchScale: (rng: () => number) => number;
}

// Lines never mention drinks: the same announcer also runs alcohol-free Chill mode.
const CHARACTERS: Record<Exclude<AnnouncerId, 'classic'>, Character> = {
  // The little kid at the party who has had way too much juice.
  squeaky: {
    intros: {
      hype: ['Wheee!', 'Yippee!', 'Holy pickles!', 'OH MY GOSH OH MY GOSH!', 'That was SO cool!'],
      shame: [
        'Uh-oh, spaghetti-o!',
        'Oopsie daisy!',
        'Ouchie!',
        "Ooooh, you're in trouble!",
        "Hahaha! I'm not laughing. Okay, I'm laughing.",
      ],
      drama: ['Ooooh, ooooh!', "I can't look!", 'Is it gonna happen? Is it gonna happen?'],
      neutral: ['Hiii!', 'Guess what, guess what!', 'Hey. Hey. Hey. Hey!', 'Okay okay okay okay!'],
    },
    outros: {
      hype: ['Again! Again!', 'Best day EVER!', "I'm gonna tell everyone at school!", 'Can I have a turn?'],
      shame: ["I'm telling!", 'Nah nah nah nah boo boo!', "That's what you get!", 'Hehehe.'],
      drama: ["I have to pee but I'm NOT leaving!", 'This is better than cartoons!'],
      neutral: ['Are we there yet?', 'Can we get ice cream after?', 'Did you see that? Did you see that?!', "I'm not tired. You're tired."],
    },
    introChance: 0.7,
    restyle: (core, rng) => {
      // Everything is exciting. Sometimes it says the headline twice, because it can.
      const loud = core.replace(/\.(?=\s|$)/g, '!');
      const title = loud.match(/^[^!?]+[!?]/)?.[0];
      return title && rng() < 0.4 ? `${title} ${loud}` : loud;
    },
    pitchScale: (rng) => 0.95 + rng() * 0.1,
  },
  // A terribly posh British gentleman. Never raises his voice; deeply disappointed in your footwork.
  bigdill: {
    intros: {
      hype: [
        'I say! Splendid!',
        'Jolly good show!',
        'Oh, magnificent. Simply magnificent.',
        'Bravo, old sport!',
        'Good heavens!',
        'Somebody fetch my monocle.',
      ],
      shame: [
        'Oh dear. Oh dear, oh dear.',
        'How dreadfully unfortunate.',
        'Rather embarrassing, old chap.',
        'We shan’t speak of this again.',
        'Oh, crikey.',
      ],
      drama: ['Steady on, everyone.', 'Do keep calm and carry on.', 'The tension is positively unbearable.', 'Hold my Earl Grey.'],
      neutral: ['Ahem. If I may.', 'Right then.', 'Pip pip.', 'Do pardon the interruption.'],
    },
    outros: {
      hype: ['I may need a lie-down.', 'Do write home about it.', 'Utterly smashing. Quite literally.'],
      shame: [
        "My grandmother plays with more conviction, and she's a hundred and four.",
        'One does try not to judge. One fails.',
        "I've seen better footwork from a garden gnome.",
        'Most irregular.',
      ],
      drama: ['My monocle has fallen into my tea.', 'I find myself perched on the edge of my chaise longue.'],
      neutral: ['Tally ho.', 'Carry on.', 'Frightfully good fun, this.', 'Cheerio.'],
    },
    // He takes his time, so he skips the preamble more often.
    introChance: 0.45,
    restyle: (core) =>
      core
        // British understatement: nothing is worth an exclamation mark.
        .replace(/!/g, '.')
        // Ever so polite about penalties.
        .replace(/\b(take|do|hold|run|finish)\b/i, 'kindly $1')
        .replace(/\beverybody\b/gi, 'one and all'),
    pitchScale: () => 1,
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
  prompt: Pick<PartyPrompt, 'title' | 'body' | 'sound' | 'big'>,
  id: AnnouncerId,
  rng: () => number = Math.random,
): { text: string; pitch: number; rate: number; pitchScale: number } {
  const a = announcerFor(id);
  const core = speechText(prompt);
  if (a.id === 'classic') return { text: core, pitch: a.pitch, rate: a.rate, pitchScale: 1 };
  const c = CHARACTERS[a.id];
  const mood = prompt.sound ? MOOD[prompt.sound] : 'neutral';
  const intro = rng() < (prompt.big ? 0.9 : c.introChance) ? `${pick(c.intros[mood], rng)} ` : '';
  // Sign off in character most of the time, with the odd pickle pun.
  const roll = rng();
  const outro = roll < 0.4 ? ` ${pick(c.outros[mood], rng)}` : roll < 0.55 ? ` ${pick(PUNS, rng)}` : '';
  return { text: `${intro}${c.restyle(core, rng)}${outro}`, pitch: a.pitch, rate: a.rate, pitchScale: c.pitchScale(rng) };
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

/** The best male English voice on this device (preferring `accent`), or null if there isn't one. */
export function pickMaleVoice(voices: VoiceInfo[], accent = 'en-US'): string | null {
  const preferred = new RegExp(`^${accent.replace('-', '[-_]')}`, 'i');
  let best: { id: string; score: number } | null = null;
  for (const v of voices) {
    if (!/^en/i.test(v.language)) continue;
    const w = words(`${v.name} ${v.identifier}`);
    if (w.some((x) => NOVELTY.has(x) || FEMALE_NAMES.has(x))) continue;
    const male = w.some((x) => MALE_NAMES.has(x)) || ANDROID_MALE.test(v.identifier);
    if (!male) continue;
    const score =
      (preferred.test(v.language) ? 3 : 1) +
      (v.quality === 'Enhanced' || /enhanced|premium|neural|natural/i.test(v.name + v.identifier) ? 2 : 0);
    if (!best || score > best.score) best = { id: v.identifier, score };
  }
  return best?.id ?? null;
}

/** Voice, pitch and speed for an announcer, given the male voice found for it (if any). */
export function voiceSettings(
  a: Announcer,
  maleVoice: string | null,
): { voice?: string; pitch: number; rate: number } {
  if (a.male && maleVoice) return { voice: maleVoice, pitch: a.pitch, rate: a.rate };
  return { pitch: a.male ? (a.fallbackPitch ?? a.pitch) : a.pitch, rate: a.rate };
}
