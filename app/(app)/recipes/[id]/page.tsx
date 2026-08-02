'use client';

import { use, useEffect, useRef, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/aftertaste/Breadcrumbs';
import { RecipeHero } from '@/components/aftertaste/recipe-detail/RecipeHero';
import { StatsRow } from '@/components/aftertaste/recipe-detail/StatsRow';
import { NutritionPanel } from '@/components/aftertaste/recipe-detail/NutritionPanel';
import { RecipeRatings } from '@/components/aftertaste/recipe-detail/RecipeRatings';
import { IngredientsPanel } from '@/components/aftertaste/recipe-detail/IngredientsPanel';
import { CookingInstructions } from '@/components/aftertaste/recipe-detail/CookingInstructions';
import { RecipeNotes } from '@/components/aftertaste/recipe-detail/RecipeNotes';
import { AIAssistantPanel } from '@/components/aftertaste/recipe-detail/AIAssistantPanel';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { recordRecipeView } from '@/lib/recently-viewed';
import { useKeepAwake } from '@/lib/keep-awake';
import { useUserPrefs } from '@/components/aftertaste/UserPrefsProvider';

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = use(params);
  const { getRecipe } = useRecipeStore();
  const router = useRouter();
  const { prefs } = useUserPrefs();
  // Optionally keep the screen awake while viewing a recipe (Settings).
  useKeepAwake(prefs.keepAwake);
  const nutritionOn = prefs.nutrition;
  const [scaleMode, setScaleMode] = useState<'amount' | 'serving'>('amount');
  const [scaleValue, setScaleValue] = useState(1);
  // Tracks whether this recipe was ever present, so we can tell a freshly
  // deleted recipe (redirect to the list) apart from an unknown id (404).
  const existedRef = useRef(false);

  const recipe = getRecipe(id);
  if (recipe) existedRef.current = true;
  const recipeId = recipe?.id;

  useEffect(() => {
    if (!recipe && existedRef.current) {
      router.replace('/recipes');
    }
  }, [recipe, router]);

  // Track opens so the dashboard can surface "Recently Viewed".
  useEffect(() => {
    if (recipeId) recordRecipeView(recipeId);
  }, [recipeId]);

  if (!recipe) {
    // Recipe was deleted while we were viewing it — leaving for the list.
    if (existedRef.current) return null;
    // Genuinely unknown id.
    notFound();
  }

  const currentServings =
    scaleMode === 'amount'
      ? Math.round(recipe.servings * scaleValue)
      : Math.round(scaleValue);

  const breadcrumbs = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Recipes', href: '/recipes' },
    { label: recipe.category, href: `/recipes?tab=${recipe.category}` },
    { label: recipe.title },
  ];

  const ingredientsPanel =
    recipe.ingredients.length > 0 ? (
      <IngredientsPanel
        ingredients={recipe.ingredients}
        baseServings={recipe.servings}
        scaleMode={scaleMode}
        scaleValue={scaleValue}
        onScaleModeChange={setScaleMode}
        onScaleValueChange={setScaleValue}
        recipeId={recipe.id}
        recipeTitle={recipe.title}
      />
    ) : null;

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Details
      </h1>

      <Breadcrumbs items={breadcrumbs} className="mb-5" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Center column — the wide area gets the ingredients + instructions. */}
        <div className="lg:col-span-2 space-y-5">
          <RecipeHero recipe={recipe} />
          <StatsRow recipe={recipe} servings={currentServings} />
          {/* On mobile these sit up here near the stats; on desktop they move
              to the right rail so ingredients can fill the wide center column. */}
          <div className="space-y-5 lg:hidden">
            {nutritionOn && (
              <NutritionPanel recipe={recipe} servings={currentServings} />
            )}
            <RecipeRatings recipe={recipe} />
          </div>
          {ingredientsPanel}
          {recipe.instructions.length > 0 && (
            <CookingInstructions instructions={recipe.instructions} />
          )}
          <RecipeNotes recipe={recipe} />
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <div className="hidden space-y-5 lg:block">
            {nutritionOn && (
              <NutritionPanel recipe={recipe} servings={currentServings} />
            )}
            <RecipeRatings recipe={recipe} />
          </div>
          <AIAssistantPanel />
        </div>
      </div>
    </div>
  );
}
