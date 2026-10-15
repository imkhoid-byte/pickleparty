import { describe, expect, it } from '@jest/globals';

import type { GameRecord } from '../../storage';
import { recap, recapText, rivalries, streaks } from '../crew';
import { RRRound, RRSession, addPlayer, maxCourts, nextRound, pairName, recordResult, standings } from '../roundRobin';

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

describe('round robin session', () => {
  const round: RRRound = {
    matches: [{ court: 1, teams: [['Sam', 'Alex'], ['Jo', 'Kim']], winner: null }],
    byes: ['Pat'],
  };
  const session: RRSession = { players: ['Sam', 'Alex', 'Jo', 'Kim', 'Pat'], courts: 1, target: 11, rounds: [round] };
  const names: [string, string] = ['Sam & Alex', 'Jo & Kim'];

  it('records a game scored in the app, and clears it on undo', () => {
    const done = recordResult(session, { round: 0, match: 0 }, names, 1, [7, 11]);
    expect(done.rounds[0].matches[0]).toMatchObject({ winner: 1, score: [7, 11] });
    expect(standings(done.players, done.rounds).slice(0, 2).map((s) => s.name)).toEqual(['Jo', 'Kim']);
    const undone = recordResult(done, { round: 0, match: 0 }, names, null);
    expect(undone.rounds[0].matches[0]).toMatchObject({ winner: null, score: undefined });
  });
  it('ignores results for a game that is no longer in the session', () => {
    expect(recordResult(session, { round: 3, match: 0 }, names, 0)).toBe(session);
    expect(recordResult(session, { round: 0, match: 0 }, ['Sam & Pat', 'Jo & Kim'], 0)).toBe(session);
  });
  it('lets latecomers join, and plays them first', () => {
    const more = addPlayer(addPlayer(session, '  Lee '), 'lee');
    expect(more.players).toEqual([...session.players, 'Lee']);
    const next = nextRound(more.players, 1, more.rounds, () => 0.5);
    const playing = next.matches.flatMap((m) => m.teams.flat());
    expect(playing).toContain('Lee');
    expect(playing).toContain('Pat');
    expect(pairName(['A', 'B'])).toBe('A & B');
  });
});
