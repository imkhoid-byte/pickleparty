// Who gets what. Pure functions so the business rules are easy to test and change.
//
// The model:
//   - Scorekeeping and the Classic deck are free forever (they're the marketing).
//   - Every new player gets a 14-day "reverse trial" of Pro, no card needed.
//   - Pro (subscription) unlocks everything; packs can also be bought one by one.
//   - Free players keep all their games, but only the latest 10 are visible.
//   - Free parties shuffle teams randomly; Pro rotates fairly (or winners stay).

import { PACKS, PackId } from '../game/cards';

export const TRIAL_DAYS = 14;
export const FREE_HISTORY_LIMIT = 10;
const DAY = 24 * 60 * 60 * 1000;

export type AccessSource = 'subscription' | 'trial' | 'free';

export interface Access {
  isPro: boolean;
  source: AccessSource;
  /** Whole days left in the trial (0 when not trialing). */
  trialDaysLeft: number;
  trialEnded: boolean;
}

export function computeAccess(opts: {
  trialStartedAt: number | null;
  subscribed: boolean;
  now: number;
}): Access {
  const { trialStartedAt, subscribed, now } = opts;
  const trialEndsAt = trialStartedAt === null ? null : trialStartedAt + TRIAL_DAYS * DAY;
  const inTrial = trialEndsAt !== null && now < trialEndsAt;
  const trialEnded = trialEndsAt !== null && now >= trialEndsAt;
  // Clamp: `now` can be slightly older than the trial start (clock read earlier).
  const trialDaysLeft = inTrial ? Math.min(TRIAL_DAYS, Math.ceil((trialEndsAt - now) / DAY)) : 0;
  if (subscribed) return { isPro: true, source: 'subscription', trialDaysLeft: 0, trialEnded };
  if (inTrial) return { isPro: true, source: 'trial', trialDaysLeft, trialEnded: false };
  return { isPro: false, source: 'free', trialDaysLeft: 0, trialEnded };
}

export function canUsePack(pack: PackId, access: Access, ownedPacks: PackId[]): boolean {
  const info = PACKS.find((p) => p.id === pack);
  if (!info || !info.premium) return true;
  return access.isPro || ownedPacks.includes(pack);
}

/** Packs that are switched on AND currently usable. */
export function usablePacks(active: PackId[], access: Access, ownedPacks: PackId[]): PackId[] {
  const usable = active.filter((p) => canUsePack(p, access, ownedPacks));
  return usable.length > 0 ? usable : ['classic'];
}

export function visibleHistory<T>(history: T[], access: Access): { shown: T[]; hidden: number } {
  if (access.isPro) return { shown: history, hidden: 0 };
  return {
    shown: history.slice(0, FREE_HISTORY_LIMIT),
    hidden: Math.max(0, history.length - FREE_HISTORY_LIMIT),
  };
}

export type PaywallReason =
  | 'trialEnded'
  | 'playerStats'
  | 'history'
  | 'rotation'
  | 'pack'
  | 'customCards'
  | 'upgrade';

/**
 * The one automatic paywall: shown once, the first time the app opens after
 * the trial runs out. Everything else is opt-in (the player taps a locked feature).
 */
export function autoPaywall(access: Access, alreadyShown: boolean): PaywallReason | null {
  if (access.source === 'free' && access.trialEnded && !alreadyShown) return 'trialEnded';
  return null;
}
