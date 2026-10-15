import { ReactNode } from 'react';

import { useApp } from '../AppState';
import { PaywallReason } from '../monetization/entitlements';
import { Paywall } from './Paywall';

/** Pro screens show the paywall instead (e.g. opened from a link, or the trial ended mid-session). */
export function ProOnly({ reason, children }: { reason: PaywallReason; children: ReactNode }) {
  const { access } = useApp();
  return access.isPro ? children : <Paywall reason={reason} />;
}
