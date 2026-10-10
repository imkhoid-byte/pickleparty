// In-app purchase boundary. Screens only talk to this file, so swapping in a
// real store SDK (RevenueCat's react-native-purchases is the easiest with Expo)
// touches nothing else. See README "Monetization".

import { PackId } from './game/cards';

export interface PurchaseResult {
  ok: boolean;
  message?: string;
}

/** Store product id for each premium pack (create these in App Store Connect). */
export const PRODUCT_IDS: Partial<Record<PackId, string>> = {
  kitchen: 'pickleparty.pack.kitchen',
  trickshots: 'pickleparty.pack.trickshots',
  afterdark: 'pickleparty.pack.afterdark',
};

export async function purchasePack(pack: PackId): Promise<PurchaseResult> {
  if (__DEV__) {
    // Development builds unlock instantly so every deck can be tested.
    return { ok: true, message: `Unlocked ${pack} (dev build — no charge).` };
  }
  return { ok: false, message: 'Party Packs are coming soon!' };
}

/** Returns packs the store says this user already owns. */
export async function restorePurchases(): Promise<PackId[]> {
  return [];
}
