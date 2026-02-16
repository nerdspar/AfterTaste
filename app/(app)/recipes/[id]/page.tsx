'use client';

import { use } from 'react';
import { Breadcrumbs } from '@/components/aftertaste/Breadcrumbs';
import { RecipeHero } from '@/components/aftertaste/recipe-detail/RecipeHero';
import { StatsRow } from '@/components/aftertaste/recipe-detail/StatsRow';
import { IngredientsPanel } from '@/components/aftertaste/recipe-detail/IngredientsPanel';
import { CookingInstructions } from '@/components/aftertaste/recipe-detail/CookingInstructions';
import { AIAssistantPanel } from '@/components/aftertaste/recipe-detail/AIAssistantPanel';
import { recommendedRecipes } from '@/data/sample/recipes';

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = use(params);
  const recipe = recommendedRecipes.find((r) => r.id === id) ?? recommendedRecipes[0];

  const breadcrumbs = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Recipes', href: '/recipes' },
    { label: recipe.category, href: '/recipes' },
    { label: recipe.title },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page title */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Details
      </h1>

      <Breadcrumbs items={breadcrumbs} className="mb-5" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <RecipeHero recipe={recipe} />
          <StatsRow recipe={recipe} />
          {recipe.instructions.length > 0 && (
            <CookingInstructions instructions={recipe.instructions} />
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {recipe.ingredients.length > 0 && (
            <IngredientsPanel ingredients={recipe.ingredients} />
          )}
          <AIAssistantPanel />
        </div>
      </div>
    </div>
  );
}
