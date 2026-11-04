import { Redirect, useLocalSearchParams } from 'expo-router';

import { Game } from '../screens/Game';

/** /game?names=["A","B"]&target=11 */
export default function GameRoute() {
  const { names, target } = useLocalSearchParams<{ names?: string; target?: string }>();
  let teamNames: [string, string] | null = null;
  try {
    const parsed = JSON.parse(names ?? '');
    if (Array.isArray(parsed) && parsed.length === 2) teamNames = [String(parsed[0]), String(parsed[1])];
  } catch {
    // A broken link: start over.
  }
  const to = Number(target);
  if (!teamNames || !(to > 0)) return <Redirect href="/setup" />;
  return <Game teamNames={teamNames} target={to} />;
}
