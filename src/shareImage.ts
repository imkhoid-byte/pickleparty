// Share a captured image (e.g. the result card) to the group chat.

import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

/** "data:image/png;base64,…" → a File the browser's share sheet accepts. */
function dataUrlToFile(dataUrl: string, name: string): File | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return null;
  const bytes = atob(match[2]);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new File([buffer], name, { type: match[1] });
}

/**
 * Share the image, falling back to plain text when images can't be shared.
 * On the web this must run straight from a tap (Safari only opens the share
 * sheet during one), so the image should already be captured.
 */
export async function shareImage(image: string | null, text: string): Promise<void> {
  try {
    if (image && Platform.OS === 'web') {
      const file = dataUrlToFile(image, 'pickleparty-result.png');
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      if (file && nav?.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text });
        return;
      }
    } else if (image && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(image, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share the result' });
      return;
    }
    await Share.share({ message: text });
  } catch {
    // Cancelled, or sharing isn't available: nothing to do.
  }
}
