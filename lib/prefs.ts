'use client';

import { useSyncExternalStore } from 'react';

// Tiny reactive boolean preferences backed by localStorage, so a toggle in
// Settings is reflected live wherever the pref is read.

export const PREF_CLIPBOARD = 'aftertaste-pref-clipboard';
export const PREF_NOTIFICATIONS = 'aftertaste-pref-notifications';

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
  return useSyncExternalStore(
    subscribe,
    () => getPref(key, fallback),
    () => fallback,
  );
}
