import { Redirect, useLocalSearchParams } from 'expo-router';

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

export default function MatchRoute() {
  const { config, first } = useLocalSearchParams<{ config?: string; first?: string }>();
  const parsed = parseConfig(config);
  // A refreshed or shared match link has no live game to resume; start fresh.
  if (!parsed) return <Redirect href="/setup" />;
  return <Match config={parsed} firstServer={(first === '1' ? 1 : 0) as Team} />;
}
