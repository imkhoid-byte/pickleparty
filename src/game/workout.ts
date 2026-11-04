// The regular (no-drinking) game: play it out, enter the final score, and the losers
// work it off. The bigger the loss, the more reps.

/** Exercises, with how many reps one "unit" of losing is worth (burpees hurt more than squats). */
const EXERCISES: { name: string; per: number; unit?: string }[] = [
  { name: 'squats', per: 2 },
  { name: 'push-ups', per: 1.5 },
  { name: 'lunges (each leg)', per: 1 },
  { name: 'jumping jacks', per: 3 },
  { name: 'burpees', per: 0.75 },
  { name: 'plank', per: 5, unit: 'seconds' },
];

/** A shutout is worth this many points of margin on top. */
const PICKLE_BONUS = 4;

export interface Workout {
  exercise: string;
  reps: number;
  /** "12 squats" or "45-second plank". */
  text: string;
}

/**
 * The losers' workout for a final score: reps grow with the margin (a 1-point loss is
 * a light one, a blowout is not), and getting pickled (shut out) adds a bonus.
 */
export function workoutFor(scores: [number, number], rng: () => number = Math.random): Workout {
  const [hi, lo] = scores[0] >= scores[1] ? scores : [scores[1], scores[0]];
  const margin = Math.max(1, hi - lo) + (lo === 0 ? PICKLE_BONUS : 0);
  const e = EXERCISES[Math.floor(rng() * EXERCISES.length)];
  // 4 units for showing up, plus one per point of margin; at least 5, at most 60.
  const reps = Math.min(60, Math.max(5, Math.round((4 + margin) * e.per)));
  return { exercise: e.name, reps, text: e.unit ? `${reps}-second ${e.name}` : `${reps} ${e.name}` };
}

/** The final score has to have a winner (no ties). Returns a reason it can't be entered, or null. */
export function scoreProblem(scores: [number, number]): string | null {
  if (scores[0] === scores[1]) return 'Somebody has to win: the scores can’t be tied.';
  return null;
}
