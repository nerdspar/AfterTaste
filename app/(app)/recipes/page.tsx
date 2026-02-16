'use client';

import { RecipeCard } from '@/components/aftertaste/dashboard/RecipeCard';
import { Chip } from '@/components/aftertaste/Chip';
import { recommendedRecipes, categories } from '@/data/sample/recipes';
import { useState } from 'react';

export default function MyRecipesPage() {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const filterOptions = ['All', ...categories.map((c) => c.label)];

  const filtered =
    activeFilter === 'All'
      ? recommendedRecipes
      : recommendedRecipes.filter((r) => r.category === activeFilter);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        My Recipes
      </h1>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {filterOptions.map((opt) => (
          <Chip
            key={opt}
            label={opt}
            selected={activeFilter === opt}
            onClick={() => setActiveFilter(opt)}
          />
        ))}
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}
