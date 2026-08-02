'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { updateUserPrefs } from '@/app/(app)/user-actions';
import type { UserPrefs } from '@/lib/data';

interface Ctx {
  prefs: UserPrefs;
  set: (patch: Partial<UserPrefs>) => void;
}

const UserPrefsContext = createContext<Ctx | null>(null);

// One-time: pull any prefs this device saved in localStorage (before they were
// DB-backed) into the account, so nobody loses their existing toggles.
const MIGRATED_FLAG = 'aftertaste-prefs-migrated';
function importLegacy(current: UserPrefs, set: (p: Partial<UserPrefs>) => void) {
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return;
    const bool = (k: string): boolean | null => {
      const v = localStorage.getItem(k);
      return v === null ? null : v === 'on';
    };
    const patch: Partial<UserPrefs> = {};
    const n = bool('aftertaste-pref-nutrition');
    if (n !== null && n !== current.nutrition) patch.nutrition = n;
    const k = bool('aftertaste-pref-keep-awake');
    if (k !== null && k !== current.keepAwake) patch.keepAwake = k;
    const no = bool('aftertaste-pref-notifications');
    if (no !== null && no !== current.notifications) patch.notifications = no;
    const cl = bool('aftertaste-pref-clipboard');
    if (cl !== null && cl !== current.clipboard) patch.clipboard = cl;
    const rawTabs = localStorage.getItem('aftertaste-tab-config');
    if (rawTabs) {
      const arr = JSON.parse(rawTabs);
      if (
        Array.isArray(arr) &&
        arr.length > 0 &&
        JSON.stringify(arr) !== JSON.stringify(current.tabs)
      ) {
        patch.tabs = arr.slice(0, 4);
      }
    }
    if (Object.keys(patch).length > 0) set(patch);
    localStorage.setItem(MIGRATED_FLAG, '1');
  } catch {
    // ignore
  }
}

export function UserPrefsProvider({
  initial,
  children,
}: {
  initial: UserPrefs;
  children: React.ReactNode;
}) {
  const [prefs, setPrefs] = useState<UserPrefs>(initial);

  const set = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    // Persist to the account (fields map to the server action's names).
    updateUserPrefs({
      nutritionEnabled: patch.nutrition,
      keepAwake: patch.keepAwake,
      notificationsEnabled: patch.notifications,
      clipboardDetect: patch.clipboard,
      tabConfig: patch.tabs,
    }).catch((err) => console.error('[prefs] save failed', err));
  }, []);

  useEffect(() => {
    importLegacy(initial, set);
    // Only on first mount; `initial`/`set` are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UserPrefsContext.Provider value={{ prefs, set }}>
      {children}
    </UserPrefsContext.Provider>
  );
}

export function useUserPrefs(): Ctx {
  const ctx = useContext(UserPrefsContext);
  if (!ctx)
    throw new Error('useUserPrefs must be used within UserPrefsProvider');
  return ctx;
}
