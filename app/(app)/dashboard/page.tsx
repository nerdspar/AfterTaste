'use client';

import { useEffect, useMemo, useState } from 'react';
import { SectionHeader } from '@/components/aftertaste/SectionHeader';
import { CategoryTiles } from '@/components/aftertaste/dashboard/CategoryTiles';
import { RecipeCard } from '@/components/aftertaste/dashboard/RecipeCard';
import { TodaysMeals } from '@/components/aftertaste/dashboard/TodaysMeals';
import { GroceryListWidget } from '@/components/aftertaste/dashboard/GroceryListWidget';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { useFirstName } from '@/components/aftertaste/CurrentUserProvider';
import { useUserPrefs } from '@/components/aftertaste/UserPrefsProvider';
import { useRecentlyViewedIds } from '@/lib/recently-viewed';
import { recipePersonalRating } from '@/lib/recipe-rating';
import { DASHBOARD_SECTION_BY_ID } from '@/lib/dashboard-sections';
import { cn } from '@/lib/utils';
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
  const { prefs } = useUserPrefs();
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

  // Each dashboard section keyed by id; the user's pref decides which show and
  // in what order. Sections keep their column (main vs side rail) so the
  // two-column desktop layout is preserved; reorder/hide happen within it.
  const recipeSection = (
    title: string,
    key: string,
    list: Recipe[],
    emptyHint?: string,
  ) => (
    <section>
      <SectionHeader
        title={title}
        actionLabel={getSeeMoreLabel(list, key)}
        onAction={() => toggleSection(key)}
      />
      {list.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {getVisibleRecipes(list, key).map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : emptyHint ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {emptyHint}
          </p>
        </div>
      ) : null}
    </section>
  );

  const sectionNodes: Record<string, React.ReactNode> = {
    categoryTiles: <CategoryTiles />,
    recentlyViewed: recipeSection(
      'Recently Viewed',
      'recentlyViewed',
      recentlyViewed,
      'Recipes you open will show up here.',
    ),
    recentlyAdded: recipeSection(
      'Recently Added',
      'recentlyAdded',
      recentlyAdded,
    ),
    suggested: recipeSection('Suggested Recipes', 'suggested', suggested),
    todaysMeals: (
      <section>
        <SectionHeader title="Today's Meals" />
        <TodaysMeals />
      </section>
    ),
    groceryList: (
      <section>
        <SectionHeader title="Grocery List" />
        <GroceryListWidget />
      </section>
    ),
  };

  const orderedIds = prefs.dashboardSections.filter((id) => sectionNodes[id]);
  const mainIds = orderedIds.filter(
    (id) => DASHBOARD_SECTION_BY_ID[id]?.column !== 'rail',
  );
  const railIds = orderedIds.filter(
    (id) => DASHBOARD_SECTION_BY_ID[id]?.column === 'rail',
  );
  const twoColumn = mainIds.length > 0 && railIds.length > 0;

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

      <div className={cn('grid gap-5', twoColumn ? 'lg:grid-cols-3' : 'grid-cols-1')}>
        {mainIds.length > 0 && (
          <div className={cn('space-y-5', twoColumn && 'lg:col-span-2')}>
            {mainIds.map((id) => (
              <div key={id}>{sectionNodes[id]}</div>
            ))}
          </div>
        )}
        {railIds.length > 0 && (
          <div className="space-y-5">
            {railIds.map((id) => (
              <div key={id}>{sectionNodes[id]}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
