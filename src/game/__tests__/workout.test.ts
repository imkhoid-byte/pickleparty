import { describe, expect, it } from '@jest/globals';

import { scoreProblem, workoutFor } from '../workout';

const squats = () => 0; // the first exercise

describe('the losers’ workout', () => {
  it('grows with the margin', () => {
    const close = workoutFor([11, 9], squats);
    const blowout = workoutFor([11, 3], squats);
    expect(close.text).toBe('12 squats');
    expect(blowout.reps).toBeGreaterThan(close.reps);
  });

  it('is biggest when you get pickled, and never silly', () => {
    expect(workoutFor([11, 0], squats).reps).toBeGreaterThan(workoutFor([11, 1], squats).reps);
    const plank = workoutFor([21, 0], () => 0.99);
    expect(plank.text).toBe('60-second plank');
    expect(workoutFor([2, 1], () => 0.7).reps).toBeGreaterThanOrEqual(5);
  });

  it('works whichever team won', () => {
    expect(workoutFor([4, 11], squats)).toEqual(workoutFor([11, 4], squats));
  });

  it('needs a winner', () => {
    expect(scoreProblem([7, 7])).not.toBeNull();
    expect(scoreProblem([11, 9])).toBeNull();
  });
});
