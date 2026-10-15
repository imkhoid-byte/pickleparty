// Round robin for open play: rotating doubles partners, fair sit-outs.
// Rounds are generated one at a time from what has already been played, so a
// session can run as long as the group wants and players can join late.

export interface RRMatch {
  court: number;
  teams: [[string, string], [string, string]];
  /** Index of the winning team, once entered. */
  winner: 0 | 1 | null;
  /** Final score, when the game was scored in the app. */
  score?: [number, number];
}

export interface RRRound {
  matches: RRMatch[];
  byes: string[];
}

export interface RRStanding {
  name: string;
  wins: number;
  losses: number;
  byes: number;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function tally(rounds: RRRound[]) {
  const played = new Map<string, number>();
  const byes = new Map<string, number>();
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const r of rounds) {
    r.byes.forEach((p) => bump(byes, p));
    for (const { teams } of r.matches) {
      for (const [a, b] of teams) {
        bump(played, a);
        bump(played, b);
        bump(partners, pairKey(a, b));
      }
      for (const a of teams[0]) for (const b of teams[1]) bump(opponents, pairKey(a, b));
    }
  }
  return { played, byes, partners, opponents };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Max courts usable with this many players. */
export const maxCourts = (players: number) => Math.floor(players / 4);

export function nextRound(
  players: string[],
  courts: number,
  previous: RRRound[],
  rng: () => number = Math.random,
): RRRound {
  const used = Math.min(courts, maxCourts(players.length));
  if (used < 1) return { matches: [], byes: [...players] };
  const { played, byes, partners, opponents } = tally(previous);

  // Sit out the players who have played the most (and sat out the least).
  const order = shuffle(players, rng).sort(
    (a, b) =>
      (played.get(a) ?? 0) - (played.get(b) ?? 0) || (byes.get(b) ?? 0) - (byes.get(a) ?? 0),
  );
  const playing = order.slice(0, used * 4);
  const sitting = order.slice(used * 4);

  // Try many random groupings; keep the one with the fewest repeat partners/opponents.
  const cost = (teams: [[string, string], [string, string]]) => {
    let c = 0;
    for (const [a, b] of teams) c += 10 * (partners.get(pairKey(a, b)) ?? 0);
    for (const a of teams[0]) for (const b of teams[1]) c += opponents.get(pairKey(a, b)) ?? 0;
    return c;
  };
  let best: RRMatch[] = [];
  let bestCost = Infinity;
  for (let attempt = 0; attempt < 300 && bestCost > 0; attempt++) {
    const p = shuffle(playing, rng);
    const matches: RRMatch[] = [];
    let total = 0;
    for (let c = 0; c < used; c++) {
      const [a, b, x, y] = p.slice(c * 4, c * 4 + 4);
      const options: [[string, string], [string, string]][] = [
        [[a, b], [x, y]],
        [[a, x], [b, y]],
        [[a, y], [b, x]],
      ];
      const teams = options.reduce((m, o) => (cost(o) < cost(m) ? o : m));
      total += cost(teams);
      matches.push({ court: c + 1, teams, winner: null });
    }
    if (total < bestCost) {
      best = matches;
      bestCost = total;
    }
  }
  return { matches: best, byes: sitting };
}

export function standings(players: string[], rounds: RRRound[]): RRStanding[] {
  const rows = new Map(players.map((name) => [name, { name, wins: 0, losses: 0, byes: 0 }]));
  for (const r of rounds) {
    r.byes.forEach((p) => rows.get(p) && rows.get(p)!.byes++);
    for (const m of r.matches) {
      if (m.winner === null) continue;
      m.teams[m.winner].forEach((p) => rows.get(p) && rows.get(p)!.wins++);
      m.teams[m.winner === 0 ? 1 : 0].forEach((p) => rows.get(p) && rows.get(p)!.losses++);
    }
  }
  return [...rows.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
}

// --- A saved session ----------------------------------------------------------

export interface RRSession {
  players: string[];
  courts: number;
  /** Points per game, used when a court's game is scored in the app. */
  target: number;
  rounds: RRRound[];
}

/** Which game in the session a scored match belongs to. */
export interface RRLink {
  round: number;
  match: number;
}

/** A doubles pair as a team name, e.g. "Sam & Alex". */
export const pairName = (team: [string, string]) => team.join(' & ');

/**
 * Record a court's result. Ignored if the game no longer exists in this session
 * (e.g. the session was ended and a new one started while it was being played).
 * `winner: null` clears it again (the scorer undid the final point).
 */
export function recordResult(
  session: RRSession,
  link: RRLink,
  teamNames: [string, string],
  winner: 0 | 1 | null,
  score?: [number, number],
): RRSession {
  const game = session.rounds[link.round]?.matches[link.match];
  if (!game || pairName(game.teams[0]) !== teamNames[0] || pairName(game.teams[1]) !== teamNames[1]) return session;
  const rounds = session.rounds.map((r, i) =>
    i !== link.round
      ? r
      : { ...r, matches: r.matches.map((m, j) => (j === link.match ? { ...m, winner, score: winner === null ? undefined : score } : m)) },
  );
  return { ...session, rounds };
}

/** Someone showed up late: they join from the next round. Names are unique, ignoring case. */
export function addPlayer(session: RRSession, name: string): RRSession {
  const n = name.trim();
  if (!n || session.players.some((p) => p.toLowerCase() === n.toLowerCase())) return session;
  return { ...session, players: [...session.players, n] };
}
