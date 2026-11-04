import { describe, expect, it } from '@jest/globals';

import {
  MAX_REIGN,
  RoundsSession,
  addPlayer,
  breakText,
  cleanNames,
  recordRound,
  removeFromQueue,
  sessionRecap,
  startSession,
  tallies,
} from '../rounds';

/** No shuffle: players go on court in the order given. */
const inOrder = () => 0.999;
const start = (names: string[]) => {
  const s = startSession(names, inOrder, 1000);
  // Pin the court to the names' order so the tests read clearly.
  const order = [...names];
  return { ...s, court: [[order[0], order[1]], [order[2], order[3]]], queue: order.slice(4) } as RoundsSession;
};

describe('the drinking game', () => {
  it('needs 4 players, ignoring blanks and repeats', () => {
    expect(cleanNames([' Ana ', 'ana', '', 'Ben'])).toEqual(['Ana', 'Ben']);
    expect(() => startSession(['A', 'B', 'C'])).toThrow();
    const s = startSession(['A', 'B', 'C', 'D', 'E']);
    expect(s.court.flat().length + s.queue.length).toBe(5);
  });

  it('is a sip for every point your side lost, plus one for a sweep', () => {
    const s = start(['Ana', 'Ben', 'Cal', 'Dee', 'Eve', 'Fay']);
    const close = recordRound(s, [2, 1]).result;
    expect(close.sips).toEqual({ Ana: 1, Ben: 1, Cal: 2, Dee: 2 });
    const sweep = recordRound(s, [0, 3]).result;
    expect(sweep.sips).toEqual({ Ana: 4, Ben: 4, Cal: 0, Dee: 0 });
  });

  it('only takes real rounds: 3 points with a winner', () => {
    const s = start(['Ana', 'Ben', 'Cal', 'Dee']);
    expect(() => recordRound(s, [2, 2])).toThrow();
    expect(() => recordRound(s, [3, 1])).toThrow();
  });

  it('rotates the losers off and the next two on; winners stay as kings', () => {
    const s = start(['Ana', 'Ben', 'Cal', 'Dee', 'Eve', 'Fay']);
    const { session, result } = recordRound(s, [2, 1]);
    expect(result.off).toEqual(['Cal', 'Dee']);
    expect(result.on).toEqual(['Eve', 'Fay']);
    expect(session.court).toEqual([
      ['Ana', 'Ben'],
      ['Eve', 'Fay'],
    ]);
    expect(session.queue).toEqual(['Cal', 'Dee']);
    expect(session.reign).toBe(1);
    // The challengers win: they become the kings.
    const next = recordRound(session, [1, 2]).session;
    expect(next.court[0]).toEqual(['Eve', 'Fay']);
    expect(next.reign).toBe(1);
  });

  it(`sends the kings off after ${MAX_REIGN} straight wins, so everyone plays`, () => {
    let s = start(['Ana', 'Ben', 'Cal', 'Dee', 'Eve', 'Fay']);
    for (let i = 1; i < MAX_REIGN; i++) s = recordRound(s, [3, 0]).session;
    expect(s.court[0]).toEqual(['Ana', 'Ben']);
    const { session, result } = recordRound(s, [3, 0]);
    expect(result.off).toEqual(['Ana', 'Ben']);
    expect(session.queue).toContain('Ana');
    expect(session.reign).toBe(0);
  });

  it('with 5 players, one loser sits and the other partners the newcomer', () => {
    const s = start(['Ana', 'Ben', 'Cal', 'Dee', 'Eve']);
    const { session, result } = recordRound(s, [2, 1]);
    expect(result.on).toEqual(['Eve']);
    expect(result.off).toHaveLength(1);
    expect(session.court[1]).toContain('Eve');
    expect(session.court.flat()).toHaveLength(4);
    expect(new Set([...session.court.flat(), ...session.queue]).size).toBe(5);
  });

  it('with exactly 4, partners shuffle so everyone partners everyone', () => {
    let s = start(['Ana', 'Ben', 'Cal', 'Dee']);
    const partnersOfAna = new Set<string>();
    for (let i = 0; i < 3; i++) {
      partnersOfAna.add(s.court.find((p) => p.includes('Ana'))!.find((p) => p !== 'Ana')!);
      const r = recordRound(s, [2, 1]);
      expect(r.result.off).toEqual([]);
      s = r.session;
    }
    expect(partnersOfAna).toEqual(new Set(['Ben', 'Cal', 'Dee']));
  });

  it('lets people join and leave the line', () => {
    let s = start(['Ana', 'Ben', 'Cal', 'Dee']);
    s = addPlayer(s, 'Eve');
    s = addPlayer(s, 'eve');
    expect(s.queue).toEqual(['Eve']);
    s = removeFromQueue(s, 'Eve');
    expect(s.queue).toEqual([]);
  });

  it('keeps score of the night and says it at the break', () => {
    let s = start(['Ana', 'Ben', 'Cal', 'Dee', 'Eve', 'Fay']);
    const first = recordRound(s, [3, 0]);
    s = first.session;
    const text = breakText(first.result);
    expect(text.swept).toBe(true);
    expect(text.title).toBe('Swept! Ana & Ben win 3\u2060–\u20600');
    expect(text.body).toBe('Drink up! Cal & Dee: 4 sips each. Off: Cal & Dee. On: Eve & Fay.');
    const t = tallies(s);
    expect(t[0]).toMatchObject({ roundsWon: 1, pointsWon: 3, sips: 0 });
    expect(t.find((p) => p.name === 'Cal')).toMatchObject({ roundsWon: 0, sips: 4 });
    expect(sessionRecap(s, 'link', '#tag')).toMatch(/Thirstiest: (Cal|Dee) \(4 sips\)/);
  });
});
