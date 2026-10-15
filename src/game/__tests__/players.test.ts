import { describe, expect, it } from '@jest/globals';

import type { GameRecord } from '../../storage';
import { resultPrompt } from '../party';
import { nightRecap, playerRecords, profile, recapText, storylines } from '../players';
import { fairMatchup, randomMatchup, winnersStayMatchup } from '../rotation';

let id = 0;
const g = (a: string[], b: string[], sa: number, sb: number): GameRecord => ({
  id: String(id++),
  date: 1000 + id,
  teamNames: [a.join(' & '), b.join(' & ')],
  scores: [sa, sb],
  winner: sa > sb ? 0 : 1,
  pickled: Math.min(sa, sb) === 0,
  rallies: 0,
  players: [a, b],
});

// newest first
const history = [
  g(['Mike', 'Sara'], ['Dee', 'Ivy'], 11, 0),
  g(['Mike', 'Sara'], ['Dee', 'Ivy'], 11, 8),
  g(['Mike', 'Dee'], ['Sara', 'Ivy'], 9, 11),
  g(['mike', 'Sara'], ['Dee', 'Ivy'], 11, 4),
];

describe('player records', () => {
  it('tracks individuals across rotating partners (names case-insensitive)', () => {
    const rec = playerRecords(history);
    const mike = rec.find((r) => r.name.toLowerCase() === 'mike')!;
    expect([mike.wins, mike.losses]).toEqual([3, 1]);
    expect(rec[0].name).toBe('Sara'); // 4-0
    const dee = rec.find((r) => r.name === 'Dee')!;
    expect(dee.gotPickled).toBe(1);
  });
  it('builds a profile with best partner, nemesis and victim', () => {
    const p = profile(history, 'Dee')!;
    expect(p.nemesis?.name).toBe('Sara');
    expect(p.record.losses).toBe(4);
    const m = profile(history, 'Mike')!;
    expect(m.bestPartner?.name).toBe('Sara');
    expect(m.favoriteVictim?.name).toBe('Dee'); // 3-0 vs Dee, 3-1 vs Ivy
    expect(m.streak).toEqual({ current: 2, best: 2 });
    expect(profile(history, 'Nobody')).toBeNull();
  });
  it('recaps a night', () => {
    const r = nightRecap(history);
    expect(r.mvp?.name).toBe('Sara');
    expect(r.bestDuo?.names.map((n) => n.toLowerCase())).toEqual(['mike', 'sara']);
    expect(r.mostPickled).toEqual({ names: ['Ivy', 'Dee'], times: 1 }); // standings order
    expect(recapText(r, 'L', '#PP')).toContain('MVP: Sara');
  });
});

describe('storylines', () => {
  it('calls out streaks, snapped streaks, revenge and first wins', () => {
    const prior = [g(['A'], ['B'], 11, 3), g(['A'], ['B'], 11, 5), g(['A'], ['B'], 11, 7)];
    const upset = g(['B'], ['A'], 11, 9);
    const lines = storylines(upset, prior);
    expect(lines).toContain("🧊 A's 3-game win streak is over.");
    expect(lines).toContain('😤 Revenge! B got one back on A.');
    expect(lines).toContain('🎉 First win ever for B!');
    const hot = storylines(g(['A'], ['B'], 11, 2), prior);
    expect(hot).toContain('🔥 A has won 4 straight.');
  });
  it('celebrates unbeaten partnerships', () => {
    const lines = storylines(g(['Mike', 'Sara'], ['Dee', 'Ivy'], 11, 6), history);
    expect(lines.some((l) => l.includes('Mike & Sara are 4-0'))).toBe(true);
  });
});

describe('result prompt', () => {
  const players: [string[], string[]] = [['Mike', 'Sara'], ['Dee', 'Ivy']];
  it('picks the right headline', () => {
    expect(resultPrompt({ players, scores: [11, 0], winner: 0 }, 11, 'tipsy').title).toBe('PICKLED!');
    expect(resultPrompt({ players, scores: [2, 11], winner: 1 }, 11, 'tipsy').title).toBe('Blowout');
    expect(resultPrompt({ players, scores: [13, 11], winner: 0 }, 11, 'tipsy').title).toBe('Nail-biter');
    const normal = resultPrompt({ players, scores: [11, 8], winner: 0 }, 11, 'tipsy');
    expect(normal.body).toContain('Dee & Ivy: take 1 sip');
  });
});

describe('rotation', () => {
  const five = ['A', 'B', 'C', 'D', 'E'];
  it('needs enough players', () => {
    expect(randomMatchup(['A', 'B', 'C'], 2)).toBeNull();
    expect(fairMatchup(['A'], [], 1)).toBeNull();
  });
  it('fair rotation spreads sit-outs and mixes partners', () => {
    const played: GameRecord[] = [];
    for (let i = 0; i < 10; i++) {
      const [a, b] = fairMatchup(five, played, 2)!;
      played.unshift(g(a, b, 11, 5));
    }
    const counts = five.map((p) => played.filter((x) => x.players!.flat().includes(p)).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    const pairs = new Map<string, number>();
    for (const x of played)
      for (const side of x.players!) {
        const k = [...side].sort().join();
        pairs.set(k, (pairs.get(k) ?? 0) + 1);
      }
    // 10 possible pairs, 20 partnerships: nobody should be stuck together.
    expect(Math.max(...pairs.values())).toBeLessThanOrEqual(3);
  });
  it('nobody sits out twice in a row when avoidable', () => {
    const played: GameRecord[] = [];
    let lastBench: string | null = null;
    for (let i = 0; i < 8; i++) {
      const [a, b] = fairMatchup(five, played, 2)!;
      const bench = five.find((p) => ![...a, ...b].includes(p))!;
      expect(bench).not.toBe(lastBench);
      lastBench = bench;
      played.unshift(g(a, b, 11, 5));
    }
  });
  it('winners stay for up to two games, then rotate off', () => {
    const six = ['A', 'B', 'C', 'D', 'E', 'F'];
    const played = [g(['A', 'B'], ['C', 'D'], 11, 6)];
    const next = winnersStayMatchup(six, played, 2)!;
    expect(next[0]).toEqual(['A', 'B']);
    expect([...next[1]].sort()).toEqual(['E', 'F']);
    played.unshift(g(['A', 'B'], ['E', 'F'], 11, 9));
    const third = winnersStayMatchup(six, played, 2)!;
    expect(third.flat()).not.toEqual(expect.arrayContaining(['A', 'B']));
  });
});

describe('storyline limits', () => {
  it('only reports one revenge per game', () => {
    const prior = [g(['A', 'B'], ['C', 'D'], 11, 3)];
    const lines = storylines(g(['C', 'D'], ['A', 'B'], 11, 9), prior);
    expect(lines.filter((l) => l.includes('Revenge')).length).toBe(1);
  });
});
