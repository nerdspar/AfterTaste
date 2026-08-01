'use client';

import { useEffect, useState } from 'react';

// Tiny reactive boolean preferences backed by localStorage, so a toggle in
// Settings is reflected live wherever the pref is read.

export const PREF_CLIPBOARD = 'aftertaste-pref-clipboard';
export const PREF_NOTIFICATIONS = 'aftertaste-pref-notifications';
export const PREF_KEEP_AWAKE = 'aftertaste-pref-keep-awake';
// Master switch for the nutrition/macro tracking features (recipe nutrition
// panel, macro editing, and the food log). Off by default — opt-in per user.
export const PREF_NUTRITION = 'aftertaste-pref-nutrition';

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getPref(key: string, fallback: boolean): boolean {
  if (typeof localStorage === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === 'on';
}

export function setPref(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? 'on' : 'off');
  } catch {}
  emit();
}

export function usePref(key: string, fallback: boolean): boolean {
  // Start from `fallback` so server and first client render agree (no hydration
  // mismatch), then read the real localStorage value on mount and subscribe to
  // live changes. useSyncExternalStore proved unreliable here: on a full page
  // load it kept returning the fallback until some unrelated re-render.
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const read = () => setValue(getPref(key, fallback));
    read();
    return subscribe(read);
  }, [key, fallback]);
  return value;
}
