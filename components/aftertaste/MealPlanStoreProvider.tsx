'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import {
  setMealSlotAction,
  clearMealSlotAction,
} from '@/app/(app)/data-actions';

// A slot value is either a recipe id or a note. Notes are stored with this
// prefix. Recipe ids are slugs and never contain a colon, so it can't collide.
const NOTE_PREFIX = 'note:';

// slotKey (`<YYYY-MM-DD>_<meal>`) -> ordered list of values (recipe ids and/or
// one `note:<text>`). A slot can hold several recipes plus a note.
type Plan = Record<string, string[]>;

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

const isNote = (value: string) => value.startsWith(NOTE_PREFIX);

function reportError(op: string, err: unknown) {
  console.error(`[mealplan] ${op} failed`, err);
}

interface MealPlanContextValue {
  plan: Plan;
  /** Append a recipe to a slot, keeping any existing entries. */
  addRecipe: (slotKey: string, recipeId: string) => void;
  /** Set (or, with empty text, remove) the slot's single note. */
  setNote: (slotKey: string, text: string) => void;
  /** Remove the entry at a given index within a slot. */
  removeAt: (slotKey: string, index: number) => void;
  /** Remove all entries in a slot. */
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

  // Optimistically set a slot to `values`, persist, and revert on failure.
  const commitSlot = useCallback(
    (slotKey: string, values: string[]) => {
      const prev = plan[slotKey];
      setPlan((p) => {
        const next = { ...p };
        if (values.length === 0) delete next[slotKey];
        else next[slotKey] = values;
        return next;
      });
      const action =
        values.length === 0
          ? clearMealSlotAction(slotKey)
          : setMealSlotAction(slotKey, values);
      action.catch((err) => {
        reportError('commitSlot', err);
        setPlan((p) => {
          const next = { ...p };
          if (prev === undefined) delete next[slotKey];
          else next[slotKey] = prev;
          return next;
        });
      });
    },
    [plan],
  );

  const addRecipe = useCallback(
    (slotKey: string, recipeId: string) => {
      const cur = plan[slotKey] ?? [];
      if (cur.includes(recipeId)) return; // no duplicate recipes in a slot
      // Keep recipes grouped ahead of a trailing note.
      const recipes = cur.filter((v) => !isNote(v));
      const notes = cur.filter(isNote);
      commitSlot(slotKey, [...recipes, recipeId, ...notes]);
    },
    [plan, commitSlot],
  );

  const setNote = useCallback(
    (slotKey: string, text: string) => {
      const trimmed = text.trim();
      const recipes = (plan[slotKey] ?? []).filter((v) => !isNote(v));
      commitSlot(
        slotKey,
        trimmed ? [...recipes, NOTE_PREFIX + trimmed] : recipes,
      );
    },
    [plan, commitSlot],
  );

  const removeAt = useCallback(
    (slotKey: string, index: number) => {
      const cur = plan[slotKey];
      if (!cur) return;
      commitSlot(
        slotKey,
        cur.filter((_, i) => i !== index),
      );
    },
    [plan, commitSlot],
  );

  const clearSlot = useCallback(
    (slotKey: string) => {
      if (!(slotKey in plan)) return;
      commitSlot(slotKey, []);
    },
    [plan, commitSlot],
  );

  const replacePlan = useCallback((next: Plan) => setPlan(next), []);

  return (
    <MealPlanContext.Provider
      value={{ plan, addRecipe, setNote, removeAt, clearSlot, replacePlan }}
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
