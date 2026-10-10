// Pure pickleball scoring engine. No React, no storage — easy to test.

export type Team = 0 | 1;
export type Format = 'doubles' | 'singles';
export type ScoringSystem = 'sideout' | 'rally';

export interface MatchConfig {
  format: Format;
  scoring: ScoringSystem;
  /** Points needed to win (11, 15 or 21 are common). */
  target: number;
  teamNames: [string, string];
}

export interface MatchState {
  config: MatchConfig;
  scores: [number, number];
  servingTeam: Team;
  /** Doubles side-out scoring only: which partner is serving. */
  serverNumber: 1 | 2;
  rallies: number;
  sideOuts: number;
  winner: Team | null;
  /** Previous states, newest last, for undo. */
  history: Omit<MatchState, 'history'>[];
}

/** Things that happened on a rally. The party engine turns these into dares. */
export type MatchEvent =
  | { type: 'point'; team: Team }
  | { type: 'sideOut'; to: Team }
  | { type: 'secondServer'; team: Team }
  | { type: 'gamePoint'; team: Team }
  | { type: 'tied'; score: number }
  | { type: 'pickleWatch'; team: Team } // `team` is at 0 and close to getting pickled
  | { type: 'streak'; team: Team; length: number }
  | { type: 'gameOver'; winner: Team; pickled: boolean };

export const other = (t: Team): Team => (t === 0 ? 1 : 0);

export function newMatch(config: MatchConfig, firstServer: Team = 0): MatchState {
  return {
    config,
    scores: [0, 0],
    servingTeam: firstServer,
    // Doubles side-out: the first serving team only gets one server ("0-0-2").
    serverNumber: config.format === 'doubles' && config.scoring === 'sideout' ? 2 : 1,
    rallies: 0,
    sideOuts: 0,
    winner: null,
    history: [],
  };
}

export function isWin(scores: [number, number], team: Team, target: number): boolean {
  return scores[team] >= target && scores[team] - scores[other(team)] >= 2;
}

/** Called-out score, e.g. "4-2-1" for doubles side-out or "4-2" otherwise. */
export function callScore(s: MatchState): string {
  const serving = s.scores[s.servingTeam];
  const receiving = s.scores[other(s.servingTeam)];
  if (s.config.format === 'doubles' && s.config.scoring === 'sideout') {
    return `${serving}-${receiving}-${s.serverNumber}`;
  }
  return `${serving}-${receiving}`;
}

function snapshot(s: MatchState): Omit<MatchState, 'history'> {
  const { history: _history, ...rest } = s;
  return { ...rest, scores: [...rest.scores] as [number, number] };
}

/** Count how many points in a row `team` has scored, using the undo history. */
function pointStreak(s: MatchState, team: Team): number {
  let streak = 0;
  let after = s.scores;
  for (let i = s.history.length - 1; i >= 0; i--) {
    const before = s.history[i].scores;
    if (after[team] > before[team]) streak++;
    else if (after[other(team)] > before[other(team)]) break;
    after = before;
  }
  return streak;
}

/** Record the result of one rally. Returns the new state and what happened. */
export function rallyWonBy(
  s: MatchState,
  team: Team,
): { state: MatchState; events: MatchEvent[] } {
  if (s.winner !== null) return { state: s, events: [] };

  const next: MatchState = {
    ...snapshot(s),
    history: [...s.history, snapshot(s)],
    rallies: s.rallies + 1,
  };
  const events: MatchEvent[] = [];
  const { format, scoring, target } = s.config;

  const scorePoint = () => {
    next.scores[team] += 1;
    events.push({ type: 'point', team });
  };

  if (scoring === 'rally') {
    scorePoint();
    if (team !== s.servingTeam) {
      next.servingTeam = team;
      next.sideOuts += 1;
      events.push({ type: 'sideOut', to: team });
    }
  } else if (team === s.servingTeam) {
    scorePoint();
  } else if (format === 'doubles' && s.serverNumber === 1) {
    next.serverNumber = 2;
    events.push({ type: 'secondServer', team: s.servingTeam });
  } else {
    next.servingTeam = team;
    next.serverNumber = 1;
    next.sideOuts += 1;
    events.push({ type: 'sideOut', to: team });
  }

  const scored = events.some((e) => e.type === 'point');
  if (scored && isWin(next.scores, team, target)) {
    next.winner = team;
    events.push({ type: 'gameOver', winner: team, pickled: next.scores[other(team)] === 0 });
    return { state: next, events };
  }

  if (scored) {
    const [a, b] = next.scores;
    if (a === b && a >= 3) events.push({ type: 'tied', score: a });
    for (const t of [0, 1] as Team[]) {
      const would = [...next.scores] as [number, number];
      would[t] += 1;
      if (isWin(would, t, target)) events.push({ type: 'gamePoint', team: t });
    }
    const loser = other(team);
    if (next.scores[loser] === 0 && next.scores[team] === target - 3) {
      events.push({ type: 'pickleWatch', team: loser });
    }
    const streak = pointStreak(next, team);
    if (streak >= 4 && streak % 2 === 0) events.push({ type: 'streak', team, length: streak });
  }

  return { state: next, events };
}

export function undo(s: MatchState): MatchState {
  if (s.history.length === 0) return s;
  const prev = s.history[s.history.length - 1];
  return { ...prev, history: s.history.slice(0, -1) };
}
