'use client';

import { useEffect, useState } from 'react';

// The user's chosen bottom-bar tabs (4 ids, ordered). "More" is always the
// fixed 5th slot, so it isn't stored here. Per-device (localStorage), like the
// app's other UI toggles.

export const TAB_CONFIG_KEY = 'aftertaste-tab-config';
export const DEFAULT_TABS = ['home', 'recipes', 'planner', 'grocery'];
export const MAX_TABS = 4;

const listeners = new Set<() => void>();

export function getTabConfig(): string[] {
  if (typeof localStorage === 'undefined') return DEFAULT_TABS;
  try {
    const raw = localStorage.getItem(TAB_CONFIG_KEY);
    if (!raw) return DEFAULT_TABS;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.filter((x) => typeof x === 'string').slice(0, MAX_TABS);
    }
  } catch {
    // ignore
  }
  return DEFAULT_TABS;
}

export function setTabConfig(ids: string[]): void {
  try {
    localStorage.setItem(TAB_CONFIG_KEY, JSON.stringify(ids.slice(0, MAX_TABS)));
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

export function useTabConfig(): string[] {
  // Read localStorage in the initializer so the bar renders the real tabs on
  // mount (the default is the common case, so no hydration flash for most).
  const [ids, setIds] = useState<string[]>(() => getTabConfig());
  useEffect(() => {
    const read = () => setIds(getTabConfig());
    read();
    listeners.add(read);
    return () => {
      listeners.delete(read);
    };
  }, []);
  return ids;
}
