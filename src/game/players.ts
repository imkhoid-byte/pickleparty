// Player stats. Partners rotate all the time in rec pickleball, so records
// belong to people, not teams. History is newest-first, as stored.

import type { GameRecord } from '../storage';

export const nameKey = (name: string) => name.trim().toLowerCase();

/** Players on each side. Older games without player names count each team name as a player. */
export function sides(g: GameRecord): [string[], string[]] {
  return g.players ?? [[g.teamNames[0]], [g.teamNames[1]]];
}

const loserOf = (g: GameRecord) => (g.winner === 0 ? 1 : 0);

export interface PlayerRecord {
  name: string;
  games: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pickledOthers: number;
  gotPickled: number;
}

export const winPct = (r: { wins: number; losses: number }) =>
  r.wins + r.losses === 0 ? 0 : r.wins / (r.wins + r.losses);

/** Every player's record, best first. */
export function playerRecords(history: GameRecord[]): PlayerRecord[] {
  const map = new Map<string, PlayerRecord>();
  for (const g of history) {
    sides(g).forEach((side, t) => {
      for (const name of side) {
        const k = nameKey(name);
        const r = map.get(k) ?? {
          name: name.trim(),
          games: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pickledOthers: 0,
          gotPickled: 0,
        };
        r.games++;
        r.pointsFor += g.scores[t];
        r.pointsAgainst += g.scores[t === 0 ? 1 : 0];
        if (t === g.winner) {
          r.wins++;
          if (g.pickled) r.pickledOthers++;
        } else {
          r.losses++;
          if (g.pickled) r.gotPickled++;
        }
        map.set(k, r);
      }
    });
  }
  return [...map.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      winPct(b) - winPct(a) ||
      b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
      a.name.localeCompare(b.name),
  );
}

export interface Streak {
  current: number;
  best: number;
}

/** Win streaks per player (by name key). */
export function playerStreaks(history: GameRecord[]): Map<string, Streak> {
  const map = new Map<string, Streak>();
  for (const g of [...history].reverse()) {
    sides(g).forEach((side, t) => {
      for (const name of side) {
        const s = map.get(nameKey(name)) ?? { current: 0, best: 0 };
        s.current = t === g.winner ? s.current + 1 : 0;
        s.best = Math.max(s.best, s.current);
        map.set(nameKey(name), s);
      }
    });
  }
  return map;
}

export interface VsRecord {
  name: string;
  wins: number;
  losses: number;
}

export interface Profile {
  record: PlayerRecord;
  streak: Streak;
  partners: VsRecord[];
  opponents: VsRecord[];
  bestPartner: VsRecord | null;
  nemesis: VsRecord | null;
  favoriteVictim: VsRecord | null;
}

export function profile(history: GameRecord[], name: string): Profile | null {
  const me = nameKey(name);
  const record = playerRecords(history).find((r) => nameKey(r.name) === me);
  if (!record) return null;
  const partners = new Map<string, VsRecord>();
  const opponents = new Map<string, VsRecord>();
  const bump = (m: Map<string, VsRecord>, n: string, won: boolean) => {
    const r = m.get(nameKey(n)) ?? { name: n.trim(), wins: 0, losses: 0 };
    if (won) r.wins++;
    else r.losses++;
    m.set(nameKey(n), r);
  };
  for (const g of history) {
    const s = sides(g);
    const mine = s.findIndex((side) => side.some((n) => nameKey(n) === me));
    if (mine < 0) continue;
    const won = mine === g.winner;
    s[mine].filter((n) => nameKey(n) !== me).forEach((n) => bump(partners, n, won));
    s[mine === 0 ? 1 : 0].forEach((n) => bump(opponents, n, won));
  }
  const byGames = (a: VsRecord, b: VsRecord) => b.wins + b.losses - (a.wins + a.losses) || a.name.localeCompare(b.name);
  const partnerList = [...partners.values()].sort(byGames);
  const opponentList = [...opponents.values()].sort(byGames);
  const enough = (r: VsRecord) => r.wins + r.losses >= 2;

  const bestPartner =
    partnerList.filter((r) => enough(r) && r.wins > r.losses).sort((a, b) => winPct(b) - winPct(a) || b.wins - a.wins)[0] ??
    null;
  const nemesis =
    opponentList
      .filter((r) => enough(r) && r.losses > r.wins)
      .sort((a, b) => b.losses - b.wins - (a.losses - a.wins) || b.losses - a.losses)[0] ?? null;
  const favoriteVictim =
    opponentList
      .filter((r) => enough(r) && r.wins > r.losses)
      .sort((a, b) => b.wins - b.losses - (a.wins - a.losses) || b.wins - a.wins)[0] ?? null;

  return {
    record,
    streak: playerStreaks(history).get(me) ?? { current: 0, best: 0 },
    partners: partnerList,
    opponents: opponentList,
    bestPartner,
    nemesis,
    favoriteVictim,
  };
}

export interface NightRecap {
  games: number;
  pickles: number;
  standings: PlayerRecord[];
  mvp: PlayerRecord | null;
  /** Everyone tied for the most times pickled. */
  mostPickled: { names: string[]; times: number } | null;
  bestDuo: { names: [string, string]; wins: number; losses: number } | null;
}

/** Recap of one party (the games passed in). */
export function nightRecap(games: GameRecord[]): NightRecap {
  const standings = playerRecords(games);
  const worst = Math.max(0, ...standings.map((r) => r.gotPickled));
  const duos = new Map<string, { names: [string, string]; wins: number; losses: number }>();
  for (const g of games) {
    sides(g).forEach((side, t) => {
      if (side.length !== 2) return;
      const names = [...side].sort((a, b) => nameKey(a).localeCompare(nameKey(b))) as [string, string];
      const k = names.map(nameKey).join('|');
      const d = duos.get(k) ?? { names, wins: 0, losses: 0 };
      if (t === g.winner) d.wins++;
      else d.losses++;
      duos.set(k, d);
    });
  }
  const bestDuo =
    [...duos.values()]
      .filter((d) => d.wins > 0)
      .sort((a, b) => b.wins - b.losses - (a.wins - a.losses) || b.wins - a.wins)[0] ?? null;
  return {
    games: games.length,
    pickles: games.filter((g) => g.pickled).length,
    standings,
    mvp: standings[0] && standings[0].wins > 0 ? standings[0] : null,
    mostPickled:
      worst > 0
        ? { names: standings.filter((r) => r.gotPickled === worst).map((r) => r.name), times: worst }
        : null,
    bestDuo,
  };
}

export function recapText(r: NightRecap, link: string, hashtag: string): string {
  const lines = [`🥒 PickleParty recap: ${r.games} game${r.games === 1 ? '' : 's'}`];
  if (r.mvp) lines.push(`👑 MVP: ${r.mvp.name} (${r.mvp.wins}-${r.mvp.losses})`);
  if (r.bestDuo) lines.push(`🤝 Best duo: ${r.bestDuo.names.join(' & ')} (${r.bestDuo.wins}-${r.bestDuo.losses})`);
  if (r.pickles > 0) lines.push(`🥒 ${r.pickles} pickle${r.pickles === 1 ? '' : 's'} served`);
  if (r.mostPickled) lines.push(`💀 Most pickled: ${r.mostPickled.names.join(' & ')} (×${r.mostPickled.times})`);
  lines.push(`${hashtag} ${link}`);
  return lines.join('\n');
}

/** Short storylines about a game that was just played. `prior` is history before it (newest-first). */
export function storylines(game: GameRecord, prior: GameRecord[]): string[] {
  const lines: string[] = [];
  const s = sides(game);
  const winners = s[game.winner];
  const losers = s[loserOf(game)];
  const before = playerStreaks(prior);
  const after = playerStreaks([game, ...prior]);

  for (const n of winners) {
    const streak = after.get(nameKey(n))?.current ?? 0;
    if (streak >= 3) lines.push(`🔥 ${n} has won ${streak} straight.`);
  }
  for (const n of losers) {
    const was = before.get(nameKey(n))?.current ?? 0;
    if (was >= 3) lines.push(`🧊 ${n}'s ${was}-game win streak is over.`);
  }
  // Revenge: a winner lost the last time they faced one of these opponents (one line is enough).
  revenge: for (const w of winners) {
    for (const l of losers) {
      const last = prior.find((g) => {
        const gs = sides(g);
        const wi = gs.findIndex((side) => side.some((n) => nameKey(n) === nameKey(w)));
        return wi >= 0 && gs[wi === 0 ? 1 : 0].some((n) => nameKey(n) === nameKey(l));
      });
      if (!last) continue;
      const lastWinners = sides(last)[last.winner].map(nameKey);
      if (lastWinners.includes(nameKey(l))) {
        lines.push(`😤 Revenge! ${w} got one back on ${l}.`);
        break revenge;
      }
    }
  }
  const records = playerRecords([game, ...prior]);
  for (const w of winners) {
    const r = records.find((x) => nameKey(x.name) === nameKey(w));
    if (!r) continue;
    if (r.wins === 1 && r.games > 1) lines.push(`🎉 First win ever for ${w}!`);
    if ([10, 25, 50, 100, 250].includes(r.wins)) lines.push(`🏅 That's win #${r.wins} for ${w}.`);
  }
  if (winners.length === 2) {
    const key = winners.map(nameKey).sort().join('|');
    let wins = 0;
    let losses = 0;
    for (const g of [game, ...prior]) {
      sides(g).forEach((side, t) => {
        if (side.length === 2 && side.map(nameKey).sort().join('|') === key) {
          if (t === g.winner) wins++;
          else losses++;
        }
      });
    }
    if (wins >= 3 && losses === 0) lines.push(`🤝 ${winners.join(' & ')} are ${wins}-0 as partners.`);
  }
  return lines.slice(0, 3);
}
