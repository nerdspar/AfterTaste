'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { ClockIcon, FlameIcon, StickyNoteIcon } from 'lucide-react';
import { useMealPlan, parsePlanEntry } from '../MealPlanStoreProvider';
import { useRecipeStore } from '../RecipeStoreProvider';
import type { Recipe } from '@/data/sample/recipes';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

// Same key format as the meal planner: `<local YYYY-MM-DD>_<meal>`.
function todayKey(meal: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}_${meal}`;
}

type MealType = (typeof MEAL_TYPES)[number];
type MealItem =
  | { mealType: MealType; recipe: Recipe }
  | { mealType: MealType; note: string };

export function TodaysMeals() {
  const { plan } = useMealPlan();
  const { getRecipe } = useRecipeStore();

  const meals = MEAL_TYPES.map((mealType): MealItem | null => {
    const entry = parsePlanEntry(plan[todayKey(mealType)]);
    if (!entry) return null;
    if (entry.type === 'note') return { mealType, note: entry.text };
    const recipe = getRecipe(entry.recipeId);
    return recipe ? { mealType, recipe } : null;
  }).filter((m): m is MealItem => m !== null);

  if (meals.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
          No meals planned for today.
        </p>
        <Link
          href="/meal-planner"
          className="block text-center text-xs font-medium text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 transition-colors"
        >
          Plan your meals
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meals.map((meal) => {
        // Free-text note (e.g. eating out) — no recipe to link to.
        if ('note' in meal) {
          return (
            <div
              key={meal.mealType}
              className={cn(
                'flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3',
                'dark:border-amber-500/30 dark:bg-amber-500/10',
              )}
            >
              <div className="relative w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <StickyNoteIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  {meal.mealType}
                </span>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                  {meal.note}
                </h4>
              </div>
            </div>
          );
        }

        const { mealType, recipe } = meal;
        return (
          <Link key={mealType} href={`/recipes/${recipe.id}`}>
            <div
              className={cn(
                'flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3',
                'dark:border-gray-700/40 dark:bg-slate-900',
                'hover:border-primary-300 dark:hover:border-primary-500/40',
                'transition-colors cursor-pointer',
              )}
            >
              {/* Image */}
              <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={recipe.image}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-primary-500 dark:text-primary-400">
                  {mealType}
                </span>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {recipe.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {recipe.cookTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <FlameIcon className="w-3 h-3" />
                    {recipe.calories} kcal
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      <Link
        href="/meal-planner"
        className="block text-center text-xs font-medium text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 transition-colors pt-1"
      >
        View Full Meal Plan
      </Link>
    </div>
  );
}
