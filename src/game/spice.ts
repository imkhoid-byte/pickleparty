// "Spice" decides how penalties read. Chill mode has zero alcohol so the app
// works for everyone (and for store review); the other modes are 21+.
// Wild is for couples: every penalty is a drink plus a flirty act with your own partner.

export type Spice = 'chill' | 'tipsy' | 'wild';

export const SPICES: { id: Spice; label: string; emoji: string; blurb: string }[] = [
  { id: 'chill', label: 'Chill', emoji: '🧃', blurb: 'No alcohol. Silly dares, squats & hydration.' },
  { id: 'tipsy', label: 'Tipsy', emoji: '🍺', blurb: 'Sips on the big moments. 21+ only.' },
  {
    id: 'wild',
    label: 'Wild',
    emoji: '🔥',
    blurb: 'Couples only. Every penalty is a drink plus a flirty act with your partner. 21+ only.',
  },
];

export const isAlcoholic = (s: Spice) => s !== 'chill';

const CHILL_PENALTIES = [
  'do {n} squats',
  'do {n} jumping jacks',
  'drink some water (×{n})',
  'do {n} lunges',
  'hold a plank for {t} seconds',
];

/** Wild acts. Always with your own partner, flirty but never explicit; anyone can skip one. */
export const WILD_ACTS = [
  'kiss your partner',
  'give your partner a 5-second kiss',
  'give your partner a butt slap',
  'whisper something flirty to your partner',
  'let your partner pick your next shot',
  'slow dance with your partner for 5 seconds',
  "give your partner a 10-second shoulder rub",
  "compliment your partner's best feature, not the pickleball kind",
  'swap hats or sunglasses with your partner',
  'serenade your partner for 5 seconds',
  'give your partner a piggyback to the baseline',
  'let your partner give you a new nickname for the rest of the game',
  'walk your partner to the baseline arm in arm',
];

/** For the big penalties ({finish}). */
const WILD_FINALES = [
  'give your partner a movie-finale dip kiss',
  "carry your partner's paddle and drink like a butler until the next game",
  'give your partner a 10-second kiss while everyone counts down',
];

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

/**
 * Expand penalty tokens in card text:
 *   {sips:N}  → "take N sips" / chill exercise / wild: sips plus a partner act
 *   {finish}  → "take a big gulp" / chill big penalty / wild: gulp plus a finale
 * In Wild, only the first penalty in a text gets an act, so prompts stay short.
 */
export function renderPenalty(text: string, spice: Spice, rng: () => number = Math.random): string {
  let actGiven = false;
  const act = (list: string[]) => {
    if (spice !== 'wild' || actGiven) return '';
    actGiven = true;
    return `, then ${pick(list, rng)}`;
  };
  return text
    .replace(/\{sips:(\d+)\}/g, (_, raw: string) => {
      const n = Number(raw);
      if (spice === 'chill') {
        return pick(CHILL_PENALTIES, rng).replace('{n}', String(n * 5)).replace('{t}', String(n * 15));
      }
      return `take ${n} sip${n === 1 ? '' : 's'}${act(WILD_ACTS)}`;
    })
    .replace(/\{finish\}/g, () =>
      spice === 'chill' ? 'run a lap around the court doing the pickle dance' : `take a big gulp${act(WILD_FINALES)}`,
    )
    // A penalty that starts a sentence ("Forget? take 2 sips.") gets a capital letter.
    .replace(/([.?!]\s+)([a-z])/g, (_, gap: string, c: string) => gap + c.toUpperCase());
}
