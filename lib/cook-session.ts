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

// ---------------------------------------------------------------------------
// Running timers, and which recipe you are cooking
// ---------------------------------------------------------------------------
//
// These outlive the cook mode screen on purpose. Swiping back by accident, or
// stepping into another recipe to check something, used to take every running
// timer with it — the timers lived in the component, so unmounting it was the
// same as cancelling them.
//
// They survive a full reload too, which works because a timer stores the
// instant it ends rather than a countdown: restoring it is just reading the
// number back, and the remaining time is still correct however long the app
// was closed.

const TIMERS_KEY = 'aftertaste-timers';
const ACTIVE_COOK_KEY = 'aftertaste-cooking';

export interface StoredTimer {
  id: string;
  /** The step it came from, e.g. "Soften the garlic" or "Step 02". */
  name: string;
  /** How long it was set for, e.g. "20 min". */
  label: string;
  recipeId: string;
  recipeTitle: string;
  /**
   * Where tapping the finished notification should land. Defaults to the
   * recipe; a party's run of show sets its own, since its timers belong to a
   * day rather than to a page of instructions.
   */
  href?: string;
  /**
   * What the timer was started from — a party step's id, say. Lets that row
   * ask "is my timer running?", which is the question you have standing in the
   * kitchen with your hands full.
   */
  sourceId?: string;
  /** Epoch ms. */
  endsAt: number;
  totalSeconds: number;
  done: boolean;
}

/** A finished timer older than this is yesterday's problem. */
const TIMER_KEEP_MS = 2 * 60 * 60 * 1000;

export function loadTimers(): StoredTimer[] {
  try {
    const raw = localStorage.getItem(TIMERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return (parsed as StoredTimer[])
      .filter(
        (t) =>
          t &&
          typeof t.id === 'string' &&
          typeof t.endsAt === 'number' &&
          now - t.endsAt < TIMER_KEEP_MS,
      )
      // One that ran out while the app was closed comes back already finished,
      // so it still gets seen — but see the provider: it does not re-sound the
      // alarm for something that rang hours ago.
      .map((t) => ({ ...t, done: t.done || t.endsAt <= now }));
  } catch {
    return [];
  }
}

export function saveTimers(timers: StoredTimer[]): void {
  try {
    if (timers.length === 0) localStorage.removeItem(TIMERS_KEY);
    else localStorage.setItem(TIMERS_KEY, JSON.stringify(timers));
  } catch {
    // Storage full or blocked — timers just won't survive a reload.
  }
}

/**
 * The recipe cook mode is open for, remembered so that leaving the screen by
 * accident is undoable. Cleared only on an explicit close or finish, which is
 * what separates "I'm done here" from "I swiped the wrong way".
 */
export function loadActiveCook(): string | null {
  try {
    return localStorage.getItem(ACTIVE_COOK_KEY);
  } catch {
    return null;
  }
}

export function saveActiveCook(recipeId: string | null): void {
  try {
    if (recipeId) localStorage.setItem(ACTIVE_COOK_KEY, recipeId);
    else localStorage.removeItem(ACTIVE_COOK_KEY);
  } catch {
    // ignore
  }
}
