// In-app purchase boundary. Screens only talk to this file.
//
// Backed by RevenueCat (react-native-purchases), which handles the App Store,
// Google Play and web (Stripe via RevenueCat Web Billing) with one API. Until
// a RevenueCat key is configured for a platform, `storeReady()` is false and
// the paywall collects waitlist emails instead. See README "Monetization".

import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

import { APP_LINK, PACKS_OFFERING, PRO_ENTITLEMENT, REVENUECAT_KEYS, WAITLIST_FORM } from './config';
import { PACKS, PackId } from './game/cards';

export type PlanId = 'annual' | 'monthly';

export interface Plan {
  id: PlanId;
  title: string;
  price: string;
  detail: string;
  badge?: string;
}

/** Shown when the store can't be reached. Real prices come from the store. */
export const FALLBACK_PLANS: Plan[] = [
  { id: 'annual', title: 'Yearly', price: '$29.99/yr', detail: 'Just $2.50/month', badge: 'SAVE 50%' },
  { id: 'monthly', title: 'Monthly', price: '$4.99/mo', detail: 'Cancel anytime' },
];

export interface StoreState {
  pro: boolean;
  ownedPacks: PackId[];
}

export interface PurchaseResult {
  ok: boolean;
  cancelled?: boolean;
  message?: string;
  state?: StoreState;
}

function apiKey(): string {
  if (Platform.OS === 'ios') return REVENUECAT_KEYS.ios;
  if (Platform.OS === 'android') return REVENUECAT_KEYS.android;
  if (Platform.OS === 'web') return REVENUECAT_KEYS.web;
  return '';
}

let configured = false;

/** True when real purchases are possible on this platform. */
export function storeReady(): boolean {
  return apiKey() !== '';
}

function ensureConfigured(): boolean {
  if (!storeReady()) return false;
  if (!configured) {
    Purchases.configure({ apiKey: apiKey() });
    configured = true;
  }
  return true;
}

const PACK_IDS = PACKS.filter((p) => p.premium).map((p) => p.id);

function toState(info: CustomerInfo): StoreState {
  const bought = new Set(info.nonSubscriptionTransactions.map((t) => t.productIdentifier));
  return {
    pro: info.entitlements.active[PRO_ENTITLEMENT] !== undefined,
    // Store product ids end with the pack id, e.g. "pickleparty.pack.kitchen".
    ownedPacks: PACK_IDS.filter((id) => [...bought].some((pid) => pid.endsWith(id))),
  };
}

const isCancel = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as { userCancelled?: boolean }).userCancelled === true;

const failure = (e: unknown): PurchaseResult =>
  isCancel(e)
    ? { ok: false, cancelled: true }
    : { ok: false, message: e instanceof Error ? e.message : 'Purchase failed. Please try again.' };

export async function fetchStoreState(): Promise<StoreState | null> {
  if (!ensureConfigured()) return null;
  try {
    return toState(await Purchases.getCustomerInfo());
  } catch {
    return null;
  }
}

async function proPackages(): Promise<Partial<Record<PlanId, PurchasesPackage>>> {
  const offering = (await Purchases.getOfferings()).current;
  return { annual: offering?.annual ?? undefined, monthly: offering?.monthly ?? undefined };
}

export async function loadPlans(): Promise<Plan[]> {
  if (!ensureConfigured()) return FALLBACK_PLANS;
  try {
    const pkgs = await proPackages();
    return FALLBACK_PLANS.map((plan) => {
      const pkg = pkgs[plan.id];
      if (!pkg) return plan;
      const suffix = plan.id === 'annual' ? '/yr' : '/mo';
      return { ...plan, price: `${pkg.product.priceString}${suffix}` };
    });
  } catch {
    return FALLBACK_PLANS;
  }
}

export async function purchasePro(plan: PlanId): Promise<PurchaseResult> {
  if (!ensureConfigured()) return { ok: false, message: 'Pro is coming soon!' };
  try {
    const pkg = (await proPackages())[plan];
    if (!pkg) return { ok: false, message: 'That plan is not available right now.' };
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const state = toState(customerInfo);
    return { ok: state.pro, state, message: state.pro ? 'Welcome to Pro! 👑' : undefined };
  } catch (e) {
    return failure(e);
  }
}

export async function purchasePack(pack: PackId): Promise<PurchaseResult> {
  if (!ensureConfigured()) return { ok: false, message: 'Party Packs are coming soon!' };
  try {
    const offering = (await Purchases.getOfferings()).all[PACKS_OFFERING];
    const pkg = offering?.availablePackages.find((p) => p.identifier === pack);
    if (!pkg) return { ok: false, message: 'That pack is not available right now.' };
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { ok: true, state: toState(customerInfo), message: 'Pack unlocked! 🎉' };
  } catch (e) {
    return failure(e);
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!ensureConfigured()) return { ok: false, message: 'Nothing to restore yet.' };
  try {
    const state = toState(await Purchases.restorePurchases());
    const found = state.pro || state.ownedPacks.length > 0;
    return { ok: true, state, message: found ? 'Purchases restored.' : 'No previous purchases found.' };
  } catch (e) {
    return failure(e);
  }
}

/**
 * Before payments are live, the paywall measures real demand: emails go to a
 * Netlify Form on the website (Site → Forms in the Netlify dashboard).
 */
export async function joinWaitlist(email: string, interest: string): Promise<boolean> {
  const body = new URLSearchParams({ 'form-name': WAITLIST_FORM, email, interest, platform: Platform.OS });
  try {
    const res = await fetch(Platform.OS === 'web' ? '/' : `${APP_LINK}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}
