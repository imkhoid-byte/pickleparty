import { useLocalSearchParams } from 'expo-router';

import { Recap } from '../screens/Recap';

export default function RecapRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <Recap id={id ?? ''} />;
}
