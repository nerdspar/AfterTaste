'use client';

// The working-out behind an estimate, and the means to fix it.
//
// A single "2106 kcal — please double-check" is not something anyone can check:
// the cook cannot see that the spaghetti matched spinach pasta, or that a line
// was silently left out because we could not weigh it. This lists every
// ingredient with the weight we used and the food record we matched, and lets
// either be corrected. A corrected match is remembered for the whole household,
// so the same ingredient is only ever fixed once.

import { useEffect, useRef, useState } from 'react';
import {
  SearchIcon,
  XIcon,
  LoaderIcon,
  AlertTriangleIcon,
  RotateCcwIcon,
  BookmarkIcon,
} from 'lucide-react';
import {
  searchFoodDatabase,
  saveIngredientMatch,
  forgetIngredientMatch,
} from '@/app/(app)/food-db-actions';
import type { FoodItem } from '@/lib/food-db';
import {
  restatus,
  type EstimateLine,
} from '@/lib/nutrition-lines';
import { cn } from '@/lib/utils';

interface Props {
  lines: EstimateLine[];
  onChange: (lines: EstimateLine[]) => void;
  /** Re-run the whole estimate — used after forgetting a saved correction. */
  onReestimate: () => void;
}

/** What each status should say when the line needs the cook's attention. */
const PROBLEM: Partial<Record<EstimateLine['status'], string>> = {
  unsized: "Couldn't work out a weight — enter grams to include it",
  unmatched: 'No food matched — pick one to include it',
};

export function EstimateBreakdown({ lines, onChange, onReestimate }: Props) {
  const [picking, setPicking] = useState<EstimateLine | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  const update = (index: number, patch: Partial<EstimateLine>) => {
    onChange(
      lines.map((l) => (l.index === index ? restatus({ ...l, ...patch }) : l)),
    );
  };

  const choose = async (line: EstimateLine, food: FoodItem) => {
    setPicking(null);
    // Every line sharing this term gets the same answer, not just this row —
    // the cook corrected the ingredient, and a recipe can name it twice.
    onChange(
      lines.map((l) =>
        l.term === line.term ? restatus({ ...l, food, remembered: true }) : l,
      ),
    );
    setSaving(line.index);
    try {
      await saveIngredientMatch(line.term, food);
    } finally {
      setSaving(null);
    }
  };

  const forget = async (line: EstimateLine) => {
    setSaving(line.index);
    try {
      await forgetIngredientMatch(line.term);
      onReestimate();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/40">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          What went into this estimate
        </p>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {lines.map((line) => {
          const problem = PROBLEM[line.status];
          return (
            <li key={line.index} className="px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm text-gray-900 dark:text-gray-100">
                  {line.quantity ? `${line.quantity} ` : ''}
                  {line.name}
                </span>
                {line.status === 'negligible' && (
                  <span className="flex-shrink-0 text-[11px] text-gray-400">
                    to taste — no amount
                  </span>
                )}
              </div>

              {line.status !== 'negligible' && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <label className="sr-only" htmlFor={`g-${line.index}`}>
                    Grams for {line.name}
                  </label>
                  <input
                    id={`g-${line.index}`}
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={line.grams == null ? '' : Math.round(line.grams)}
                    onChange={(e) =>
                      update(line.index, {
                        grams: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="—"
                    className={cn(
                      'h-7 w-16 rounded-md border px-2 text-right text-xs tabular-nums',
                      'bg-white text-gray-900 dark:bg-slate-900 dark:text-gray-100',
                      line.grams == null
                        ? 'border-amber-300 dark:border-amber-500/50'
                        : 'border-gray-200 dark:border-gray-700',
                    )}
                  />
                  <span className="text-xs text-gray-400">g</span>

                  <button
                    type="button"
                    onClick={() => setPicking(line)}
                    className={cn(
                      'min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-xs',
                      'hover:bg-gray-50 dark:hover:bg-gray-800',
                      line.food
                        ? 'text-gray-600 dark:text-gray-300'
                        : 'text-amber-700 dark:text-amber-400',
                    )}
                    title={line.food ? 'Change the matched food' : 'Pick a food'}
                  >
                    {line.food ? (
                      <>
                        <span className="underline decoration-dotted underline-offset-2">
                          {line.food.name}
                        </span>
                        {line.food.brand && (
                          <span className="text-gray-400"> · {line.food.brand}</span>
                        )}
                        <span className="text-gray-400">
                          {' '}
                          · {line.food.per100.calories} kcal/100g
                        </span>
                      </>
                    ) : (
                      'Pick a food…'
                    )}
                  </button>

                  {saving === line.index ? (
                    <LoaderIcon className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-gray-400" />
                  ) : line.remembered ? (
                    <button
                      type="button"
                      onClick={() => forget(line)}
                      className="flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10"
                      title="Saved for your household — forget it and match automatically again"
                    >
                      <BookmarkIcon className="h-3 w-3 fill-current" />
                      Saved
                      <RotateCcwIcon className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              )}

              {problem && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                  <AlertTriangleIcon className="h-3 w-3 flex-shrink-0" />
                  {problem}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {picking && (
        <FoodPicker
          line={picking}
          onPick={(food) => choose(picking, food)}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

/** Search the food database for one ingredient, seeded with the term we used. */
function FoodPicker({
  line,
  onPick,
  onClose,
}: {
  line: EstimateLine;
  onPick: (food: FoodItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(line.term);
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Escape closes the picker without touching the match. Bound on the document
  // because focus starts in the search box, and a stray Escape inside a form
  // should never be the thing that dismisses it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      searchFoodDatabase(q)
        .then((r) => {
          if (!cancelled) setResults(r);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">
              Match this ingredient
            </h2>
            <p className="truncate text-xs text-gray-400">
              {line.quantity ? `${line.quantity} ` : ''}
              {line.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-col p-4">
          <div className="relative mb-3">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // This picker lives inside the recipe form; Enter here must not
              // submit the recipe.
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              placeholder="Search foods &amp; brands…"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-100"
            />
          </div>
          <p className="mb-2 text-[11px] text-gray-400">
            Your pick is saved for this household and reused for
            {' '}
            <span className="font-medium text-gray-500 dark:text-gray-400">
              {line.term}
            </span>{' '}
            from now on.
          </p>
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6">
                <LoaderIcon className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : results.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-gray-400">
                {query.trim().length < 2
                  ? 'Type to search Open Food Facts & USDA.'
                  : 'No matches.'}
              </p>
            ) : (
              results.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onPick(f)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left',
                    'hover:bg-gray-50 dark:hover:bg-gray-800/60',
                    f.id === line.food?.id && 'bg-primary-50 dark:bg-primary-500/10',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {f.name}
                    </span>
                    {f.brand && (
                      <span className="block truncate text-xs text-gray-400">
                        {f.brand}
                      </span>
                    )}
                  </span>
                  <span className="flex-shrink-0 text-right text-xs tabular-nums text-gray-400">
                    <span className="block">{f.per100.calories} kcal/100g</span>
                    {f.per100.sodiumMg != null && (
                      <span className="block text-gray-300 dark:text-gray-600">
                        {f.per100.sodiumMg} mg sodium
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
