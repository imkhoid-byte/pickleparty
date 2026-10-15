import { useLocalSearchParams } from 'expo-router';

import { PaywallReason } from '../monetization/entitlements';
import { Paywall } from '../screens/Paywall';

export default function ProRoute() {
  const { reason } = useLocalSearchParams<{ reason?: PaywallReason }>();
  return <Paywall reason={reason ?? 'upgrade'} />;
}
