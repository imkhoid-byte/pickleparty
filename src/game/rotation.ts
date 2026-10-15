// Who plays next. Pickleball groups rotate between games (paddle stacks at
// public courts, "winners stay" in many groups), so the app does it for them.

import type { GameRecord } from '../storage';
import { nameKey, sides } from './players';

export type Teams = [string[], string[]];

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pairKey = (a: string, b: string) => [nameKey(a), nameKey(b)].sort().join('|');

/** Free: a random matchup from whoever is here. */
export function randomMatchup(present: string[], teamSize: 1 | 2, rng: () => number = Math.random): Teams | null {
  if (present.length < teamSize * 2) return null;
  const p = shuffle(present, rng).slice(0, teamSize * 2);
  return [p.slice(0, teamSize), p.slice(teamSize)];
}

/**
 * Pro "fair rotation": whoever has played least tonight goes on next, and
 * partners/opponents are mixed so the same people don't keep pairing up.
 * `played` is tonight's games, newest-first.
 */
export function fairMatchup(
  present: string[],
  played: GameRecord[],
  teamSize: 1 | 2,
  rng: () => number = Math.random,
): Teams | null {
  const need = teamSize * 2;
  if (present.length < need) return null;
  const count = new Map<string, number>();
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const g of played) {
    const [a, b] = sides(g);
    [...a, ...b].forEach((n) => bump(count, nameKey(n)));
    for (const side of [a, b]) if (side.length === 2) bump(partners, pairKey(side[0], side[1]));
    for (const x of a) for (const y of b) bump(opponents, pairKey(x, y));
  }
  // Players who just played go to the back of the line when games are tied.
  const lastGame = played[0] ? sides(played[0]).flat().map(nameKey) : [];
  const order = shuffle(present, rng).sort(
    (x, y) =>
      (count.get(nameKey(x)) ?? 0) - (count.get(nameKey(y)) ?? 0) ||
      Number(lastGame.includes(nameKey(x))) - Number(lastGame.includes(nameKey(y))),
  );
  const on = order.slice(0, need);
  if (teamSize === 1) return [[on[0]], [on[1]]];

  const cost = ([a, b]: Teams) =>
    10 * ((partners.get(pairKey(a[0], a[1])) ?? 0) + (partners.get(pairKey(b[0], b[1])) ?? 0)) +
    a.reduce((n, x) => n + b.reduce((m, y) => m + (opponents.get(pairKey(x, y)) ?? 0), 0), 0);
  const [p, q, r, s] = on;
  const options: Teams[] = [
    [[p, q], [r, s]],
    [[p, r], [q, s]],
    [[p, s], [q, r]],
  ];
  return options.reduce((best, o) => (cost(o) < cost(best) ? o : best));
}

/** How many games in a row this exact team has just won. */
function winningRun(played: GameRecord[], team: string[]): number {
  const key = team.map(nameKey).sort().join('|');
  let run = 0;
  for (const g of played) {
    if (sides(g)[g.winner].map(nameKey).sort().join('|') !== key) break;
    run++;
  }
  return run;
}

/** Most groups cap winners so nobody hogs the court. */
export const WINNERS_STAY_CAP = 2;

/**
 * Pro "winners stay": the last winners keep the court (up to two games in a
 * row) and the players who've waited longest challenge them. Falls back to
 * fair rotation when nobody is waiting.
 */
export function winnersStayMatchup(
  present: string[],
  played: GameRecord[],
  teamSize: 1 | 2,
  rng: () => number = Math.random,
): Teams | null {
  const last = played[0];
  if (!last) return fairMatchup(present, played, teamSize, rng);
  const champs = sides(last)[last.winner];
  const here = new Set(present.map(nameKey));
  const champsHere = champs.every((n) => here.has(nameKey(n)));
  const bench = present.filter((n) => !sides(last).flat().some((p) => nameKey(p) === nameKey(n)));
  if (!champsHere || bench.length < teamSize || winningRun(played, champs) >= WINNERS_STAY_CAP) {
    return fairMatchup(present, played, teamSize, rng);
  }
  const count = new Map<string, number>();
  for (const g of played) sides(g).flat().forEach((n) => count.set(nameKey(n), (count.get(nameKey(n)) ?? 0) + 1));
  const challengers = shuffle(bench, rng)
    .sort((a, b) => (count.get(nameKey(a)) ?? 0) - (count.get(nameKey(b)) ?? 0))
    .slice(0, teamSize);
  return [champs, challengers];
}

/** Smart rotation is a Pro feature; free parties shuffle randomly. */
export function planMatchup(
  mode: 'mix' | 'winnersStay' | 'random',
  isPro: boolean,
  present: string[],
  played: GameRecord[],
  teamSize: 1 | 2,
  rng: () => number = Math.random,
): Teams | null {
  if (mode === 'random' || !isPro) return randomMatchup(present, teamSize, rng);
  if (mode === 'winnersStay') return winnersStayMatchup(present, played, teamSize, rng);
  return fairMatchup(present, played, teamSize, rng);
}
