// "Spice" decides how penalties read. Chill mode has zero alcohol so the app
// works for everyone (and for store review); the other modes are 21+.

export type Spice = 'chill' | 'tipsy' | 'wild';

export const SPICES: { id: Spice; label: string; emoji: string; blurb: string }[] = [
  { id: 'chill', label: 'Chill', emoji: '🧃', blurb: 'No alcohol. Silly dares, squats & hydration.' },
  { id: 'tipsy', label: 'Tipsy', emoji: '🍺', blurb: 'Sips on the big moments. 21+ only.' },
  { id: 'wild', label: 'Wild', emoji: '🔥', blurb: 'Double sips & pickle penalties. 21+ only.' },
];

export const isAlcoholic = (s: Spice) => s !== 'chill';

const CHILL_PENALTIES = [
  'do {n} squats',
  'do {n} jumping jacks',
  'drink some water (×{n})',
  'do {n} lunges',
  'hold a plank for {t} seconds',
];

/**
 * Expand penalty tokens in card text:
 *   {sips:N}  → "take N sips" / chill exercise
 *   {finish}  → "finish your drink" / chill big penalty
 */
export function renderPenalty(text: string, spice: Spice, rng: () => number = Math.random): string {
  return text
    .replace(/\{sips:(\d+)\}/g, (_, raw: string) => {
      const n = Number(raw);
      if (spice === 'chill') {
        const pick = CHILL_PENALTIES[Math.floor(rng() * CHILL_PENALTIES.length)];
        return pick.replace('{n}', String(n * 5)).replace('{t}', String(n * 15));
      }
      const sips = spice === 'wild' ? n * 2 : n;
      return `take ${sips} sip${sips === 1 ? '' : 's'}`;
    })
    .replace(/\{finish\}/g, () =>
      spice === 'chill'
        ? 'run a lap around the court doing the pickle dance'
        : spice === 'wild'
          ? 'finish your drink'
          : 'take a big gulp',
    );
}
