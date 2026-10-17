import { Redirect, useLocalSearchParams } from 'expo-router';

import type { RRLink } from '../game/roundRobin';
import { MatchConfig, Team } from '../game/scoring';
import { Match } from '../screens/Match';

function parseConfig(raw: string | undefined): MatchConfig | null {
  try {
    const c = JSON.parse(raw ?? '') as MatchConfig;
    return Array.isArray(c.teamNames) && c.target > 0 ? c : null;
  } catch {
    return null;
  }
}

/** "2:1" → round 2, court game 1 of the saved round robin. */
function parseLink(raw: string | undefined): RRLink | undefined {
  const m = raw?.match(/^(\d+):(\d+)$/);
  return m ? { round: Number(m[1]), match: Number(m[2]) } : undefined;
}

export default function MatchRoute() {
  const { config, first, rr, id } = useLocalSearchParams<{ config?: string; first?: string; rr?: string; id?: string }>();
  const parsed = parseConfig(config);
  // A refreshed or shared match link has no live game to resume; start fresh.
  if (!parsed) return <Redirect href="/setup" />;
  return <Match
      config={parsed}
      firstServer={(first === '1' ? 1 : 0) as Team}
      roundRobin={parseLink(rr)}
      rrParam={rr}
      gameId={id ?? 'unsaved'}
    />;
}
