// Small helper around the Web Share API with layered clipboard fallbacks.
//
// - `navigator.share` opens the native share sheet on mobile / installed PWAs,
//   but it (and the async Clipboard API) is ONLY exposed in a secure context
//   (HTTPS or localhost). Over plain http (e.g. a phone hitting a LAN dev URL)
//   both are undefined, so we also fall back to the legacy execCommand('copy')
//   path, which works in insecure contexts.

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'error';

export interface ShareInput {
  title?: string;
  /** Body text — used for the share payload and the clipboard fallback. */
  text?: string;
  url?: string;
}

/** Legacy clipboard copy — works over http where navigator.clipboard is absent. */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined' || !text) return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  // Keep it off-screen but still selectable.
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  try {
    const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent);
    if (isIOS) {
      // iOS ignores textarea.select(); select the node's contents by range.
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      textarea.setSelectionRange(0, text.length);
    } else {
      textarea.select();
    }
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  // Async Clipboard API (secure contexts).
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  return legacyCopy(text);
}

export async function shareOrCopy(input: ShareInput): Promise<ShareResult> {
  const { title, text, url } = input;
  const clip = [text, url].filter(Boolean).join('\n\n') || url || text || '';

  // Prefer the native share sheet when available. Guard with canShare so an
  // unsupported payload skips to the clipboard WITHOUT consuming the user
  // gesture on a rejected share() call.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const data = { title, text, url };
    const canShare =
      typeof navigator.canShare !== 'function' || navigator.canShare(data);
    if (canShare) {
      try {
        await navigator.share(data);
        return 'shared';
      } catch (err) {
        // The user dismissing the sheet is a no-op, not a failure.
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'cancelled';
        }
        // Any other share failure falls through to the clipboard.
      }
    }
  }

  return (await copyToClipboard(clip)) ? 'copied' : 'error';
}
