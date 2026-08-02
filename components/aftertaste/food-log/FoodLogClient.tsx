'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XIcon,
  SearchIcon,
  Trash2Icon,
  LoaderIcon,
  SaladIcon,
  ScanLineIcon,
} from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import {
  searchFoodDatabase,
  lookupFoodBarcode,
} from '@/app/(app)/food-db-actions';
import type { FoodItem } from '@/lib/food-db';
import { cn } from '@/lib/utils';
import { useUserPrefs } from '@/components/aftertaste/UserPrefsProvider';
import { useCurrentUser } from '@/components/aftertaste/CurrentUserProvider';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import {
  useMealPlan,
  parsePlanEntry,
} from '@/components/aftertaste/MealPlanStoreProvider';
import type { Recipe } from '@/data/sample/recipes';
import {
  loadFoodLog,
  addFoodLogEntry,
  updateFoodLogEntry,
  removeFoodLogEntry,
  type FoodLogEntry,
  type AddFoodLogInput,
} from '@/app/(app)/food-log-actions';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type Meal = (typeof MEALS)[number];

// ---- local-date helpers (mirrors the meal planner's YYYY-MM-DD keys) --------

function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toKey(dt);
}

function prettyDate(key: string, today: string): string {
  if (key === today) return 'Today';
  if (key === shiftKey(today, -1)) return 'Yesterday';
  if (key === shiftKey(today, 1)) return 'Tomorrow';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Sum a per-serving field across an entry's portions.
function scaled(value: number | null | undefined, servings: number): number {
  return value == null ? 0 : value * servings;
}

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function sumTotals(entries: FoodLogEntry[]): Totals {
  return entries.reduce<Totals>(
    (t, e) => ({
      calories: t.calories + scaled(e.calories, e.servings),
      protein: t.protein + scaled(e.proteinG, e.servings),
      carbs: t.carbs + scaled(e.carbsG, e.servings),
      fat: t.fat + scaled(e.fatG, e.servings),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// ---- summary (totals vs goals) ---------------------------------------------

function GoalStat({
  label,
  value,
  goal,
  unit,
  barClass,
}: {
  label: string;
  value: number;
  goal: number | null;
  unit: string;
  barClass: string;
}) {
  const pct =
    goal && goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">
          {Math.round(value)}
          {goal != null && (
            <span className="text-gray-400 dark:text-gray-500">
              {' '}
              / {goal}
            </span>
          )}
          <span className="text-gray-400 dark:text-gray-500">{unit}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn('h-full rounded-full', barClass)}
          style={{ width: `${goal ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}

function DailySummary({
  totals,
  goals,
}: {
  totals: Totals;
  goals: ReturnType<typeof useCurrentUser>['goals'];
}) {
  const calGoal = goals.calories;
  const remaining = calGoal != null ? calGoal - totals.calories : null;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700/40 dark:bg-slate-900">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {Math.round(totals.calories)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            calories {calGoal != null ? `of ${calGoal}` : 'today'}
          </p>
        </div>
        {remaining != null && (
          <div className="text-right">
            <p
              className={cn(
                'text-lg font-semibold tabular-nums',
                remaining < 0
                  ? 'text-rose-500'
                  : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {Math.abs(Math.round(remaining))}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {remaining < 0 ? 'over' : 'left'}
            </p>
          </div>
        )}
      </div>
      {/* Prominent calorie progress bar (macros get their own below). */}
      {calGoal != null && calGoal > 0 && (
        <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              totals.calories > calGoal ? 'bg-rose-500' : 'bg-primary-500',
            )}
            style={{
              width: `${Math.min(100, Math.round((totals.calories / calGoal) * 100))}%`,
            }}
          />
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <GoalStat
          label="Protein"
          value={totals.protein}
          goal={goals.protein}
          unit="g"
          barClass="bg-primary-500"
        />
        <GoalStat
          label="Carbs"
          value={totals.carbs}
          goal={goals.carbs}
          unit="g"
          barClass="bg-secondary-500"
        />
        <GoalStat
          label="Fat"
          value={totals.fat}
          goal={goals.fat}
          unit="g"
          barClass="bg-amber-400"
        />
      </div>
    </div>
  );
}

// ---- add-food modal ---------------------------------------------------------

// Fractions of the whole recipe, for the "by portion" amount mode.
const PORTIONS = [
  { label: '⅛', v: 1 / 8 },
  { label: '¼', v: 1 / 4 },
  { label: '⅓', v: 1 / 3 },
  { label: '½', v: 1 / 2 },
  { label: '⅔', v: 2 / 3 },
  { label: '¾', v: 3 / 4 },
  { label: 'Whole', v: 1 },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function AddFoodModal({
  meal,
  planned,
  onClose,
  onAdd,
}: {
  meal: Meal;
  planned: Recipe[];
  onClose: () => void;
  onAdd: (input: Omit<AddFoodLogInput, 'date'>) => void;
}) {
  const { recipes } = useRecipeStore();
  const [tab, setTab] = useState<'recipe' | 'database' | 'quick'>('recipe');
  const [query, setQuery] = useState('');
  // A picked recipe opens the amount step.
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [amtMode, setAmtMode] = useState<'servings' | 'portion'>('servings');
  const [amtServings, setAmtServings] = useState<number | ''>(1);
  const [fraction, setFraction] = useState(1);
  // Quick-add fields.
  const [name, setName] = useState('');
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');
  // Food-database tab.
  const [dbQuery, setDbQuery] = useState('');
  const [dbResults, setDbResults] = useState<FoodItem[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState<number | ''>(100);
  const [scanning, setScanning] = useState(false);
  const [barcodeMsg, setBarcodeMsg] = useState('');

  // Debounced food-database search.
  useEffect(() => {
    const q = dbQuery.trim();
    if (q.length < 2) {
      setDbResults([]);
      return;
    }
    let cancelled = false;
    setDbLoading(true);
    const t = setTimeout(() => {
      searchFoodDatabase(q)
        .then((r) => {
          if (!cancelled) setDbResults(r);
        })
        .finally(() => {
          if (!cancelled) setDbLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [dbQuery]);

  function pickFood(f: FoodItem) {
    setSelectedFood(f);
    setGrams(f.servingSizeG ?? 100);
    setScanning(false);
    setBarcodeMsg('');
  }

  async function handleBarcode(code: string) {
    setScanning(false);
    setDbLoading(true);
    const f = await lookupFoodBarcode(code);
    setDbLoading(false);
    if (f) pickFood(f);
    else setBarcodeMsg(`No product found for barcode ${code}.`);
  }

  function addFood() {
    if (!selectedFood) return;
    const g = grams === '' || grams <= 0 ? 100 : Number(grams);
    const factor = g / 100;
    const p = selectedFood.per100;
    const scale = (v: number | null) => (v == null ? null : Math.round(v * factor));
    onAdd({
      meal,
      name: `${selectedFood.name}${selectedFood.brand ? ` (${selectedFood.brand})` : ''} · ${g} g`,
      servings: 1,
      calories: Math.round(p.calories * factor),
      proteinG: scale(p.proteinG),
      carbsG: scale(p.carbsG),
      fatG: scale(p.fatG),
      fiberG: scale(p.fiberG),
      sugarG: scale(p.sugarG),
      sodiumMg: scale(p.sodiumMg),
    });
    onClose();
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? recipes.filter((r) => r.title.toLowerCase().includes(q))
      : recipes;
    return list.slice(0, 40);
  }, [recipes, query]);

  const inputCls =
    'w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30';

  function addQuick() {
    if (!name.trim() || calories === '') return;
    onAdd({
      meal,
      name: name.trim(),
      servings: 1,
      calories: Number(calories),
      proteinG: protein === '' ? null : Number(protein),
      carbsG: carbs === '' ? null : Number(carbs),
      fatG: fat === '' ? null : Number(fat),
    });
    onClose();
  }

  // Servings actually eaten, from whichever amount mode is active.
  const finalServings =
    amtMode === 'portion' && selected
      ? round2(selected.servings * fraction)
      : amtServings === '' || amtServings <= 0
        ? 1
        : Number(amtServings);

  function addSelected() {
    if (!selected) return;
    onAdd({
      meal,
      recipeId: selected.id,
      name: selected.title,
      servings: finalServings,
      calories: selected.calories,
      proteinG: selected.proteinG ?? null,
      carbsG: selected.carbsG ?? null,
      fatG: selected.fatG ?? null,
      fiberG: selected.fiberG ?? null,
      sugarG: selected.sugarG ?? null,
      sodiumMg: selected.sodiumMg ?? null,
    });
    onClose();
  }

  const chip = (active: boolean) =>
    cn(
      'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
      active
        ? 'bg-primary-500 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300',
    );

  const RecipeRow = ({ r }: { r: Recipe }) => (
    <button
      type="button"
      onClick={() => {
        setSelected(r);
        setAmtMode('servings');
        setAmtServings(1);
        setFraction(1);
      }}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60"
    >
      <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
        {r.title}
      </span>
      <span className="flex-shrink-0 text-xs tabular-nums text-gray-400">
        {r.calories} kcal
      </span>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">
            {selected
              ? selected.title
              : selectedFood
                ? selectedFood.name
                : `Add to ${meal}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {selected ? (
          /* Amount step — how much of the recipe did you eat? */
          <div className="space-y-4 p-4">
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
              {(['servings', 'portion'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAmtMode(m)}
                  className={cn(
                    'flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    amtMode === m
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
                  )}
                >
                  {m === 'servings' ? 'By serving' : 'By portion'}
                </button>
              ))}
            </div>

            {amtMode === 'servings' ? (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Servings eaten
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={amtServings}
                  onChange={(e) =>
                    setAmtServings(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                  className={cn(inputCls, 'mt-1')}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[0.5, 1, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAmtServings(s)}
                      className={chip(amtServings === s)}
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmtServings(selected.servings)}
                    className={chip(amtServings === selected.servings)}
                  >
                    Whole ({selected.servings})
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Portion of the whole recipe (makes {selected.servings})
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {PORTIONS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFraction(p.v)}
                      className={chip(fraction === p.v)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live preview of what will be logged */}
            <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800/50">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {Math.round(selected.calories * finalServings)} kcal
              </span>
              <span className="text-gray-400">
                {selected.proteinG != null &&
                  ` · ${Math.round(selected.proteinG * finalServings)}p`}
                {selected.carbsG != null &&
                  ` · ${Math.round(selected.carbsG * finalServings)}c`}
                {selected.fatG != null &&
                  ` · ${Math.round(selected.fatG * finalServings)}f`}
                {`  (${finalServings} serving${finalServings === 1 ? '' : 's'})`}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-10 flex-1 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={addSelected}
                className="h-10 flex-[2] rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600"
              >
                Add to {meal}
              </button>
            </div>
          </div>
        ) : selectedFood ? (
          /* Amount step for a food-database item — by grams */
          <div className="space-y-4 p-4">
            {selectedFood.brand && (
              <p className="-mt-1 text-xs text-gray-400">{selectedFood.brand}</p>
            )}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Amount (grams)
              </label>
              <input
                type="number"
                min={0}
                value={grams}
                onChange={(e) =>
                  setGrams(e.target.value === '' ? '' : Number(e.target.value))
                }
                className={cn(inputCls, 'mt-1')}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedFood.servingSizeG && (
                  <button
                    type="button"
                    onClick={() => setGrams(selectedFood.servingSizeG!)}
                    className={chip(grams === selectedFood.servingSizeG)}
                  >
                    1 serving ({selectedFood.servingSizeG} g)
                  </button>
                )}
                {[50, 100, 200].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrams(g)}
                    className={chip(grams === g)}
                  >
                    {g} g
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800/50">
              {(() => {
                const g = grams === '' || grams <= 0 ? 0 : Number(grams);
                const f = g / 100;
                const p = selectedFood.per100;
                return (
                  <>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {Math.round(p.calories * f)} kcal
                    </span>
                    <span className="text-gray-400">
                      {p.proteinG != null && ` · ${Math.round(p.proteinG * f)}p`}
                      {p.carbsG != null && ` · ${Math.round(p.carbsG * f)}c`}
                      {p.fatG != null && ` · ${Math.round(p.fatG * f)}f`}
                      {`  (${g} g)`}
                    </span>
                  </>
                );
              })()}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedFood(null)}
                className="h-10 flex-1 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={addFood}
                className="h-10 flex-[2] rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600"
              >
                Add to {meal}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-1 border-b border-gray-100 px-4 pt-2 dark:border-gray-800">
              {(['recipe', 'database', 'quick'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'rounded-t-lg px-3 py-2 text-sm font-medium',
                    tab === t
                      ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
                  )}
                >
                  {t === 'recipe'
                    ? 'Your recipes'
                    : t === 'database'
                      ? 'Food database'
                      : 'Quick add'}
                </button>
              ))}
            </div>

            {tab === 'recipe' ? (
              <div className="flex min-h-0 flex-col p-4">
                <div className="relative mb-3">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your recipes…"
                    className={cn(inputCls, 'pl-9')}
                  />
                </div>
                <div className="-mx-1 min-h-0 flex-1 overflow-y-auto">
                  {/* Recommended: what's planned for this day */}
                  {!query.trim() && planned.length > 0 && (
                    <div className="mb-2">
                      <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        On your meal plan today
                      </p>
                      {planned.map((r) => (
                        <RecipeRow key={`plan-${r.id}`} r={r} />
                      ))}
                      <p className="mt-2 px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        All recipes
                      </p>
                    </div>
                  )}
                  {matches.length === 0 ? (
                    <p className="px-1 py-6 text-center text-sm text-gray-400">
                      No recipes match.
                    </p>
                  ) : (
                    matches.map((r) => <RecipeRow key={r.id} r={r} />)
                  )}
                </div>
              </div>
            ) : tab === 'database' ? (
              <div className="flex min-h-0 flex-col p-4">
                <div className="mb-3 flex gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      autoFocus
                      value={dbQuery}
                      onChange={(e) => {
                        setDbQuery(e.target.value);
                        setBarcodeMsg('');
                      }}
                      placeholder="Search foods &amp; brands…"
                      className={cn(inputCls, 'pl-9')}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScanning(true);
                      setBarcodeMsg('');
                    }}
                    className="flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <ScanLineIcon className="h-4 w-4" />
                    Scan
                  </button>
                </div>
                {barcodeMsg && (
                  <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    {barcodeMsg}
                  </p>
                )}
                <div className="-mx-1 min-h-0 flex-1 overflow-y-auto">
                  {dbLoading ? (
                    <div className="flex justify-center py-6">
                      <LoaderIcon className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : dbResults.length === 0 ? (
                    <p className="px-1 py-6 text-center text-sm text-gray-400">
                      {dbQuery.trim().length < 2
                        ? 'Search Open Food Facts & USDA, or scan a barcode.'
                        : 'No matches.'}
                    </p>
                  ) : (
                    dbResults.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => pickFood(f)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60"
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
                        <span className="flex-shrink-0 text-xs tabular-nums text-gray-400">
                          {f.per100.calories}
                          <span className="text-gray-300 dark:text-gray-600">
                            {' '}
                            kcal/100g
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
          <div className="space-y-3 p-4">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Food name"
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Calories
                <input
                  type="number"
                  min={0}
                  value={calories}
                  onChange={(e) =>
                    setCalories(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                  className={cn(inputCls, 'mt-1')}
                />
              </label>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Protein (g)
                <input
                  type="number"
                  min={0}
                  value={protein}
                  onChange={(e) =>
                    setProtein(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                  className={cn(inputCls, 'mt-1')}
                />
              </label>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Carbs (g)
                <input
                  type="number"
                  min={0}
                  value={carbs}
                  onChange={(e) =>
                    setCarbs(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={cn(inputCls, 'mt-1')}
                />
              </label>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Fat (g)
                <input
                  type="number"
                  min={0}
                  value={fat}
                  onChange={(e) =>
                    setFat(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={cn(inputCls, 'mt-1')}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={addQuick}
              disabled={!name.trim() || calories === ''}
              className="h-10 w-full rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              Add food
            </button>
          </div>
            )}
          </>
        )}
      </div>

      {scanning && (
        <BarcodeScanner
          onDetected={handleBarcode}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}

// ---- edit an existing entry -------------------------------------------------

function amountChip(active: boolean): string {
  return cn(
    'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
    active
      ? 'bg-primary-500 text-white'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300',
  );
}

function EditEntrySheet({
  entry,
  recipe,
  onClose,
  onSave,
  onRemove,
}: {
  entry: FoodLogEntry;
  recipe?: Recipe; // resolved from entry.recipeId — enables portion mode
  onClose: () => void;
  onSave: (servings: number) => void;
  onRemove: () => void;
}) {
  const canPortion = !!recipe && recipe.servings > 0;
  const [amtMode, setAmtMode] = useState<'servings' | 'portion'>('servings');
  const [servings, setServings] = useState<number | ''>(entry.servings);
  const [fraction, setFraction] = useState(1);

  const finalServings =
    amtMode === 'portion' && recipe
      ? round2(recipe.servings * fraction)
      : servings === '' || servings <= 0
        ? entry.servings
        : Number(servings);

  const preview = (v: number | null) =>
    v == null ? null : Math.round(v * finalServings);

  const inputCls =
    'w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">
            {entry.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          {canPortion && (
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
              {(['servings', 'portion'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAmtMode(m)}
                  className={cn(
                    'flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    amtMode === m
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
                  )}
                >
                  {m === 'servings' ? 'By serving' : 'By portion'}
                </button>
              ))}
            </div>
          )}

          {amtMode === 'servings' || !recipe ? (
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Servings
              </label>
              <input
                type="number"
                min={0}
                step={0.25}
                value={servings}
                onChange={(e) =>
                  setServings(
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
                className={cn(inputCls, 'mt-1')}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setServings(s)}
                    className={amountChip(servings === s)}
                  >
                    {s}
                  </button>
                ))}
                {canPortion && (
                  <button
                    type="button"
                    onClick={() => setServings(recipe.servings)}
                    className={amountChip(servings === recipe.servings)}
                  >
                    Whole ({recipe.servings})
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Portion of the whole recipe (makes {recipe.servings})
              </label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {PORTIONS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setFraction(p.v)}
                    className={amountChip(fraction === p.v)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800/50">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {Math.round(entry.calories * finalServings)} kcal
            </span>
            <span className="text-gray-400">
              {entry.proteinG != null && ` · ${preview(entry.proteinG)}p`}
              {entry.carbsG != null && ` · ${preview(entry.carbsG)}c`}
              {entry.fatG != null && ` · ${preview(entry.fatG)}f`}
              {`  (${finalServings} serving${finalServings === 1 ? '' : 's'})`}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRemove}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:border-gray-700 dark:hover:bg-rose-500/10"
            >
              <Trash2Icon className="h-4 w-4" />
              Remove
            </button>
            <button
              type="button"
              onClick={() => onSave(finalServings)}
              className="h-10 flex-1 rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- meal section -----------------------------------------------------------

function MealSection({
  meal,
  entries,
  onAdd,
  onEdit,
}: {
  meal: Meal;
  entries: FoodLogEntry[];
  onAdd: () => void;
  onEdit: (entry: FoodLogEntry) => void;
}) {
  const mealCals = entries.reduce(
    (s, e) => s + scaled(e.calories, e.servings),
    0,
  );
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700/40 dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {meal}
          </h3>
          {mealCals > 0 && (
            <span className="text-xs tabular-nums text-gray-400">
              {Math.round(mealCals)} kcal
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      {entries.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {entries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onEdit(e)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {e.name}
                </p>
                <p className="text-xs text-gray-400">
                  {Math.round(scaled(e.calories, e.servings))} kcal
                  {e.proteinG != null &&
                    ` · ${Math.round(scaled(e.proteinG, e.servings))}p`}
                  {e.carbsG != null &&
                    ` · ${Math.round(scaled(e.carbsG, e.servings))}c`}
                  {e.fatG != null &&
                    ` · ${Math.round(scaled(e.fatG, e.servings))}f`}
                </p>
              </div>
              {e.servings !== 1 && (
                <span className="flex-shrink-0 text-xs tabular-nums text-gray-400">
                  {e.servings}×
                </span>
              )}
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- page -------------------------------------------------------------------

export function FoodLogClient() {
  const nutritionOn = useUserPrefs().prefs.nutrition;
  const { goals } = useCurrentUser();
  const { plan } = useMealPlan();
  const { getRecipe } = useRecipeStore();

  // Client-only prefs read as their fallback until mount; gate the whole page
  // on a mounted flag so we never flash the "off" screen before we know.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [today] = useState(() => toKey(new Date()));
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMeal, setAddMeal] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<FoodLogEntry | null>(null);

  // Recipes planned for this day (any meal), recommended first when adding.
  const plannedRecipes = useMemo(() => {
    const seen = new Set<string>();
    const out: Recipe[] = [];
    for (const meal of MEALS) {
      for (const value of plan[`${date}_${meal}`] ?? []) {
        const entry = parsePlanEntry(value);
        if (!entry || entry.type !== 'recipe' || seen.has(entry.recipeId))
          continue;
        const r = getRecipe(entry.recipeId);
        if (r) {
          seen.add(entry.recipeId);
          out.push(r);
        }
      }
    }
    return out;
  }, [plan, date, getRecipe]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadFoodLog(date)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const totals = useMemo(() => sumTotals(entries), [entries]);

  async function handleAdd(input: Omit<AddFoodLogInput, 'date'>) {
    const created = await addFoodLogEntry({ ...input, date });
    setEntries((prev) => [...prev, created]);
  }

  async function handleRemove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await removeFoodLogEntry(id);
  }

  async function handleServings(id: string, servings: number) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, servings } : e)),
    );
    await updateFoodLogEntry(id, { servings });
  }

  if (!mounted) {
    return (
      <div className="flex justify-center py-16">
        <LoaderIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!nutritionOn) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <SaladIcon className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Food log is off
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Turn on nutrition &amp; macro tracking to log what you eat and track
          it against your goals.
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600"
        >
          Open Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-gray-100">
        Food Log
      </h1>

      {/* Date navigator */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => setDate((d) => shiftKey(d, -1))}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {prettyDate(date, today)}
          </p>
          {date !== today && (
            <button
              type="button"
              onClick={() => setDate(today)}
              className="text-xs text-primary-600 hover:underline dark:text-primary-400"
            >
              Jump to today
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Next day"
          onClick={() => setDate((d) => shiftKey(d, 1))}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-4">
        <DailySummary totals={totals} goals={goals} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <LoaderIcon className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {MEALS.map((meal) => (
            <MealSection
              key={meal}
              meal={meal}
              entries={entries.filter((e) => e.meal === meal)}
              onAdd={() => setAddMeal(meal)}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}

      {addMeal && (
        <AddFoodModal
          meal={addMeal}
          planned={plannedRecipes}
          onClose={() => setAddMeal(null)}
          onAdd={handleAdd}
        />
      )}

      {editing && (
        <EditEntrySheet
          entry={editing}
          recipe={editing.recipeId ? getRecipe(editing.recipeId) : undefined}
          onClose={() => setEditing(null)}
          onSave={(servings) => {
            void handleServings(editing.id, servings);
            setEditing(null);
          }}
          onRemove={() => {
            void handleRemove(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
