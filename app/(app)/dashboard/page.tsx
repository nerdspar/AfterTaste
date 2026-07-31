'use client';

import { useEffect, useMemo, useState } from 'react';
import { SectionHeader } from '@/components/aftertaste/SectionHeader';
import { CategoryTiles } from '@/components/aftertaste/dashboard/CategoryTiles';
import { RecipeCard } from '@/components/aftertaste/dashboard/RecipeCard';
import { TodaysMeals } from '@/components/aftertaste/dashboard/TodaysMeals';
import { GroceryListWidget } from '@/components/aftertaste/dashboard/GroceryListWidget';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { useFirstName } from '@/components/aftertaste/CurrentUserProvider';
import { useRecentlyViewedIds } from '@/lib/recently-viewed';
import { recipePersonalRating } from '@/lib/recipe-rating';
import type { Recipe } from '@/data/sample/recipes';

const DEFAULT_COUNT = 2;
const MAX_COUNT = 8;
// How many top-rated matches to rotate through so suggestions vary day to day
// without ever dropping below the cream of the crop.
const SUGGEST_ROTATION_POOL = 6;

type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner';

function mealCategoryForHour(hour: number): MealCategory {
  if (hour < 11) return 'Breakfast';
  if (hour < 16) return 'Lunch';
  return 'Dinner';
}

export default function DashboardPage() {
  const { recipes } = useRecipeStore();
  const firstName = useFirstName();
  const viewedIds = useRecentlyViewedIds();
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  // Time-of-day drives the greeting and suggestions. Gate it behind mount so the
  // server-rendered HTML (which can't know the client's clock) matches the first
  // client paint, then settles to the real time.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const now = mounted ? new Date() : null;
  const hour = now ? now.getHours() : 12;
  const dayOfMonth = now ? now.getDate() : 1;

  // Recently Viewed — the 2 most recent opens, de-duped, mapped back to recipes.
  const recentlyViewed = useMemo(() => {
    const byId = new Map(recipes.map((r) => [r.id, r] as const));
    return viewedIds
      .map((id) => byId.get(id))
      .filter((r): r is Recipe => Boolean(r));
  }, [recipes, viewedIds]);

  // Recently Added — newest createdAt first; new recipes are prepended to the
  // store, so store order breaks ties for seed recipes without a timestamp.
  const recentlyAdded = useMemo(() => {
    return recipes
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const diff = (b.r.createdAt ?? 0) - (a.r.createdAt ?? 0);
        return diff !== 0 ? diff : a.i - b.i;
      })
      .map((x) => x.r);
  }, [recipes]);

  // Suggested — recipes for the current meal (breakfast/lunch/dinner), best
  // rated first, with a daily rotation through the top matches for variety.
  const suggested = useMemo(() => {
    const meal = mealCategoryForHour(hour);
    const inMeal = recipes.filter((r) => r.category === meal);
    const pool =
      inMeal.length >= DEFAULT_COUNT
        ? inMeal
        : [...inMeal, ...recipes.filter((r) => r.category !== meal)];

    const sorted = [...pool].sort(
      (a, b) => recipePersonalRating(b) - recipePersonalRating(a),
    );

    const head = sorted.slice(0, Math.min(SUGGEST_ROTATION_POOL, sorted.length));
    const tail = sorted.slice(head.length);
    const offset = head.length ? dayOfMonth % head.length : 0;
    return [...head.slice(offset), ...head.slice(0, offset), ...tail];
  }, [recipes, hour, dayOfMonth]);

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function getVisibleRecipes(list: Recipe[], sectionKey: string) {
    const limit = expandedSections[sectionKey] ? MAX_COUNT : DEFAULT_COUNT;
    return list.slice(0, limit);
  }

  function getSeeMoreLabel(list: Recipe[], sectionKey: string) {
    if (list.length <= DEFAULT_COUNT) return undefined;
    return expandedSections[sectionKey] ? 'See less' : 'See more';
  }

  const greeting =
    hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Good {greeting}, {firstName}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          What would you like to cook today?
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left / Main Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Category Tiles */}
          <CategoryTiles />

          {/* Recently Viewed */}
          <section>
            <SectionHeader
              title="Recently Viewed"
              actionLabel={getSeeMoreLabel(recentlyViewed, 'recentlyViewed')}
              onAction={() => toggleSection('recentlyViewed')}
            />
            {recentlyViewed.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {getVisibleRecipes(recentlyViewed, 'recentlyViewed').map(
                  (recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ),
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Recipes you open will show up here.
                </p>
              </div>
            )}
          </section>

          {/* Recently Added */}
          <section>
            <SectionHeader
              title="Recently Added"
              actionLabel={getSeeMoreLabel(recentlyAdded, 'recentlyAdded')}
              onAction={() => toggleSection('recentlyAdded')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getVisibleRecipes(recentlyAdded, 'recentlyAdded').map(
                (recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ),
              )}
            </div>
          </section>

          {/* Suggested Recipes */}
          <section>
            <SectionHeader
              title="Suggested Recipes"
              actionLabel={getSeeMoreLabel(suggested, 'suggested')}
              onAction={() => toggleSection('suggested')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getVisibleRecipes(suggested, 'suggested').map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>
        </div>

        {/* Right Rail */}
        <div className="space-y-5">
          {/* Today's Meals */}
          <section>
            <SectionHeader title="Today's Meals" />
            <TodaysMeals />
          </section>

          {/* Grocery List */}
          <section>
            <SectionHeader title="Grocery List" />
            <GroceryListWidget />
          </section>
        </div>
      </div>
    </div>
  );
}
