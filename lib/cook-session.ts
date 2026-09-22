'use client';

// What you have already done in the recipe you are cooking right now.
//
// Deliberately per-device and throwaway. Cooking is one person, one kitchen,
// one evening: syncing it to the household would mean a partner opening the
// same recipe tomorrow finds half the steps mysteriously ticked, and storing it
// on the server would outlive the meal. localStorage matches its real lifetime.
//
// Every accessor is wrapped, because storage throws in private windows and
// comes back empty when site data is cleared — and a ticked checkbox is never
// worth breaking the page someone is cooking from.

const KEY_PREFIX = 'aftertaste-cook-';

export interface CookProgress {
  /** Indices of ticked ingredients, as positions in the recipe's list. */
  ingredients: number[];
  /** Indices of ticked instruction steps. */
  steps: number[];
  /** When this session started, so a stale one can be retired. */
  startedAt: number;
}

/** A session older than this is from a previous meal, not this one. */
const STALE_MS = 24 * 60 * 60 * 1000;

const empty = (): CookProgress => ({
  ingredients: [],
  steps: [],
  startedAt: Date.now(),
});

export function loadCookProgress(recipeId: string): CookProgress {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + recipeId);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<CookProgress>;
    if (
      typeof parsed.startedAt !== 'number' ||
      Date.now() - parsed.startedAt > STALE_MS
    ) {
      return empty();
    }
    return {
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      startedAt: parsed.startedAt,
    };
  } catch {
    return empty();
  }
}

export function saveCookProgress(recipeId: string, p: CookProgress): void {
  try {
    localStorage.setItem(KEY_PREFIX + recipeId, JSON.stringify(p));
  } catch {
    // Full or blocked storage — the session just won't survive a reload.
  }
}

export function clearCookProgress(recipeId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + recipeId);
  } catch {
    // ignore
  }
}
