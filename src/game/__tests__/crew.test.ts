import { describe, expect, it } from '@jest/globals';

import type { GameRecord } from '../../storage';
import { recap, recapText, rivalries, streaks } from '../crew';
import { RRRound, maxCourts, nextRound, standings } from '../roundRobin';

let id = 0;
const game = (a: string, b: string, sa: number, sb: number, date = 1000): GameRecord => ({
  id: String(id++),
  date,
  teamNames: [a, b],
  scores: [sa, sb],
  winner: sa > sb ? 0 : 1,
  pickled: Math.min(sa, sb) === 0,
  rallies: 20,
});

// newest first, like storage
const history = [
  game('Dills', 'Bangers', 11, 9, 4000),
  game('Bangers', 'dills', 11, 0, 3000),
  game('Dills', 'Bangers', 11, 5, 2000),
  game('Dills', 'Lobs', 11, 7, 1000),
];

describe('crew stats', () => {
  it('merges names case-insensitively for rivalries', () => {
    const [top] = rivalries(history);
    expect(top.games).toBe(3);
    expect([top.winsA, top.winsB].sort()).toEqual([1, 2]);
  });
  it('tracks current and best streaks', () => {
    const dills = streaks(history).find((s) => s.name.toLowerCase() === 'dills')!;
    expect(dills.current).toBe(1);
    expect(dills.best).toBe(2);
  });
  it('builds a recap for a period', () => {
    const r = recap(history, 2000);
    expect(r.games).toBe(3);
    expect(r.pickles).toBe(1);
    expect(r.mostPickled?.name.toLowerCase()).toBe('dills');
    expect(r.closest?.scores).toEqual([11, 9]);
    const text = recapText(r, 'weekly', 'https://x', '#PP');
    expect(text).toContain('3 games');
    expect(text).toContain('Most pickled');
  });
});

describe('round robin', () => {
  const players = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  it('uses as many courts as players allow and nobody plays twice in a round', () => {
    expect(maxCourts(9)).toBe(2);
    const r = nextRound(players, 3, []);
    expect(r.matches).toHaveLength(2);
    const names = r.matches.flatMap((m) => m.teams.flat());
    expect(new Set([...names, ...r.byes]).size).toBe(9);
    expect(r.byes).toHaveLength(1);
  });
  it('spreads sit-outs fairly and avoids repeat partners', () => {
    const rounds: RRRound[] = [];
    for (let i = 0; i < 9; i++) rounds.push(nextRound(players, 2, rounds));
    const byeCounts = players.map((p) => rounds.filter((r) => r.byes.includes(p)).length);
    expect(Math.max(...byeCounts) - Math.min(...byeCounts)).toBeLessThanOrEqual(1);
    const partners = new Map<string, number>();
    for (const r of rounds)
      for (const m of r.matches)
        for (const [a, b] of m.teams) {
          const k = [a, b].sort().join();
          partners.set(k, (partners.get(k) ?? 0) + 1);
        }
    // 36 possible pairs, 36 partnerships played: repeats should be rare.
    expect(Math.max(...partners.values())).toBeLessThanOrEqual(2);
  });
  it('scores standings from entered winners', () => {
    const r = nextRound(['A', 'B', 'C', 'D'], 1, [], () => 0.5);
    r.matches[0].winner = 0;
    const s = standings(['A', 'B', 'C', 'D'], [r]);
    expect(s.slice(0, 2).map((x) => x.wins)).toEqual([1, 1]);
    expect(s[3].losses).toBe(1);
  });
});
