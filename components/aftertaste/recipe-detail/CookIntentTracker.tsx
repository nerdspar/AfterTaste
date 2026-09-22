'use client';

// Notices that someone is probably cooking the recipe they have open, and
// queues the "did you make this?" nudge for a few hours later.
//
// The signal is time spent actually looking at it. Opening a recipe means
// nothing — you might be browsing — but leaving it on screen for minutes is
// what happens when it is propped up on the counter. So this counts *visible*
// time only: it stops while the tab is hidden or the phone is locked, which
// is exactly when someone has walked away.
//
// It renders nothing, queues at most once per mount, and stays quiet whenever
// there is nowhere to send a notification anyway.

import { useEffect, useRef } from 'react';
import { scheduleCookNudge } from '@/app/(app)/push-actions';

interface Props {
  recipeId: string;
  /** Minutes of visible time that count as "cooking this" (Settings). */
  afterMinutes: number;
  /** False when the user has the nudge turned off. */
  enabled: boolean;
}

const POLL_MS = 15_000;

export function CookIntentTracker({ recipeId, afterMinutes, enabled }: Props) {
  const queuedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !recipeId) return;
    queuedRef.current = false;

    const thresholdMs = Math.max(1, afterMinutes) * 60_000;
    let visibleMs = 0;
    let since = document.visibilityState === 'visible' ? Date.now() : null;

    const accumulate = () => {
      if (since != null) {
        visibleMs += Date.now() - since;
        since = Date.now();
      }
    };

    const check = () => {
      accumulate();
      if (visibleMs < thresholdMs || queuedRef.current) return;
      queuedRef.current = true;
      // Best-effort: if this fails the cook simply doesn't get a reminder.
      scheduleCookNudge(recipeId).catch(() => {
        queuedRef.current = false;
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        since = Date.now();
      } else {
        accumulate();
        since = null;
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    const timer = setInterval(check, POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(timer);
    };
  }, [recipeId, afterMinutes, enabled]);

  return null;
}
