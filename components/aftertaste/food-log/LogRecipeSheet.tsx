'use client';

import { useState } from 'react';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recipe } from '@/data/sample/recipes';
import { addFoodLogEntry } from '@/app/(app)/food-log-actions';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type Meal = (typeof MEALS)[number];

const PORTIONS = [
  { label: '⅛', v: 1 / 8 },
  { label: '¼', v: 1 / 4 },
  { label: '⅓', v: 1 / 3 },
  { label: '½', v: 1 / 2 },
  { label: '⅔', v: 2 / 3 },
  { label: '¾', v: 3 / 4 },
  { label: 'Whole', v: 1 },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

const chip = (active: boolean) =>
  cn(
    'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
    active
      ? 'bg-primary-500 text-white'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300',
  );

function mealForNow(): Meal {
  const h = new Date().getHours();
  if (h < 11) return 'Breakfast';
  if (h < 15) return 'Lunch';
  if (h < 21) return 'Dinner';
  return 'Snack';
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Log a recipe to today's food diary — pick the meal and how much, in one step. */
export function LogRecipeSheet({
  recipe,
  onClose,
  onLogged,
}: {
  recipe: Recipe;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [meal, setMeal] = useState<Meal>(mealForNow());
  const [amtMode, setAmtMode] = useState<'servings' | 'portion'>('servings');
  const [servings, setServings] = useState<number | ''>(1);
  const [fraction, setFraction] = useState(1);
  const [saving, setSaving] = useState(false);

  const finalServings =
    amtMode === 'portion'
      ? round2(recipe.servings * fraction)
      : servings === '' || servings <= 0
        ? 1
        : Number(servings);

  const inputCls =
    'w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30';

  async function log() {
    setSaving(true);
    try {
      await addFoodLogEntry({
        date: todayKey(),
        meal,
        recipeId: recipe.id,
        name: recipe.title,
        servings: finalServings,
        calories: recipe.calories,
        proteinG: recipe.proteinG ?? null,
        carbsG: recipe.carbsG ?? null,
        fatG: recipe.fatG ?? null,
        fiberG: recipe.fiberG ?? null,
        sugarG: recipe.sugarG ?? null,
        sodiumMg: recipe.sodiumMg ?? null,
      });
      onLogged();
      onClose();
    } finally {
      setSaving(false);
    }
  }

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
            Log to diary
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
          {/* Meal */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Meal
            </label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {MEALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMeal(m)}
                  className={chip(meal === m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
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
                    className={chip(servings === s)}
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setServings(recipe.servings)}
                  className={chip(servings === recipe.servings)}
                >
                  Whole ({recipe.servings})
                </button>
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
                    className={chip(fraction === p.v)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800/50">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {Math.round(recipe.calories * finalServings)} kcal
            </span>
            <span className="text-gray-400">
              {recipe.proteinG != null &&
                ` · ${Math.round(recipe.proteinG * finalServings)}p`}
              {recipe.carbsG != null &&
                ` · ${Math.round(recipe.carbsG * finalServings)}c`}
              {recipe.fatG != null &&
                ` · ${Math.round(recipe.fatG * finalServings)}f`}
              {`  (${finalServings} serving${finalServings === 1 ? '' : 's'})`}
            </span>
          </div>

          <button
            type="button"
            onClick={log}
            disabled={saving}
            className="h-10 w-full rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            Add to {meal}
          </button>
        </div>
      </div>
    </div>
  );
}
