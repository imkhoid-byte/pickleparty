import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const TAG = 'pickleparty-match';

/**
 * Keep the screen on during a match. With iPhone's default 30-second auto-lock,
 * the phone would otherwise lock between rallies (and the announcer would stop).
 *
 * Browsers drop the wake lock whenever the page is hidden (switching apps,
 * locking the phone), so on the web we take it again when the page comes back.
 */
export function useScreenAwake() {
  useEffect(() => {
    const take = () => {
      activateKeepAwakeAsync(TAG).catch(() => {});
    };
    take();
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return () => {
        deactivateKeepAwake(TAG).catch(() => {});
      };
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') take();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      deactivateKeepAwake(TAG).catch(() => {});
    };
  }, []);
}
