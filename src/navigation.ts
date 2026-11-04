import { router } from 'expo-router';

import type { PaywallReason } from './monetization/entitlements';

/** Back if there is somewhere to go back to (web deep links may not have history). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function openPaywall(reason: PaywallReason) {
  router.push({ pathname: '/pro', params: { reason } });
}

/** A regular game: play it out, then enter the final score. */
export function startGame(teamNames: [string, string], target: number) {
  router.replace({ pathname: '/game', params: { names: JSON.stringify(teamNames), target: String(target) } });
}

/** The drinking game (the session itself is in app state, so it survives a reload). */
export function openRounds(replace = false) {
  if (replace) router.replace('/rounds');
  else router.push('/rounds');
}
