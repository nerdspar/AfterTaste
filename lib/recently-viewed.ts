'use client';

import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// A tiny localStorage-backed store of the recipe ids the user has opened, most
// recent first and de-duplicated. Powers the dashboard's "Recently Viewed".
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'aftertaste-recently-viewed';
const MAX = 20;

// Stable empty reference for SSR / first paint — required so useSyncExternalStore
// doesn't loop on a fresh array each render.
const EMPTY: string[] = [];

function load(): string[] {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string');
      }
    }
  } catch {}
  return EMPTY;
}

let viewed: string[] = load();
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

/** Record that a recipe was opened; moves it to the front of the history. */
export function recordRecipeView(id: string) {
  if (typeof window === 'undefined') return;
  const next = [id, ...viewed.filter((x) => x !== id)].slice(0, MAX);
  viewed = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  emitChange();
}

/** Ordered recipe ids, most recently viewed first (de-duplicated). */
export function useRecentlyViewedIds(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
