'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutGridIcon, ListIcon } from 'lucide-react';
import { RecipeCard } from '@/components/aftertaste/dashboard/RecipeCard';
import { RecipeListItem } from '@/components/aftertaste/recipes/RecipeListItem';
import { Chip } from '@/components/aftertaste/Chip';
import { FilterBar } from '@/components/aftertaste/recipes/FilterBar';
import { SortDropdown } from '@/components/aftertaste/recipes/SortDropdown';
import { useFavorites } from '@/components/aftertaste/FavoritesProvider';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { computePersonalRating } from '@/lib/recipe-rating';
import { cn } from '@/lib/utils';
import {
  defaultFilterConfigs,
  sortOptions,
  applyFilters,
  applySort,
  type ActiveFilters,
  type SortOption,
} from '@/lib/recipe-filters';

type ViewMode = 'grid' | 'list';
const VIEW_STORAGE_KEY = 'aftertaste-recipes-view';

const dishTabs = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Favorites'] as const;

export default function MyRecipesPage() {
  return (
    <Suspense>
      <MyRecipesContent />
    </Suspense>
  );
}

function MyRecipesContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const searchQuery = searchParams.get('q') ?? '';
  const initialTab = dishTabs.includes(tabParam as (typeof dishTabs)[number])
    ? (tabParam as string)
    : 'All';

  const { isFavorite } = useFavorites();
  const { recipes: allRecipes } = useRecipeStore();

  // Deep-link filters from the Insights charts: cuisine / source pre-apply a
  // filter; rating filters by rounded personal rating (no config field for it).
  const cuisineParam = searchParams.get('cuisine');
  const sourceParam = searchParams.get('source');
  const ratingParam = searchParams.get('rating');
  // A `sort` param (`field:direction`, e.g. from the Insights score cards)
  // pre-selects that sort option.
  const sortParam = searchParams.get('sort');

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [filters, setFilters] = useState<ActiveFilters>(() => {
    const init: ActiveFilters = {};
    if (cuisineParam) init.cuisine = [cuisineParam];
    if (sourceParam) init.source = [sourceParam];
    return init;
  });
  const [sort, setSort] = useState<SortOption | null>(
    () =>
      sortOptions.find((o) => `${o.field}:${o.direction}` === sortParam) ??
      null,
  );
  // Default to grid on first render (matches SSR), then restore the saved
  // preference on the client to avoid a hydration mismatch.
  const [view, setView] = useState<ViewMode>('grid');

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'list' || saved === 'grid') setView(saved);
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {}
  };

  const displayRecipes = useMemo(() => {
    let result = [...allRecipes];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (activeTab === 'Favorites') {
      result = result.filter((r) => isFavorite(r.id));
    } else if (activeTab !== 'All') {
      result = result.filter((r) => r.category === activeTab);
    }

    result = applyFilters(result, filters, defaultFilterConfigs);

    // Rating deep-link (from the Insights rating-distribution chart).
    const ratingTarget = ratingParam ? Number(ratingParam) : null;
    if (ratingTarget !== null && ratingTarget >= 1 && ratingTarget <= 5) {
      result = result.filter(
        (r) =>
          Math.round(computePersonalRating(r.taste, r.ease, r.cleanup)) ===
          ratingTarget,
      );
    }

    result = applySort(result, sort);

    return result;
  }, [activeTab, filters, sort, isFavorite, searchQuery, allRecipes, ratingParam]);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        {searchQuery ? `Search: "${searchQuery}"` : 'My Recipes'}
      </h1>

      {/* Dish type tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {dishTabs.map((tab) => (
          <Chip
            key={tab}
            label={tab === 'Favorites' ? '❤️ Favorites' : tab}
            selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          />
        ))}
      </div>

      {/* Filter bar + sort + view toggle */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <FilterBar
          configs={defaultFilterConfigs}
          filters={filters}
          onChange={setFilters}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => changeView('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'grid'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              )}
            >
              <LayoutGridIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => changeView('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'list'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              )}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <SortDropdown options={sortOptions} value={sort} onChange={setSort} />
        </div>
      </div>

      {/* Recipes */}
      {displayRecipes.length > 0 ? (
        view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayRecipes.map((recipe) => (
              <RecipeListItem key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            No recipes match your filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilters({});
              setSort(null);
              setActiveTab('All');
            }}
            className="text-xs text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 font-medium transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
