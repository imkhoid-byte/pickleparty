import { router } from 'expo-router';

import type { RRLink } from './game/roundRobin';
import type { MatchConfig, Team } from './game/scoring';
import type { SavedMatch } from './storage';
import type { PaywallReason } from './monetization/entitlements';

/** Back if there is somewhere to go back to (web deep links may not have history). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function openPaywall(reason: PaywallReason) {
  router.push({ pathname: '/pro', params: { reason } });
}

/** A new id for each game, kept in the match screen's address so a reload finds the saved game. */
const newGameId = () => `${Date.now()}`;

export function startMatch(config: MatchConfig, firstServer: Team) {
  router.replace({
    pathname: '/match',
    params: { config: JSON.stringify(config), first: String(firstServer), id: newGameId() },
  });
}

/** Pick up a saved game where it left off. */
export function resumeMatch(saved: SavedMatch) {
  router.push({
    pathname: '/match',
    params: {
      config: JSON.stringify(saved.match.config),
      first: String(saved.firstServer),
      id: saved.id,
      ...(saved.roundRobin ? { rr: saved.roundRobin } : {}),
    },
  });
}

/** Score one round robin game with the full party scorer; Back returns to the round robin. */
export function playRoundRobinGame(config: MatchConfig, link: RRLink) {
  router.push({
    pathname: '/match',
    params: { config: JSON.stringify(config), first: '0', rr: `${link.round}:${link.match}`, id: newGameId() },
  });
}
