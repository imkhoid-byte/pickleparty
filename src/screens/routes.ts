import type { MatchConfig, Team } from '../game/scoring';

export type Route =
  | { name: 'home' }
  | { name: 'setup' }
  | { name: 'match'; config: MatchConfig; firstServer: Team }
  | { name: 'deck' }
  | { name: 'history' }
  | { name: 'store' };

export type Navigate = (route: Route) => void;
