// The per-ingredient working-out behind a nutrition estimate, and the sum of
// it. Split out from lib/nutrition-estimate so the browser can hold an estimate
// and re-total it after the cook corrects a match — nutrition-estimate itself
// is server-only (it reads process.env and calls the food APIs).
//
// The estimate is a guess made of nine smaller guesses, and until these lines
// were surfaced the cook was asked to "double-check" a single number with no
// way to see what went into it.

import type { FoodItem } from '@/lib/food-db';

/** Why a line contributes what it does. */
export type LineStatus =
  /** Sized and matched — contributes to the totals. */
  | 'ok'
  /** "salt, to taste": named without an amount, correctly worth nothing. */
  | 'negligible'
  /** We could not work out a weight, so we refuse to invent one. */
  | 'unsized'
  /** Sized, but no food record to scale. */
  | 'unmatched';

export interface EstimateLine {
  /** Position in the ingredient list as given, so the UI can line them up. */
  index: number;
  name: string;
  quantity: string;
  /** The term we searched the food database for. Corrections are saved against
   *  this, not the raw line, so "3 cloves garlic, minced" and "2 cloves garlic"
   *  share one remembered answer. */
  term: string;
  /** Grams this line contributes; null when it could not be sized. */
  grams: number | null;
  food: FoodItem | null;
  status: LineStatus;
  /** True when the match came from the household's saved corrections rather
   *  than from scoring — the UI says so, so a wrong one can be found again. */
  remembered: boolean;
}

export interface NutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

function scale(per100: number | null, grams: number): number {
  return per100 == null ? 0 : (per100 * grams) / 100;
}

/** A line counts as handled if we either scaled it or knowingly skipped it. */
export function isAccountedFor(line: EstimateLine): boolean {
  return line.status === 'ok' || line.status === 'negligible';
}

/**
 * Whole-recipe totals from the lines. Pure arithmetic over per-100 g figures,
 * which is what lets the form re-total instantly when a match is swapped —
 * no round trip, no second opinion from the food APIs.
 */
export function sumLines(lines: EstimateLine[]): NutritionTotals {
  const t: NutritionTotals = {
    calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0,
  };
  for (const line of lines) {
    if (line.status !== 'ok' || !line.food || !line.grams) continue;
    const p = line.food.per100;
    t.calories += scale(p.calories, line.grams);
    t.proteinG += scale(p.proteinG, line.grams);
    t.carbsG += scale(p.carbsG, line.grams);
    t.fatG += scale(p.fatG, line.grams);
    t.fiberG += scale(p.fiberG, line.grams);
    t.sugarG += scale(p.sugarG, line.grams);
    t.sodiumMg += scale(p.sodiumMg, line.grams);
  }
  return {
    calories: Math.round(t.calories),
    proteinG: Math.round(t.proteinG),
    carbsG: Math.round(t.carbsG),
    fatG: Math.round(t.fatG),
    fiberG: Math.round(t.fiberG),
    sugarG: Math.round(t.sugarG),
    sodiumMg: Math.round(t.sodiumMg),
  };
}

/**
 * Re-derive a line's status after the cook edits it. A line the estimator could
 * not size becomes usable the moment a weight is typed in, and swapping in a
 * food record clears an unmatched line — so the status has to follow the edit
 * rather than stay as the estimator first labelled it.
 */
export function restatus(line: EstimateLine): EstimateLine {
  if (line.status === 'negligible') return line;
  if (line.grams == null) return { ...line, status: 'unsized' };
  if (!line.food) return { ...line, status: 'unmatched' };
  return { ...line, status: 'ok' };
}
