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
  MinusIcon,
  LoaderIcon,
  SaladIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePref, PREF_NUTRITION } from '@/lib/prefs';
import { useCurrentUser } from '@/components/aftertaste/CurrentUserProvider';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
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

function AddFoodModal({
  meal,
  onClose,
  onAdd,
}: {
  meal: Meal;
  onClose: () => void;
  onAdd: (input: Omit<AddFoodLogInput, 'date'>) => void;
}) {
  const { recipes } = useRecipeStore();
  const [tab, setTab] = useState<'recipe' | 'quick'>('recipe');
  const [query, setQuery] = useState('');
  // Quick-add fields.
  const [name, setName] = useState('');
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');

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
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Add to {meal}
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

        <div className="flex gap-1 border-b border-gray-100 px-4 pt-2 dark:border-gray-800">
          {(['recipe', 'quick'] as const).map((t) => (
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
              {t === 'recipe' ? 'Your recipes' : 'Quick add'}
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
              {matches.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-gray-400">
                  No recipes match.
                </p>
              ) : (
                matches.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onAdd({
                        meal,
                        recipeId: r.id,
                        name: r.title,
                        servings: 1,
                        calories: r.calories,
                        proteinG: r.proteinG ?? null,
                        carbsG: r.carbsG ?? null,
                        fatG: r.fatG ?? null,
                        fiberG: r.fiberG ?? null,
                        sugarG: r.sugarG ?? null,
                        sodiumMg: r.sodiumMg ?? null,
                      });
                      onClose();
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
      </div>
    </div>
  );
}

// ---- meal section -----------------------------------------------------------

function MealSection({
  meal,
  entries,
  onAdd,
  onRemove,
  onServings,
}: {
  meal: Meal;
  entries: FoodLogEntry[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onServings: (id: string, servings: number) => void;
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
            <div
              key={e.id}
              className="flex items-center gap-2 px-4 py-2.5 text-sm"
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
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Fewer servings"
                  onClick={() =>
                    onServings(e.id, Math.max(0.5, e.servings - 0.5))
                  }
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-xs tabular-nums text-gray-600 dark:text-gray-300">
                  {e.servings}
                </span>
                <button
                  type="button"
                  aria-label="More servings"
                  onClick={() => onServings(e.id, e.servings + 0.5)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => onRemove(e.id)}
                  className="ml-1 rounded p-1 text-gray-300 hover:bg-rose-50 hover:text-rose-500 dark:text-gray-600 dark:hover:bg-rose-500/10"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- page -------------------------------------------------------------------

export function FoodLogClient() {
  const nutritionOn = usePref(PREF_NUTRITION, false);
  const { goals } = useCurrentUser();

  // Client-only prefs read as their fallback until mount; gate the whole page
  // on a mounted flag so we never flash the "off" screen before we know.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [today] = useState(() => toKey(new Date()));
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMeal, setAddMeal] = useState<Meal | null>(null);

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
              onRemove={handleRemove}
              onServings={handleServings}
            />
          ))}
        </div>
      )}

      {addMeal && (
        <AddFoodModal
          meal={addMeal}
          onClose={() => setAddMeal(null)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
