import { describe, expect, it } from '@jest/globals';

import { CARDS, PACKS, drawWithTeaser } from '../cards';
import {
  FREE_HISTORY_LIMIT,
  TRIAL_DAYS,
  autoPaywall,
  canUsePack,
  computeAccess,
  usablePacks,
  visibleHistory,
} from '../../monetization/entitlements';
import { renderPenalty } from '../spice';

const DAY = 86400000;
const start = 1_700_000_000_000;

describe('reverse trial', () => {
  it('gives Pro for the trial window, then drops to free', () => {
    const day1 = computeAccess({ trialStartedAt: start, subscribed: false, now: start + DAY / 2 });
    expect(day1).toMatchObject({ isPro: true, source: 'trial', trialDaysLeft: TRIAL_DAYS });
    const early = computeAccess({ trialStartedAt: start, subscribed: false, now: start - 5000 });
    expect(early.trialDaysLeft).toBe(TRIAL_DAYS);
    const last = computeAccess({ trialStartedAt: start, subscribed: false, now: start + (TRIAL_DAYS - 0.5) * DAY });
    expect(last.trialDaysLeft).toBe(1);
    const after = computeAccess({ trialStartedAt: start, subscribed: false, now: start + TRIAL_DAYS * DAY });
    expect(after).toMatchObject({ isPro: false, source: 'free', trialEnded: true });
  });
  it('subscription always wins', () => {
    const a = computeAccess({ trialStartedAt: start, subscribed: true, now: start + 100 * DAY });
    expect(a).toMatchObject({ isPro: true, source: 'subscription' });
  });
  it('shows the trial-ended paywall exactly once', () => {
    const free = computeAccess({ trialStartedAt: start, subscribed: false, now: start + 30 * DAY });
    expect(autoPaywall(free, false)).toBe('trialEnded');
    expect(autoPaywall(free, true)).toBeNull();
    const trial = computeAccess({ trialStartedAt: start, subscribed: false, now: start });
    expect(autoPaywall(trial, false)).toBeNull();
  });
});

describe('packs and history', () => {
  const free = computeAccess({ trialStartedAt: null, subscribed: false, now: start });
  const pro = computeAccess({ trialStartedAt: start, subscribed: false, now: start });
  it('classic is free, premium needs Pro or a purchase', () => {
    expect(canUsePack('classic', free, [])).toBe(true);
    expect(canUsePack('kitchen', free, [])).toBe(false);
    expect(canUsePack('kitchen', free, ['kitchen'])).toBe(true);
    expect(canUsePack('afterdark', pro, [])).toBe(true);
  });
  it('drops locked packs from the deck but never empties it', () => {
    expect(usablePacks(['classic', 'kitchen'], free, [])).toEqual(['classic']);
    expect(usablePacks(['kitchen'], free, [])).toEqual(['classic']);
  });
  it('free players see the latest games; nothing is deleted', () => {
    const games = Array.from({ length: 25 }, (_, i) => i);
    expect(visibleHistory(games, free)).toEqual({ shown: games.slice(0, FREE_HISTORY_LIMIT), hidden: 15 });
    expect(visibleHistory(games, pro).hidden).toBe(0);
  });
});

describe('teasers and Date Night', () => {
  it('sometimes serves a locked sample card', () => {
    const deck = CARDS.filter((c) => c.pack === 'classic');
    const locked = CARDS.filter((c) => c.pack === 'kitchen');
    expect(drawWithTeaser(deck, locked, [], () => 0)?.locked).toBe(true);
    expect(drawWithTeaser(deck, locked, [], () => 0.99)?.locked).toBe(false);
    expect(drawWithTeaser(deck, [], [], () => 0)?.locked).toBe(false);
  });
  it('Date Night is an adult pack whose dares only involve your partner', () => {
    expect(PACKS.find((p) => p.id === 'datenight')?.adult).toBe(true);
    const dares = CARDS.filter((c) => c.pack === 'datenight' && c.kind === 'dare');
    for (const d of dares) expect(d.text.toLowerCase()).toMatch(/partner/);
    for (const c of CARDS.filter((x) => x.pack === 'datenight')) {
      expect(renderPenalty(c.text, 'chill', () => 0)).not.toMatch(/\bsips?\b/);
    }
  });
});
