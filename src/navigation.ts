import { router } from 'expo-router';

import type { RRLink } from './game/roundRobin';
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

/** Score one round robin game with the full party scorer; Back returns to the round robin. */
export function playRoundRobinGame(config: MatchConfig, link: RRLink) {
  router.push({
    pathname: '/match',
    params: { config: JSON.stringify(config), first: '0', rr: `${link.round}:${link.match}` },
  });
}
