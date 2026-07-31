'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RecipeCard } from '@/components/aftertaste/dashboard/RecipeCard';
import { Chip } from '@/components/aftertaste/Chip';
import { FilterBar } from '@/components/aftertaste/recipes/FilterBar';
import { SortDropdown } from '@/components/aftertaste/recipes/SortDropdown';
import { useFavorites } from '@/components/aftertaste/FavoritesProvider';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import {
  defaultFilterConfigs,
  sortOptions,
  applyFilters,
  applySort,
  type ActiveFilters,
  type SortOption,
} from '@/lib/recipe-filters';

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

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [filters, setFilters] = useState<ActiveFilters>({});
  const [sort, setSort] = useState<SortOption | null>(null);

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
    result = applySort(result, sort);

    return result;
  }, [activeTab, filters, sort, isFavorite, searchQuery, allRecipes]);

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

      {/* Filter bar + sort */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <FilterBar
          configs={defaultFilterConfigs}
          filters={filters}
          onChange={setFilters}
        />
        <SortDropdown
          options={sortOptions}
          value={sort}
          onChange={setSort}
        />
      </div>

      {/* Recipe grid */}
      {displayRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
            />
          ))}
        </div>
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
