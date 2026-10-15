// Crew stats: the bragging-rights layer that makes Pro worth keeping.
// History is newest-first, as stored.

import type { GameRecord } from '../storage';
import { leaderboard } from './stats';

const key = (name: string) => name.trim().toLowerCase();

export interface Rivalry {
  a: string;
  b: string;
  winsA: number;
  winsB: number;
  games: number;
}

/** Every matchup that has been played, most-played first (closest record breaks ties). */
export function rivalries(history: GameRecord[]): Rivalry[] {
  const map = new Map<string, Rivalry>();
  for (const g of history) {
    const [x, y] = g.teamNames.map((n) => n.trim());
    const [a, b] = key(x) < key(y) ? [x, y] : [y, x];
    const id = `${key(a)}|${key(b)}`;
    const r = map.get(id) ?? { a, b, winsA: 0, winsB: 0, games: 0 };
    r.games++;
    if (key(g.teamNames[g.winner]) === key(a)) r.winsA++;
    else r.winsB++;
    map.set(id, r);
  }
  return [...map.values()].sort(
    (p, q) => q.games - p.games || Math.abs(p.winsA - p.winsB) - Math.abs(q.winsA - q.winsB),
  );
}

export interface Streak {
  name: string;
  current: number;
  best: number;
}

/** Win streaks per team. `current` counts back from the most recent game. */
export function streaks(history: GameRecord[]): Streak[] {
  const map = new Map<string, Streak & { running: number }>();
  // Walk oldest → newest so "running" ends as the current streak.
  for (const g of [...history].reverse()) {
    g.teamNames.forEach((n, i) => {
      const s = map.get(key(n)) ?? { name: n.trim(), current: 0, best: 0, running: 0 };
      s.running = i === g.winner ? s.running + 1 : 0;
      s.best = Math.max(s.best, s.running);
      map.set(key(n), s);
    });
  }
  return [...map.values()]
    .map(({ name, running, best }) => ({ name, current: running, best }))
    .sort((p, q) => q.current - p.current || q.best - p.best);
}

export interface Recap {
  games: number;
  pickles: number;
  champ: { name: string; wins: number; losses: number } | null;
  mostPickled: { name: string; times: number } | null;
  rivalry: Rivalry | null;
  closest: GameRecord | null;
  rallies: number;
}

export function recap(history: GameRecord[], since: number): Recap {
  const games = history.filter((g) => g.date >= since);
  const board = leaderboard(games);
  const shame = [...board].sort((p, q) => q.gotPickled - p.gotPickled)[0];
  const margin = (g: GameRecord) => Math.abs(g.scores[0] - g.scores[1]);
  return {
    games: games.length,
    pickles: games.filter((g) => g.pickled).length,
    champ: board[0] ? { name: board[0].name, wins: board[0].wins, losses: board[0].losses } : null,
    mostPickled: shame && shame.gotPickled > 0 ? { name: shame.name, times: shame.gotPickled } : null,
    rivalry: rivalries(games)[0] ?? null,
    closest: games.length ? games.reduce((best, g) => (margin(g) < margin(best) ? g : best)) : null,
    rallies: games.reduce((n, g) => n + g.rallies, 0),
  };
}

export function recapText(r: Recap, period: string, link: string, hashtag: string): string {
  const lines = [`🥒 Our PickleParty ${period} recap`, `🏓 ${r.games} games · ${r.rallies} rallies`];
  if (r.champ) lines.push(`👑 Champs: ${r.champ.name} (${r.champ.wins}-${r.champ.losses})`);
  if (r.rivalry && r.rivalry.games > 1) {
    lines.push(`⚔️ Rivalry: ${r.rivalry.a} ${r.rivalry.winsA}-${r.rivalry.winsB} ${r.rivalry.b}`);
  }
  if (r.pickles > 0) lines.push(`🥒 ${r.pickles} pickle${r.pickles === 1 ? '' : 's'} served`);
  if (r.mostPickled) lines.push(`💀 Most pickled: ${r.mostPickled.name} (×${r.mostPickled.times})`);
  if (r.closest) {
    const g = r.closest;
    lines.push(`😮‍💨 Closest: ${g.teamNames[0]} ${g.scores[0]}-${g.scores[1]} ${g.teamNames[1]}`);
  }
  lines.push(`${hashtag} ${link}`);
  return lines.join('\n');
}
