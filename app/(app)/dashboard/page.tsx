'use client';

import { useState } from 'react';
import { SectionHeader } from '@/components/aftertaste/SectionHeader';
import { CategoryTiles } from '@/components/aftertaste/dashboard/CategoryTiles';
import { RecipeCard } from '@/components/aftertaste/dashboard/RecipeCard';
import { TodaysMeals } from '@/components/aftertaste/dashboard/TodaysMeals';
import { GroceryListWidget } from '@/components/aftertaste/dashboard/GroceryListWidget';
import {
  recommendedRecipes,
  recentlyViewedRecipes,
  recentlyAddedRecipes,
} from '@/data/sample/recipes';

const DEFAULT_COUNT = 2;
const MAX_COUNT = 8;

export default function DashboardPage() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function getVisibleRecipes(recipes: typeof recommendedRecipes, sectionKey: string) {
    const expanded = expandedSections[sectionKey];
    const limit = expanded ? MAX_COUNT : DEFAULT_COUNT;
    return recipes.slice(0, limit);
  }

  function getSeeMoreLabel(recipes: typeof recommendedRecipes, sectionKey: string) {
    if (recipes.length <= DEFAULT_COUNT) return undefined;
    return expandedSections[sectionKey] ? 'See less' : 'See more';
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page title */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left / Main Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Category Tiles */}
          <CategoryTiles />

          {/* Recently Viewed */}
          <section>
            <SectionHeader
              title="Recently Viewed"
              actionLabel={getSeeMoreLabel(recentlyViewedRecipes, 'recentlyViewed')}
              onAction={() => toggleSection('recentlyViewed')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getVisibleRecipes(recentlyViewedRecipes, 'recentlyViewed').map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>

          {/* Recently Added */}
          <section>
            <SectionHeader
              title="Recently Added"
              actionLabel={getSeeMoreLabel(recentlyAddedRecipes, 'recentlyAdded')}
              onAction={() => toggleSection('recentlyAdded')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getVisibleRecipes(recentlyAddedRecipes, 'recentlyAdded').map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>

          {/* Suggested Recipes */}
          <section>
            <SectionHeader
              title="Suggested Recipes"
              actionLabel={getSeeMoreLabel(recommendedRecipes, 'suggested')}
              onAction={() => toggleSection('suggested')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getVisibleRecipes(recommendedRecipes, 'suggested').map((recipe) => (
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
