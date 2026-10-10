import type { GameRecord } from '../storage';

export interface TeamStats {
  name: string;
  wins: number;
  losses: number;
  pickledOthers: number;
  gotPickled: number;
}

/** Leaderboard keyed by team name (case-insensitive), best record first. */
export function leaderboard(history: GameRecord[]): TeamStats[] {
  const byName = new Map<string, TeamStats>();
  const get = (name: string) => {
    const key = name.trim().toLowerCase();
    let s = byName.get(key);
    if (!s) {
      s = { name: name.trim(), wins: 0, losses: 0, pickledOthers: 0, gotPickled: 0 };
      byName.set(key, s);
    }
    return s;
  };
  for (const g of history) {
    const winner = get(g.teamNames[g.winner]);
    const loser = get(g.teamNames[g.winner === 0 ? 1 : 0]);
    winner.wins++;
    loser.losses++;
    if (g.pickled) {
      winner.pickledOthers++;
      loser.gotPickled++;
    }
  }
  return [...byName.values()].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name),
  );
}
