// The drinking game: King of the Court in 3-point rounds, doubles or singles.
//
// Four players are on court as two pairs (or two players, in singles). They play 3 points (rally scoring), then one
// tap enters the result. At the break everyone drinks a sip for every point their side
// lost, the losing pair rotates off, and the next two waiting players come on. Winners
// stay on, but only for MAX_REIGN rounds in a row, so everyone gets to play. With exactly
// four players in doubles nobody waits, so partners shuffle instead; with two in singles,
// the same two just play on.
//
// Pure functions, no React or storage: easy to test.

/** Points in a round, then a drink break. */
export const ROUND_POINTS = 3;
/** Kings sit out after this many straight round wins (when someone is waiting to play). */
export const MAX_REIGN = 3;
/** Extra sip for the pair that got swept 3-0. */
export const SWEEP_BONUS = 1;
/** Every this many rounds, the break is also a water break. */
export const HYDRATE_EVERY = 6;

/** One side of the net: two players in doubles, one in singles. */
export type Side = string[];

/** A round's score: points won by [kings, challengers]. */
export type RoundScore = [number, number];

/** The four results a round can have (3 points, no ties), kings first. */
export const ROUND_SCORES: RoundScore[] = [
  [3, 0],
  [2, 1],
  [1, 2],
  [0, 3],
];

export interface RoundResult {
  round: number;
  /** [kings, challengers] as they played the round. */
  teams: [Side, Side];
  points: RoundScore;
  /** Sips each player on court drinks at the break. */
  sips: Record<string, number>;
  /** Who rotated off after the round, and who came on. */
  off: string[];
  on: string[];
}

export interface RoundsSession {
  id: string;
  startedAt: number;
  /** Everyone who has played this session, in the order they joined. */
  players: string[];
  /** On court: [kings (stayed on), challengers]. */
  court: [Side, Side];
  /** Waiting to play, next up first. */
  queue: string[];
  /** Straight round wins by the kings. */
  reign: number;
  /** Every round played, oldest first. */
  rounds: RoundResult[];
}

export const pairName = (p: Side) => p.join(' & ');

/** "Ana & Ben win" but "Ana wins". */
const wins = (p: Side) => `${pairName(p)} ${p.length === 1 ? 'wins' : 'win'}`;

/** Players a side has in this format. */
export type TeamSize = 1 | 2;
/** Fewest players for a format: two sides on court. */
export const minPlayers = (size: TeamSize) => size * 2;

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Names as typed, trimmed, without blanks or repeats (ignoring case). */
export function cleanNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names
    .map((n) => n.trim())
    .filter((n) => {
      const key = n.toLowerCase();
      if (!n || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * Start a session: random players on court (two pairs, or two singles players), everyone
 * else in line. Doubles needs 4 or more players, singles 2 or more.
 */
export function startSession(
  names: string[],
  size: TeamSize = 2,
  rng: () => number = Math.random,
  now = Date.now(),
): RoundsSession {
  const players = cleanNames(names);
  if (players.length < minPlayers(size)) throw new Error(`This needs at least ${minPlayers(size)} players.`);
  const order = shuffle(players, rng);
  return {
    id: `${now}`,
    startedAt: now,
    players,
    court: [order.slice(0, size), order.slice(size, size * 2)],
    queue: order.slice(size * 2),
    reign: 0,
    rounds: [],
  };
}

/** Rounds each player has been on court for. */
function roundsPlayed(session: RoundsSession): Map<string, number> {
  const played = new Map<string, number>();
  for (const r of session.rounds) for (const p of r.teams.flat()) played.set(p, (played.get(p) ?? 0) + 1);
  return played;
}

/**
 * With exactly four players, the next partner pairing: everyone partners everyone in
 * turn (AB v CD, then AC v BD, then AD v BC).
 */
function nextPairing(court: [Side, Side], players: string[]): [Side, Side] {
  const [a, b, c, d] = [...court.flat()].sort((x, y) => players.indexOf(x) - players.indexOf(y));
  const pairings: [Side, Side][] = [
    [
      [a, b],
      [c, d],
    ],
    [
      [a, c],
      [b, d],
    ],
    [
      [a, d],
      [b, c],
    ],
  ];
  const partnerOfA = court.find((p) => p.includes(a))!.find((p) => p !== a)!;
  const now = [b, c, d].indexOf(partnerOfA);
  return pairings[(now + 1) % 3];
}

/**
 * Enter a round's result: who drinks what at the break, and who's on court next.
 * `points` is [kings, challengers]; it has to add up to ROUND_POINTS with a winner.
 */
export function recordRound(session: RoundsSession, points: RoundScore): { session: RoundsSession; result: RoundResult } {
  const [k, c] = points;
  if (k + c !== ROUND_POINTS || k === c || k < 0 || c < 0) throw new Error(`A round is ${ROUND_POINTS} points with a winner.`);
  const winner = k > c ? 0 : 1;
  const loser = winner === 0 ? 1 : 0;
  const teams = session.court;

  // A sip for every point your side lost, plus a bonus for getting swept.
  const sips: Record<string, number> = {};
  ([0, 1] as const).forEach((t) => {
    const lost = points[t === 0 ? 1 : 0];
    const swept = points[t] === 0;
    for (const p of teams[t]) sips[p] = lost + (swept ? SWEEP_BONUS : 0);
  });

  // Winners stay on (as the kings) unless they've reigned long enough and someone's waiting.
  let reign = (winner === 0 ? session.reign : 0) + 1;
  let staying = teams[winner];
  let leaving = teams[loser];
  if (reign >= MAX_REIGN && session.queue.length > 0) {
    [staying, leaving] = [leaving, staying];
    reign = 0;
  }

  let court: [Side, Side];
  let queue = [...session.queue];
  let off: string[] = [];
  let on: string[] = [];
  if (teams[0].length === 1) {
    if (queue.length > 0) {
      // Singles: the loser goes to the back of the line and the next player comes on.
      on = [queue[0]];
      queue = [...queue.slice(1), ...leaving];
      off = [...leaving];
      court = [staying, on];
    } else {
      // Just the two of you: play on, the winner as king.
      court = [staying, leaving];
    }
  } else if (queue.length >= 2) {
    // The leaving pair goes to the back of the line; the next two come on together.
    on = queue.slice(0, 2);
    queue = [...queue.slice(2), ...leaving];
    off = [...leaving];
    court = [staying, [on[0], on[1]]];
  } else if (queue.length === 1) {
    // One waiting: the leaving player who has played the most sits; the other partners the newcomer.
    const played = roundsPlayed(session);
    const [sitter, stays] = [...leaving].sort((x, y) => (played.get(y) ?? 0) - (played.get(x) ?? 0));
    on = [queue[0]];
    off = [sitter];
    queue = [sitter];
    court = [staying, [stays, on[0]]];
  } else {
    // Exactly four: nobody waits, so partners shuffle and there are no kings.
    court = nextPairing(teams, session.players);
    reign = 0;
  }

  const result: RoundResult = { round: session.rounds.length + 1, teams, points, sips, off, on };
  return { session: { ...session, court, queue, reign, rounds: [...session.rounds, result] }, result };
}

/** Someone joins: to the back of the line. */
export function addPlayer(session: RoundsSession, name: string): RoundsSession {
  const n = name.trim();
  if (!n || session.players.some((p) => p.toLowerCase() === n.toLowerCase())) return session;
  return { ...session, players: [...session.players, n], queue: [...session.queue, n] };
}

/** Someone heads home. Only from the line: whoever's on court finishes the round first. */
export function removeFromQueue(session: RoundsSession, name: string): RoundsSession {
  return { ...session, queue: session.queue.filter((p) => p !== name) };
}

export interface PlayerTally {
  name: string;
  rounds: number;
  roundsWon: number;
  pointsWon: number;
  sips: number;
}

/** Everyone's night so far, best first (rounds won, then points won). */
export function tallies(session: RoundsSession): PlayerTally[] {
  const map = new Map<string, PlayerTally>(
    session.players.map((name) => [name, { name, rounds: 0, roundsWon: 0, pointsWon: 0, sips: 0 }]),
  );
  for (const r of session.rounds) {
    ([0, 1] as const).forEach((t) => {
      for (const p of r.teams[t]) {
        const s = map.get(p);
        if (!s) continue;
        s.rounds++;
        s.pointsWon += r.points[t];
        if (r.points[t] > r.points[t === 0 ? 1 : 0]) s.roundsWon++;
        s.sips += r.sips[p] ?? 0;
      }
    });
  }
  return [...map.values()].sort((a, b) => b.roundsWon - a.roundsWon || b.pointsWon - a.pointsWon || a.sips - b.sips);
}

const sipsText = (n: number) => `${n} sip${n === 1 ? '' : 's'}`;
/** "2–1", kept on one line (word joiners around the dash). */
const score = (a: number, b: number) => `${a}\u2060–\u2060${b}`;

/** What the break says: who drinks what, and who's off and on. */
export function breakText(result: RoundResult): { title: string; body: string; swept: boolean } {
  const [k, c] = result.points;
  const winner = k > c ? 0 : 1;
  const loser = winner === 0 ? 1 : 0;
  const swept = result.points[loser] === 0;
  const drink = ([loser, winner] as const)
    .map((t) => {
      const n = result.sips[result.teams[t][0]] ?? 0;
      return n > 0 ? `${pairName(result.teams[t])}: ${sipsText(n)}${result.teams[t].length > 1 ? ' each' : ''}.` : '';
    })
    .filter(Boolean)
    .join(' ');
  const moves = result.off.length
    ? ` Off: ${result.off.join(' & ')}. On: ${result.on.join(' & ')}.`
    : result.teams[0].length === 1
      ? ' Play on!'
      : ' Switch partners!';
  const water = result.round % HYDRATE_EVERY === 0 ? ' 💧 Water round: everyone drinks a glass of water too.' : '';
  return {
    title: `${swept ? 'Swept! ' : ''}${wins(result.teams[winner])} ${score(Math.max(k, c), Math.min(k, c))}`,
    body: `Drink up! ${drink}${moves}${water}`,
    swept,
  };
}

/** The end-of-night recap, for sharing. */
export function sessionRecap(session: RoundsSession, link: string, hashtag: string): string {
  const t = tallies(session);
  const king = t[0];
  const thirsty = [...t].sort((a, b) => b.sips - a.sips)[0];
  const lines = [`🍻 PickleParty King of the Court: ${session.rounds.length} rounds`];
  if (king && king.roundsWon > 0) lines.push(`👑 King of the Court: ${king.name} (${king.roundsWon} rounds won)`);
  if (thirsty && thirsty.sips > 0) lines.push(`🍺 Thirstiest: ${thirsty.name} (${sipsText(thirsty.sips)})`);
  lines.push(`${hashtag} ${link}`);
  return lines.join('\n');
}
