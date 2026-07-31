'use client';

import { useSyncExternalStore } from 'react';
import { recordViewAction } from '@/app/(app)/data-actions';

// ---------------------------------------------------------------------------
// A tiny in-memory store of the recipe ids the user has opened, most recent
// first and de-duplicated. Seeded from the server on load (per-user) and
// persisted through a server action. Powers the dashboard's "Recently Viewed".
// ---------------------------------------------------------------------------

const MAX = 20;

// Stable empty reference for SSR / first paint — required so useSyncExternalStore
// doesn't loop on a fresh array each render.
const EMPTY: string[] = [];

let viewed: string[] = EMPTY;
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): string[] {
  return viewed;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

/** Seed the store from the server's per-user history (called once on load). */
export function hydrateRecentlyViewed(ids: string[]) {
  viewed = ids.slice(0, MAX);
  emitChange();
}

/** Record that a recipe was opened; moves it to the front of the history. */
export function recordRecipeView(id: string) {
  viewed = [id, ...viewed.filter((x) => x !== id)].slice(0, MAX);
  emitChange();
  recordViewAction(id).catch((err) =>
    console.error('[recentlyViewed] record failed', err),
  );
}

/** Ordered recipe ids, most recently viewed first (de-duplicated). */
export function useRecentlyViewedIds(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
