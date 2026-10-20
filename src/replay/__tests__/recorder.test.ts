import { describe, expect, it } from '@jest/globals';
import { SEGMENT_EVERY, SEGMENT_MAX, pickSegment } from '../recorder';

describe('Instant Replay', () => {
  it('saves the oldest recording still running, which holds the most footage', () => {
    const segs = [{ startedAt: 30_000 }, { startedAt: 10_000 }, { startedAt: 20_000 }];
    expect(pickSegment(segs)).toBe(segs[1]);
    expect(pickSegment([])).toBeNull();
  });

  it('always has at least 20 seconds to save once it has been filming that long', () => {
    // The oldest running recording started between SEGMENT_MAX - SEGMENT_EVERY and SEGMENT_MAX ago.
    expect(SEGMENT_MAX - SEGMENT_EVERY).toBeGreaterThanOrEqual(20_000);
  });
});
