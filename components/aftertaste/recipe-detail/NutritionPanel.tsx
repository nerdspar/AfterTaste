'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Recipe } from '@/data/sample/recipes';

interface NutritionPanelProps {
  recipe: Recipe;
  /** Current (possibly scaled) serving count, for the "whole recipe" view. */
  servings: number;
}

// Calories per gram, for the protein/carbs/fat energy split.
const KCAL = { protein: 4, carbs: 4, fat: 9 };

const SOURCE_LABEL: Record<string, string> = {
  imported: 'Imported',
  estimated: 'AI estimate',
};

function MacroValue({
  label,
  value,
  unit,
  dotClass,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  dotClass?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {dotClass && (
        <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', dotClass)} />
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-tight">
          {value == null ? '—' : `${value}${unit}`}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
          {label}
        </p>
      </div>
    </div>
  );
}

export function NutritionPanel({ recipe, servings }: NutritionPanelProps) {
  const [view, setView] = useState<'serving' | 'total'>('serving');
  const factor = view === 'total' ? Math.max(servings, 1) : 1;
  const scale = (v: number | undefined) =>
    v == null ? undefined : Math.round(v * factor);

  const calories = scale(recipe.calories);
  const protein = scale(recipe.proteinG);
  const carbs = scale(recipe.carbsG);
  const fat = scale(recipe.fatG);
  const fiber = scale(recipe.fiberG);
  const sugar = scale(recipe.sugarG);
  const sodium = scale(recipe.sodiumMg);

  const hasMacros = protein != null || carbs != null || fat != null;
  const hasSecondary = fiber != null || sugar != null || sodium != null;

  // Energy split for the stacked bar (falls back to 0-width when unknown).
  const pC = (protein ?? 0) * KCAL.protein;
  const cC = (carbs ?? 0) * KCAL.carbs;
  const fC = (fat ?? 0) * KCAL.fat;
  const totalC = pC + cC + fC;
  const pct = (part: number) =>
    totalC > 0 ? `${Math.round((part / totalC) * 100)}%` : '0%';

  const sourceLabel = recipe.nutritionSource
    ? SOURCE_LABEL[recipe.nutritionSource]
    : undefined;

  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white p-4',
        'dark:border-gray-700/40 dark:bg-slate-900',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Nutrition
          </h2>
          {sourceLabel && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {sourceLabel}
            </span>
          )}
        </div>
        {/* Per-serving vs. whole-recipe toggle */}
        <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
          {(['serving', 'total'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                view === v
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              )}
            >
              {v === 'serving' ? 'Per serving' : 'Whole recipe'}
            </button>
          ))}
        </div>
      </div>

      {/* Calories headline */}
      <div className="mb-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {calories ?? '—'}
        </span>
        <span className="text-sm text-gray-400 dark:text-gray-500">kcal</span>
        <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">
          {view === 'serving'
            ? 'per serving'
            : `whole recipe · ${Math.max(servings, 1)} servings`}
        </span>
      </div>

      {/* Macro energy bar */}
      {hasMacros && totalC > 0 && (
        <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="bg-primary-500" style={{ width: pct(pC) }} />
          <div className="bg-secondary-500" style={{ width: pct(cC) }} />
          <div className="bg-amber-400" style={{ width: pct(fC) }} />
        </div>
      )}

      {/* Macros */}
      <div className="grid grid-cols-3 gap-3">
        <MacroValue
          label="Protein"
          value={protein}
          unit="g"
          dotClass="bg-primary-500"
        />
        <MacroValue
          label="Carbs"
          value={carbs}
          unit="g"
          dotClass="bg-secondary-500"
        />
        <MacroValue label="Fat" value={fat} unit="g" dotClass="bg-amber-400" />
      </div>

      {/* Secondary nutrients */}
      {hasSecondary && (
        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <MacroValue label="Fiber" value={fiber} unit="g" />
          <MacroValue label="Sugar" value={sugar} unit="g" />
          <MacroValue label="Sodium" value={sodium} unit="mg" />
        </div>
      )}
    </div>
  );
}
