'use client';

import { useEffect } from 'react';

type Sentinel = { release: () => Promise<void> };

/**
 * Hold a Screen Wake Lock while `enabled` is true, keeping the device from
 * sleeping (e.g. while a recipe is open). Best-effort — the Wake Lock API isn't
 * available everywhere, and the lock drops when the tab is hidden, so it's
 * re-acquired on return.
 */
export function useKeepAwake(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined') return;
    const wl = (
      navigator as unknown as {
        wakeLock?: { request: (type: 'screen') => Promise<Sentinel> };
      }
    ).wakeLock;
    if (!wl) return;

    let sentinel: Sentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await wl.request('screen');
      } catch {
        // Denied, page not visible, or unsupported — ignore.
      }
    };

    void acquire();

    // The lock is released when the tab is hidden; re-acquire on return.
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
