import { describe, expect, it } from '@jest/globals';

import {
  addToTab,
  lastCallPrompt,
  momentPrompt,
  promptForEvents,
  switchPrompt,
  tabLine,
} from '../party';
import { MatchConfig, MatchState, PARTY_TARGET, Team, newMatch, rallyWonBy, undo } from '../scoring';
import { renderPenalty } from '../spice';

const party: MatchConfig = {
  format: 'doubles',
  scoring: 'rally',
  target: PARTY_TARGET,
  teamNames: ['Lob Squad', 'Dink Floyd'],
  partyRules: true,
};

/** Play rallies won by these teams, in order. */
function play(s: MatchState, winners: Team[]) {
  let events: ReturnType<typeof rallyWonBy>['events'] = [];
  for (const t of winners) ({ state: s, events } = rallyWonBy(s, t));
  return { state: s, events };
}

describe('Party Rules scoring', () => {
  it('is first to 7: 7-5 wins, and at 6-6 the next point wins', () => {
    const win = play(newMatch(party), [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0]).state;
    expect(win.scores).toEqual([7, 5]);
    expect(win.winner).toBe(0);
    const tied = play(newMatch(party), [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]).state;
    expect(tied.scores).toEqual([6, 6]);
    expect(tied.winner).toBeNull();
    expect(rallyWonBy(tied, 1).state.winner).toBe(1);
  });

  it('switches ends once, when a team first reaches 4', () => {
    const at3 = play(newMatch(party), [0, 0, 0]);
    expect(at3.events.some((e) => e.type === 'switchEnds')).toBe(false);
    const at4 = rallyWonBy(at3.state, 0);
    expect(at4.events.some((e) => e.type === 'switchEnds')).toBe(true);
    expect(at4.state.switched).toBe(true);
    // The other team reaching 4 later doesn't switch again.
    const later = play(at4.state, [1, 1, 1, 1]);
    expect(later.events.some((e) => e.type === 'switchEnds')).toBe(false);
  });

  it('a classic game still needs a 2-point lead and never switches', () => {
    const classic: MatchConfig = { ...party, partyRules: undefined };
    const s = play(newMatch(classic), [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]);
    expect(s.state.scores).toEqual([7, 6]);
    expect(s.state.winner).toBeNull();
    expect(s.state.tab).toBeUndefined();
  });

  it('keeps the tab with the score, so Undo takes back its sips', () => {
    const s = newMatch(party);
    expect(s.tab).toEqual([0, 0]);
    const after = rallyWonBy(s, 0).state;
    const charged = { ...after, tab: addToTab(after.tab!, { team: 1, sips: 2 }) };
    expect(charged.tab).toEqual([0, 2]);
    expect(undo(charged).tab).toEqual([0, 0]);
  });
});

describe('the Bar Tab', () => {
  it('words penalties as tab entries, and a big gulp as 3', () => {
    expect(renderPenalty('{loser}, {sips:2}.', 'tipsy', Math.random, { tab: true })).toBe('{loser}, put 2 on the tab.');
    expect(renderPenalty('Miss and {finish}.', 'tipsy', Math.random, { tab: true })).toBe('Miss and put 3 on the tab.');
    // No drinking, no tab: Chill keeps its exercises.
    expect(renderPenalty('{sips:1}', 'chill', () => 0, { tab: true })).not.toMatch(/tab/);
  });

  it('charges the right team', () => {
    const ace = momentPrompt('ace', 'Lob Squad', 'tipsy', 'Dink Floyd', Math.random, { tab: true, whoTeam: 0 });
    expect(ace.tab).toEqual({ team: 1, sips: 1 });
    expect(ace.body).toMatch(/Dink Floyd, put 1 on the tab/);
    const net = momentPrompt('net', 'Lob Squad', 'tipsy', 'Dink Floyd', Math.random, { tab: true, whoTeam: 0 });
    expect(net.tab).toEqual({ team: 0, sips: 1 });
    // Without Party Rules, prompts charge nothing.
    expect(momentPrompt('ace', 'Lob Squad', 'tipsy').tab).toBeUndefined();

    // 4-1 (not 4-0, where Pickle Watch comes first): a 4-point heater for Lob Squad.
    const { state, events } = play(newMatch(party), [1, 0, 0, 0, 0]);
    const heater = promptForEvents(events, state, 'tipsy', () => 0.99, { tab: true });
    expect(heater?.tab).toEqual({ team: 1, sips: 1 });
  });

  it('adds to one team or both', () => {
    expect(addToTab([1, 2], { team: 'both', sips: 1 })).toEqual([2, 3]);
    expect(addToTab([1, 2], { team: 0, sips: 3 })).toEqual([4, 2]);
    expect(addToTab([1, 2])).toEqual([1, 2]);
  });

  it('settles up at Switch & Sip and Last Call', () => {
    const names: [string, string] = ['Lob Squad', 'Dink Floyd'];
    expect(tabLine([3, 0], names)).toBe('Lob Squad: 3 sips.');
    expect(switchPrompt([3, 1], names, true).body).toMatch(/Lob Squad: 3 sips\. Dink Floyd: 1 sip\./);
    expect(switchPrompt([0, 0], names, true).body).toMatch(/Clean tabs/);
    expect(switchPrompt([2, 2], names, false).title).toBe('Switch Ends');
    const last = lastCallPrompt([1, 5], 0, names, false);
    expect(last.big).toBe(true);
    expect(last.body).toMatch(/Dink Floyd pay the tab on the way off: 5 sips\. Lob Squad: 1 sip\. Lob Squad stay on/);
  });
});
