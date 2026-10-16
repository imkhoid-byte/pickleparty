import { describe, expect, it } from '@jest/globals';
import { MatchConfig, MatchState, Team, callScore, newMatch, rallyWonBy, undo } from '../scoring';
import { scoreCallout, spokenScore } from '../callout';

const doubles: MatchConfig = { format: 'doubles', scoring: 'sideout', target: 11, teamNames: ['Dinkers', 'Bangers'] };

function play(s: MatchState, winners: Team[]) {
  const events = [];
  for (const t of winners) {
    const r = rallyWonBy(s, t);
    s = r.state;
    events.push(...r.events);
  }
  return { s, events };
}

describe('side-out doubles', () => {
  it('starts at 0-0-2 and the first fault is an immediate side out', () => {
    let s = newMatch(doubles);
    expect(callScore(s)).toBe('0-0-2');
    s = rallyWonBy(s, 1).state;
    expect(s.servingTeam).toBe(1);
    expect(callScore(s)).toBe('0-0-1');
  });

  it('gives each partner a serve before siding out', () => {
    let { s } = play(newMatch(doubles), [1, 1]); // side out, then team 1 scores
    expect(callScore(s)).toBe('1-0-1');
    s = rallyWonBy(s, 0).state;
    expect(callScore(s)).toBe('1-0-2');
    s = rallyWonBy(s, 0).state;
    expect(s.servingTeam).toBe(0);
    expect(callScore(s)).toBe('0-1-1');
  });

  it('only the serving team scores', () => {
    const { s } = play(newMatch(doubles), [1]);
    expect(s.scores).toEqual([0, 0]);
  });

  it('requires a 2 point lead and flags a pickle', () => {
    const { s, events } = play(newMatch(doubles), Array(11).fill(0));
    expect(s.winner).toBe(0);
    expect(events).toContainEqual({ type: 'gameOver', winner: 0, pickled: true });
    expect(events).toContainEqual({ type: 'pickleWatch', team: 1 });
  });

  it('ignores rallies after the game is over', () => {
    const { s } = play(newMatch(doubles), Array(11).fill(0));
    expect(rallyWonBy(s, 1).state).toBe(s);
  });

  it('undo restores the previous state', () => {
    const start = newMatch(doubles);
    const s = rallyWonBy(start, 0).state;
    const back = undo(s);
    expect(back.scores).toEqual([0, 0]);
    expect(back.history).toHaveLength(0);
    expect(undo(start)).toBe(start);
  });
});

describe('rally scoring and singles', () => {
  it('rally scoring awards every rally and wins by 2', () => {
    const cfg: MatchConfig = { ...doubles, scoring: 'rally', target: 5 };
    let { s } = play(newMatch(cfg), [0, 1, 0, 1, 0, 1, 0, 1]);
    expect(s.scores).toEqual([4, 4]);
    expect(s.winner).toBeNull();
    ({ s } = play(s, [0, 0]));
    expect(s.winner).toBe(0);
    expect(callScore(s)).toBe('6-4');
  });

  it('singles sides out on the first lost rally', () => {
    const cfg: MatchConfig = { ...doubles, format: 'singles' };
    const s = rallyWonBy(newMatch(cfg), 1).state;
    expect(s.servingTeam).toBe(1);
    expect(s.serverNumber).toBe(1);
  });
});

describe('events', () => {
  it('reports game point, ties and streaks', () => {
    const cfg: MatchConfig = { ...doubles, scoring: 'rally' };
    const { events } = play(newMatch(cfg), [0, 0, 0, 0]);
    expect(events).toContainEqual({ type: 'streak', team: 0, length: 4 });
    const tie = play(newMatch(cfg), [0, 0, 0, 1, 1, 1]).events;
    expect(tie).toContainEqual({ type: 'tied', score: 3 });
    const gp = play(newMatch(cfg), Array(10).fill(0)).events;
    expect(gp).toContainEqual({ type: 'gamePoint', team: 0 });
  });
});

describe('score callout', () => {
  const doubles = newMatch({ format: 'doubles', scoring: 'sideout', target: 11, teamNames: ['Lob Squad', 'Dink Floyd'] }, 0);
  it('opens the game like players do', () => {
    expect(scoreCallout(null, doubles)).toBe('Lob Squad serve first. 0, 0, start.');
  });
  it('calls the serving team first, then the server number', () => {
    const point = rallyWonBy(doubles, 0).state;
    expect(scoreCallout(doubles, point)).toBe('1, 0, 2.');
  });
  it('names the new serving team only when the serve changes hands', () => {
    const lost = rallyWonBy(doubles, 1).state; // 0-0-2: the first fault goes straight to a side out
    expect(scoreCallout(doubles, lost)).toBe('Side out! Dink Floyd serving. 0, 0, 1.');
    expect(scoreCallout(doubles, lost, true)).toBe('Dink Floyd serving. 0, 0, 1.');
    const second = rallyWonBy(lost, 0).state;
    expect(scoreCallout(lost, second)).toBe('Second server. 0, 0, 2.');
  });
  it('uses two numbers for rally scoring and singles', () => {
    const rally = newMatch({ format: 'doubles', scoring: 'rally', target: 11, teamNames: ['A', 'B'] }, 0);
    expect(scoreCallout(rally, rallyWonBy(rally, 1).state)).toBe('Side out! B serving. 1, 0.');
    expect(spokenScore(rally)).toBe('0, 0.');
  });
  it('says nothing once the game is over', () => {
    let s = newMatch({ format: 'singles', scoring: 'rally', target: 7, teamNames: ['A', 'B'] }, 0);
    for (let i = 0; i < 7; i++) s = rallyWonBy(s, 0).state;
    expect(scoreCallout(null, s)).toBe('');
  });
});
