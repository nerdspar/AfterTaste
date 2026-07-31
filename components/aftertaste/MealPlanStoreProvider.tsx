'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import {
  setMealSlotAction,
  clearMealSlotAction,
} from '@/app/(app)/data-actions';

// A slot value is either a recipe id or a note. Notes are stored with this
// prefix so the map stays a plain Record<string, string>. Recipe ids are slugs
// and never contain a colon, so the prefix can't collide with one.
const NOTE_PREFIX = 'note:';

// slotKey (`<YYYY-MM-DD>_<meal>`) -> recipe id or `note:<text>`
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

function reportError(op: string, err: unknown) {
  console.error(`[mealplan] ${op} failed`, err);
}

interface MealPlanContextValue {
  plan: Plan;
  assignSlot: (slotKey: string, recipeId: string) => void;
  assignNote: (slotKey: string, text: string) => void;
  clearSlot: (slotKey: string) => void;
  /** Replace the whole plan (used by realtime sync). */
  replacePlan: (plan: Plan) => void;
}

const MealPlanContext = createContext<MealPlanContextValue | null>(null);

export function MealPlanStoreProvider({
  initialPlan,
  children,
}: {
  initialPlan: Plan;
  children: React.ReactNode;
}) {
  const [plan, setPlan] = useState<Plan>(initialPlan);

  const persist = useCallback(
    (slotKey: string, value: string, prevValue: string | undefined) => {
      setMealSlotAction(slotKey, value).catch((err) => {
        reportError('assign', err);
        setPlan((prev) => {
          const next = { ...prev };
          if (prevValue === undefined) delete next[slotKey];
          else next[slotKey] = prevValue;
          return next;
        });
      });
    },
    [],
  );

  const assignSlot = useCallback(
    (slotKey: string, recipeId: string) => {
      const prevValue = plan[slotKey];
      setPlan((prev) => ({ ...prev, [slotKey]: recipeId }));
      persist(slotKey, recipeId, prevValue);
    },
    [plan, persist],
  );

  const assignNote = useCallback(
    (slotKey: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const value = NOTE_PREFIX + trimmed;
      const prevValue = plan[slotKey];
      setPlan((prev) => ({ ...prev, [slotKey]: value }));
      persist(slotKey, value, prevValue);
    },
    [plan, persist],
  );

  const clearSlot = useCallback(
    (slotKey: string) => {
      if (!(slotKey in plan)) return;
      const prevValue = plan[slotKey];
      setPlan((prev) => {
        const next = { ...prev };
        delete next[slotKey];
        return next;
      });
      clearMealSlotAction(slotKey).catch((err) => {
        reportError('clearSlot', err);
        if (prevValue !== undefined) {
          setPlan((prev) => ({ ...prev, [slotKey]: prevValue }));
        }
      });
    },
    [plan],
  );

  const replacePlan = useCallback((next: Plan) => setPlan(next), []);

  return (
    <MealPlanContext.Provider
      value={{ plan, assignSlot, assignNote, clearSlot, replacePlan }}
    >
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
