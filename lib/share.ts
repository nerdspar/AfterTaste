// Small helper around the Web Share API with a clipboard fallback.
//
// On mobile / installed PWAs `navigator.share` opens the native share sheet;
// elsewhere (most desktops) it isn't available, so we copy to the clipboard.

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'error';

export interface ShareInput {
  title?: string;
  /** Body text — used for the share payload and the clipboard fallback. */
  text?: string;
  url?: string;
}

export async function shareOrCopy(input: ShareInput): Promise<ShareResult> {
  const { title, text, url } = input;

  // Prefer the native share sheet when the browser supports it.
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      // The user dismissing the sheet is a no-op, not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Any other share failure falls through to the clipboard.
    }
  }

  // Fallback: copy the text (and url) to the clipboard.
  const clip = [text, url].filter(Boolean).join('\n\n') || url || text || '';
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(clip);
      return 'copied';
    }
  } catch {
    // fall through
  }
  return 'error';
}
