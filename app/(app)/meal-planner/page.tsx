'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/aftertaste/Card';
import { cn } from '@/lib/utils';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { useMealPlan } from '@/components/aftertaste/MealPlanStoreProvider';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

function getWeekDates(offset: number) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + offset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDateRange(dates: Date[]) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${fmt.format(dates[0])} - ${fmt.format(dates[6])}, ${dates[0].getFullYear()}`;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type PlanKey = string;

function MealPlannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { recipes, getRecipe } = useRecipeStore();
  const { plan, assignSlot, clearSlot } = useMealPlan();
  const [weekOffset, setWeekOffset] = useState(0);
  const [pickingSlot, setPickingSlot] = useState<PlanKey | null>(null);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  // Arriving from a recipe's "Add to Meal Plan" enters a mode where clicking a
  // slot drops that recipe straight in, instead of opening the recipe picker.
  useEffect(() => {
    const add = searchParams.get('add');
    if (add) {
      setPendingRecipeId(add);
      setPickingSlot(null);
      router.replace('/meal-planner', { scroll: false });
    }
  }, [searchParams, router]);

  const pendingRecipe = pendingRecipeId ? getRecipe(pendingRecipeId) : null;

  const makeKey = (dayIdx: number, meal: string) => {
    // Use the local calendar date (not toISOString, which is UTC and would
    // shift the key across the day boundary depending on time zone / time of
    // day, so the same slot could get different keys).
    const d = weekDates[dayIdx];
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}_${meal}`;
  };

  const assignRecipe = (slotKey: string, recipeId: string) => {
    assignSlot(slotKey, recipeId);
    setPickingSlot(null);
  };

  const handleSlotClick = (slotKey: string) => {
    if (pendingRecipeId) {
      assignRecipe(slotKey, pendingRecipeId);
      setPendingRecipeId(null);
    } else {
      setPickingSlot(pickingSlot === slotKey ? null : slotKey);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Meal Planner
      </h1>

      {pendingRecipe && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary-300 bg-primary-500/5 px-4 py-2.5 dark:border-primary-500/40 dark:bg-primary-500/10">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Adding{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {pendingRecipe.title}
            </span>{' '}
            — pick a slot
          </p>
          <button
            type="button"
            onClick={() => setPendingRecipeId(null)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
            </button>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatDateRange(weekDates)}
            </h2>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="text-xs text-secondary-500 hover:text-secondary-700 font-medium"
            >
              This Week
            </button>
          )}
        </div>

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header row */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div />
              {weekDates.map((date, i) => {
                const isToday =
                  date.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className="text-center py-1">
                    <p
                      className={cn(
                        'text-xs font-medium',
                        isToday
                          ? 'text-primary-500'
                          : 'text-gray-500 dark:text-gray-400',
                      )}
                    >
                      {DAY_NAMES[i]}
                    </p>
                    <p
                      className={cn(
                        'text-[11px] tabular-nums',
                        isToday
                          ? 'text-primary-500 font-semibold'
                          : 'text-gray-400 dark:text-gray-500',
                      )}
                    >
                      {date.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Meal rows */}
            {MEAL_TYPES.map((meal) => (
              <div key={meal} className="grid grid-cols-8 gap-2 mb-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 py-3 pr-2 flex items-center">
                  {meal}
                </div>
                {weekDates.map((_, dayIdx) => {
                  const key = makeKey(dayIdx, meal);
                  const recipeId = plan[key];
                  const recipe = recipeId ? getRecipe(recipeId) : null;

                  if (recipe) {
                    return (
                      <div
                        key={key}
                        className="h-16 rounded-xl border border-gray-200 dark:border-gray-700/40 bg-white dark:bg-gray-800/40 overflow-hidden relative group"
                      >
                        <Link
                          href={`/recipes/${recipe.id}`}
                          aria-label={`Open ${recipe.title}`}
                          className="block relative h-full w-full"
                        >
                          <Image
                            src={recipe.image}
                            alt={recipe.title}
                            fill
                            className="object-cover opacity-40 transition-opacity group-hover:opacity-60"
                            sizes="80px"
                          />
                          <div className="relative p-1.5 h-full flex flex-col justify-end">
                            <p className="text-[9px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
                              {recipe.title.split(' ').slice(0, 3).join(' ')}
                            </p>
                          </div>
                        </Link>
                        <button
                          type="button"
                          onClick={() => clearSlot(key)}
                          aria-label="Remove from plan"
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                        >
                          <XIcon className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    );
                  }

                  const slotActive =
                    pickingSlot === key || pendingRecipeId !== null;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => handleSlotClick(key)}
                      className={cn(
                        'h-16 rounded-xl border border-dashed flex items-center justify-center transition-colors',
                        pickingSlot === key
                          ? 'border-primary-500 bg-primary-500/5 dark:bg-primary-500/10'
                          : pendingRecipeId
                            ? 'border-primary-300 bg-primary-500/5 hover:border-primary-500 dark:border-primary-500/40 dark:bg-primary-500/10'
                            : 'border-gray-200 dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/20 hover:border-gray-300 dark:hover:border-gray-600',
                      )}
                    >
                      <span
                        className={cn(
                          'text-xs',
                          slotActive
                            ? 'text-primary-500'
                            : 'text-gray-300 dark:text-gray-600',
                        )}
                      >
                        +
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Recipe picker */}
      {pickingSlot && (
        <Card className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Choose a recipe
            </h3>
            <button
              type="button"
              onClick={() => setPickingSlot(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {recipes.map((recipe) => (
              <button
                type="button"
                key={recipe.id}
                onClick={() => assignRecipe(pickingSlot, recipe.id)}
                className="rounded-xl border border-gray-200 dark:border-gray-700/40 overflow-hidden hover:ring-2 hover:ring-primary-500/40 transition-all text-left"
              >
                <div className="relative h-16">
                  <Image
                    src={recipe.image}
                    alt={recipe.title}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </div>
                <div className="p-1.5">
                  <p className="text-[10px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
                    {recipe.title}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {recipe.cookTime} · {recipe.calories} kcal
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function MealPlannerPage() {
  return (
    <Suspense>
      <MealPlannerContent />
    </Suspense>
  );
}
