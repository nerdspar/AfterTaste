'use client';

import { SectionHeader } from '@/components/aftertaste/SectionHeader';
import { CategoryTiles } from '@/components/aftertaste/dashboard/CategoryTiles';
import { RecipeCard } from '@/components/aftertaste/dashboard/RecipeCard';
import { FindRecipesCard } from '@/components/aftertaste/dashboard/FindRecipesCard';
import { TodaysMeals } from '@/components/aftertaste/dashboard/TodaysMeals';
import { GroceryListWidget } from '@/components/aftertaste/dashboard/GroceryListWidget';
import {
  recommendedRecipes,
  recentlyViewedRecipes,
  recentlyAddedRecipes,
} from '@/data/sample/recipes';

export default function DashboardPage() {
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

          {/* Recommended Recipes */}
          <section>
            <SectionHeader
              title="Recommended Recipes"
              actionLabel="See more"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendedRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>

          {/* Recently Viewed */}
          <section>
            <SectionHeader
              title="Recently Viewed"
              actionLabel="See more"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentlyViewedRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>

          {/* Recently Added */}
          <section>
            <SectionHeader
              title="Recently Added"
              actionLabel="See more"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentlyAddedRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>

          {/* Find Recipes in Seconds */}
          <FindRecipesCard />
        </div>

        {/* Right Rail */}
        <div className="space-y-5">
          {/* Today's Meals */}
          <section>
            <SectionHeader title="Today's Meals" actionLabel="See more" />
            <TodaysMeals />
          </section>

          {/* Grocery List */}
          <section>
            <SectionHeader title="Grocery List" actionLabel="See more" />
            <GroceryListWidget />
          </section>
        </div>
      </div>
    </div>
  );
}
