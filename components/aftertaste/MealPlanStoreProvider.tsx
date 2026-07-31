'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'aftertaste-meal-plan';

// slotKey (`<ISO date>_<meal>`) -> recipeId
type Plan = Record<string, string>;

function loadPlan(): Plan {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Plan;
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

function savePlan(plan: Plan) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {}
}

let planState: Plan = loadPlan();
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

function getSnapshot(): Plan {
  return planState;
}

// Must be a stable module-level constant — returning a fresh object here causes
// an infinite render loop with useSyncExternalStore.
const serverSnapshot: Plan = {};
function getServerSnapshot(): Plan {
  return serverSnapshot;
}

function assignSlot(slotKey: string, recipeId: string) {
  planState = { ...planState, [slotKey]: recipeId };
  savePlan(planState);
  emitChange();
}

function clearSlot(slotKey: string) {
  if (!(slotKey in planState)) return;
  const next = { ...planState };
  delete next[slotKey];
  planState = next;
  savePlan(planState);
  emitChange();
}

interface MealPlanContextValue {
  plan: Plan;
  assignSlot: (slotKey: string, recipeId: string) => void;
  clearSlot: (slotKey: string) => void;
}

const MealPlanContext = createContext<MealPlanContextValue | null>(null);

export function MealPlanStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const plan = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <MealPlanContext.Provider value={{ plan, assignSlot, clearSlot }}>
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const ctx = useContext(MealPlanContext);
  if (!ctx)
    throw new Error('useMealPlan must be used within MealPlanStoreProvider');
  return ctx;
}
