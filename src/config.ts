// App-wide constants. Update APP_LINK once the App Store listing is live.
export const APP_NAME = 'PickleParty';
export const APP_LINK = 'https://picklepartyapp.netlify.app';
export const HASHTAG = '#PickleParty';

export const TERMS_URL = `${APP_LINK}/terms.html`;
export const PRIVACY_URL = `${APP_LINK}/privacy.html`;
/** Bump when the Terms change materially: everyone is asked to agree again. */
export const TERMS_VERSION = '2026-10-19';
export const SUPPORT_EMAIL = 'imkhoid@gmail.com';

/**
 * RevenueCat public API keys (safe to ship in the app). Set them as
 * EXPO_PUBLIC_* environment variables (locally in .env, on EAS/Netlify in
 * their dashboards). With no key for the current platform, the paywall
 * collects waitlist emails instead of taking payments.
 */
export const REVENUECAT_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY ?? '',
};

/** Entitlement id in the RevenueCat dashboard that unlocks Pro. */
export const PRO_ENTITLEMENT = 'pro';
/** RevenueCat offering that holds one package per paid Party Pack (package id = pack id). */
export const PACKS_OFFERING = 'packs';

/** Netlify Form that stores waitlist sign-ups (see public/forms.html). */
export const WAITLIST_FORM = 'pro-waitlist';
