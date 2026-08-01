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
  // Read localStorage in the initializer so EVERY mount (including remounts on
  // data-heavy pages like the recipe editor) starts from the real value, not
  // the fallback. On the server localStorage is absent, so it returns the
  // fallback there; the effect re-reads on the client and subscribes to live
  // changes. (An effect-only flip raced with remounts and sometimes never
  // applied; useSyncExternalStore had the same problem.)
  const [value, setValue] = useState(() => getPref(key, fallback));
  useEffect(() => {
    const read = () => setValue(getPref(key, fallback));
    read();
    return subscribe(read);
  }, [key, fallback]);
  return value;
}
