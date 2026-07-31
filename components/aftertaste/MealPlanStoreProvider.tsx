'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'aftertaste-meal-plan';

// A slot value is either a recipe id or a note. Notes are stored with this
// prefix so the map stays a plain Record<string, string> and old plans (which
// only ever held recipe ids) keep working unchanged. Recipe ids are slugs and
// never contain a colon, so the prefix can't collide with one.
const NOTE_PREFIX = 'note:';

// slotKey (`<ISO date>_<meal>`) -> recipe id or `note:<text>`
type Plan = Record<string, string>;

export type PlanEntry =
  | { type: 'recipe'; recipeId: string }
  | { type: 'note'; text: string };

/** Interpret a stored slot value as either a recipe reference or a free note. */
export function parsePlanEntry(
  value: string | undefined | null,
): PlanEntry | null {
  if (!value) return null;
  if (value.startsWith(NOTE_PREFIX)) {
    return { type: 'note', text: value.slice(NOTE_PREFIX.length) };
  }
  return { type: 'recipe', recipeId: value };
}

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

function assignNote(slotKey: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  planState = { ...planState, [slotKey]: NOTE_PREFIX + trimmed };
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
  assignNote: (slotKey: string, text: string) => void;
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
    <MealPlanContext.Provider value={{ plan, assignSlot, assignNote, clearSlot }}>
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
