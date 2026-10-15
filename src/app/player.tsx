import { useLocalSearchParams } from 'expo-router';

import { PlayerProfile } from '../screens/PlayerProfile';
import { ProOnly } from '../screens/ProOnly';

export default function PlayerRoute() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  return (
    <ProOnly reason="playerStats">
      <PlayerProfile name={name ?? ''} />
    </ProOnly>
  );
}
