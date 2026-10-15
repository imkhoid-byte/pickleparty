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

function parsePlayers(raw: string | undefined): [string[], string[]] | undefined {
  try {
    const p = JSON.parse(raw ?? '') as [string[], string[]];
    return Array.isArray(p) && p.length === 2 ? p : undefined;
  } catch {
    return undefined;
  }
}

export default function MatchRoute() {
  const { config, first, players, session } = useLocalSearchParams<{
    config?: string;
    first?: string;
    players?: string;
    session?: string;
  }>();
  const parsed = parseConfig(config);
  // A refreshed or shared match link has no live game to resume.
  if (!parsed) return <Redirect href="/" />;
  return (
    <Match
      config={parsed}
      firstServer={(first === '1' ? 1 : 0) as Team}
      players={parsePlayers(players)}
      sessionId={session}
    />
  );
}
