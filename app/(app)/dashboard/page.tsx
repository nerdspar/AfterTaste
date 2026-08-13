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
import { AddRecipe } from '@/components/aftertaste/AddRecipe';
import { useRecentlyViewedIds } from '@/lib/recently-viewed';
import { recipePersonalRating } from '@/lib/recipe-rating';
import { DASHBOARD_SECTION_BY_ID } from '@/lib/dashboard-sections';
import { cn } from '@/lib/utils';
import type { Recipe } from '@/data/sample/recipes';

const DEFAULT_COUNT = 2;
const MAX_COUNT = 8;

type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner';

function mealCategoryForHour(hour: number): MealCategory {
  if (hour < 11) return 'Breakfast';
  if (hour < 16) return 'Lunch';
  return 'Dinner';
}

// Meal-appropriate categories in priority order. The current meal leads; the
// rest broaden the pool when the meal is sparse — deliberately never putting a
// Dinner in the morning.
const MEAL_BROADEN: Record<MealCategory, string[]> = {
  Breakfast: ['Breakfast', 'Snack', 'Dessert'],
  Lunch: ['Lunch', 'Dinner', 'Snack'],
  Dinner: ['Dinner', 'Lunch', 'Snack'],
};

// A deterministic hash of (recipe id, day) → number, used to shuffle unrated
// recipes so the suggestions vary day to day but stay stable within a day.
// FNV-1a over "seed:id" so the seed genuinely reorders (not just a constant
// offset that leaves the relative order unchanged).
function seededRank(id: string, seed: number): number {
  const s = `${seed}:${id}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
  // A value that changes once per day (days since epoch) for the daily shuffle.
  const daySeed = now ? Math.floor(now.getTime() / 86_400_000) : 0;

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

  // Suggested — a rotating, meal-appropriate discovery set that's distinct from
  // Recently Added/Viewed. Ranked by: (1) meal category priority, (2) personal
  // rating (highest first — the eventual behaviour once things are rated), then
  // (3) a per-day shuffle so unrated recipes rotate day to day instead of just
  // echoing the newest ones.
  const suggested = useMemo(() => {
    const meal = mealCategoryForHour(hour);
    const cats = MEAL_BROADEN[meal];
    const catRank = new Map(cats.map((c, i) => [c, i] as const));

    // Don't re-show what's already in Recently Viewed / Recently Added.
    const excluded = new Set<string>([
      ...viewedIds,
      ...recentlyAdded.slice(0, MAX_COUNT).map((r) => r.id),
    ]);

    let pool = recipes.filter(
      (r) => catRank.has(r.category) && !excluded.has(r.id),
    );
    // Safety nets so the section never renders empty.
    if (pool.length < DEFAULT_COUNT)
      pool = recipes.filter((r) => !excluded.has(r.id));
    if (pool.length < DEFAULT_COUNT) pool = recipes;

    return [...pool].sort((a, b) => {
      const ca = catRank.get(a.category) ?? 99;
      const cb = catRank.get(b.category) ?? 99;
      if (ca !== cb) return ca - cb; // meal-appropriate first
      const dr = recipePersonalRating(b) - recipePersonalRating(a);
      if (dr !== 0) return dr; // higher-rated first
      return seededRank(a.id, daySeed) - seededRank(b.id, daySeed); // daily shuffle
    });
  }, [recipes, hour, daySeed, viewedIds, recentlyAdded]);

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
  const cookWhen =
    hour < 12 ? 'this morning' : hour < 17 ? 'this afternoon' : 'tonight';

  // Each dashboard section keyed by id. The saved order is the MOBILE order
  // (one column, exactly as configured). On desktop we project that same list
  // into two columns — rail sections peel off to the side panel — so the
  // two-column layout is preserved without losing free mobile ordering.
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
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Good {greeting}, {firstName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            What would you like to cook {cookWhen}?
          </p>
        </div>
        <AddRecipe />
      </div>

      {/* Mobile: one column in the exact saved order (rail sections can lead). */}
      <div className="space-y-6 lg:hidden">
        {orderedIds.map((id) => (
          <div key={id}>{sectionNodes[id]}</div>
        ))}
      </div>

      {/* Desktop: the same list projected into two columns. */}
      <div
        className={cn(
          'hidden gap-5 lg:grid',
          twoColumn ? 'lg:grid-cols-3' : 'lg:grid-cols-1',
        )}
      >
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
