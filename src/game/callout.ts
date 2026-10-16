// What the announcer says about the score after each rally: the way players
// call it before serving (serving team's score first, then the server number),
// plus who's serving, but only when that changes.

import { MatchState, other } from './scoring';

const isThreeNumber = (s: MatchState) => s.config.format === 'doubles' && s.config.scoring === 'sideout';

/** "four, two, one". The very first serve of a doubles game is "zero, zero, start". */
export function spokenScore(s: MatchState): string {
  const serving = s.scores[s.servingTeam];
  const receiving = s.scores[other(s.servingTeam)];
  if (!isThreeNumber(s)) return `${serving}, ${receiving}.`;
  const start = serving === 0 && receiving === 0 && s.serverNumber === 2 && s.rallies === 0;
  return start ? '0, 0, start.' : `${serving}, ${receiving}, ${s.serverNumber}.`;
}

/**
 * The score call after a rally (or at the start of a game, with no `before`).
 * Empty when the game is over: the win announcement covers it.
 * `sideOutSaid`: a prompt already said "Side out", so don't say it twice.
 */
export function scoreCallout(before: MatchState | null, after: MatchState, sideOutSaid = false): string {
  if (after.winner !== null) return '';
  const name = after.config.teamNames[after.servingTeam];
  let lead = '';
  if (!before) lead = `${name} serve first.`;
  else if (before.servingTeam !== after.servingTeam) lead = sideOutSaid ? `${name} serving.` : `Side out! ${name} serving.`;
  else if (isThreeNumber(after) && before.serverNumber !== after.serverNumber) lead = 'Second server.';
  return `${lead} ${spokenScore(after)}`.trim();
}
