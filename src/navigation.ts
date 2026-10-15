import { router } from 'expo-router';

import type { MatchConfig, Team } from './game/scoring';
import type { PaywallReason } from './monetization/entitlements';

/** Back if there is somewhere to go back to (web deep links may not have history). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function openPaywall(reason: PaywallReason) {
  router.push({ pathname: '/pro', params: { reason } });
}

export function startMatch(config: MatchConfig, firstServer: Team) {
  router.replace({ pathname: '/match', params: { config: JSON.stringify(config), first: String(firstServer) } });
}
