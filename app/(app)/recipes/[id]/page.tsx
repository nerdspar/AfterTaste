'use client';

import { use, useEffect, useRef, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { UtensilsCrossedIcon, PlayIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/aftertaste/Breadcrumbs';
import { RecipeHero } from '@/components/aftertaste/recipe-detail/RecipeHero';
import { StatsRow } from '@/components/aftertaste/recipe-detail/StatsRow';
import { NutritionPanel } from '@/components/aftertaste/recipe-detail/NutritionPanel';
import { RecipeRatings } from '@/components/aftertaste/recipe-detail/RecipeRatings';
import { IngredientsPanel } from '@/components/aftertaste/recipe-detail/IngredientsPanel';
import { CookingInstructions } from '@/components/aftertaste/recipe-detail/CookingInstructions';
import { RecipeNotes } from '@/components/aftertaste/recipe-detail/RecipeNotes';
import { AIAssistantPanel } from '@/components/aftertaste/recipe-detail/AIAssistantPanel';
import { CookIntentTracker } from '@/components/aftertaste/recipe-detail/CookIntentTracker';
import { CookMode } from '@/components/aftertaste/recipe-detail/CookMode';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { recordRecipeView } from '@/lib/recently-viewed';
import { useKeepAwake } from '@/lib/keep-awake';
import { useUserPrefs } from '@/components/aftertaste/UserPrefsProvider';
import { useCurrentUser } from '@/components/aftertaste/CurrentUserProvider';
import type { UnitSystem } from '@/lib/units';

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = use(params);
  const { getRecipe } = useRecipeStore();
  const router = useRouter();
  const { prefs } = useUserPrefs();
  // Imperial/metric is a profile field, not a pref toggle (Settings →
  // Appearance). Anything unrecognised falls back to how the recipe was written.
  const units: UnitSystem =
    useCurrentUser().units === 'metric' ? 'metric' : 'imperial';
  // Optionally keep the screen awake while viewing a recipe (Settings).
  useKeepAwake(prefs.keepAwake);
  const nutritionOn = prefs.nutrition;
  const [scaleMode, setScaleMode] = useState<'amount' | 'serving'>('amount');
  const [scaleValue, setScaleValue] = useState(1);
  const [cooking, setCooking] = useState(false);
  const cookFab = prefs.cookButton !== 'off';
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
        units={units}
      />
    ) : null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Watches how long this stays on screen, to ask about it later. */}
      <CookIntentTracker
        recipeId={recipe.id}
        afterMinutes={prefs.cookNudgeAfterMin}
        enabled={prefs.pushCookNudge}
      />
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Details
        </h1>
        <button
          type="button"
          onClick={() => setCooking(true)}
          className={cn(
            'h-9 items-center gap-1.5 rounded-lg bg-primary-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700',
            // With the floating button on, this would be a second copy of
            // itself on a phone; desktop has no floating button, so it stays.
            cookFab ? 'hidden md:inline-flex' : 'inline-flex',
          )}
        >
          <UtensilsCrossedIcon className="h-4 w-4" />
          Start cooking
        </button>
      </div>

      <Breadcrumbs items={breadcrumbs} className="mb-5" />

      {/* Floating start-cooking button. Mobile only, mirroring the add-recipe
          one: the point is not having to scroll back to the header once you
          are halfway down a recipe. */}
      {cookFab && !cooking && (
        <button
          type="button"
          onClick={() => setCooking(true)}
          aria-label="Start cooking"
          className={cn(
            'fixed right-4 bottom-24 z-40 flex h-12 w-12 items-center justify-center rounded-full md:hidden',
            'bg-primary-500 text-white shadow-lg shadow-primary-500/40 ring-1 ring-white/15',
            'transition-transform active:scale-95',
          )}
        >
          <PlayIcon className="h-6 w-6 translate-x-0.5" />
        </button>
      )}

      {cooking && (
        <CookMode
          recipeId={recipe.id}
          title={recipe.title}
          ingredients={recipe.ingredients}
          instructions={recipe.instructions}
          multiplier={
            scaleMode === 'amount' ? scaleValue : scaleValue / recipe.servings
          }
          units={units}
          nudgeEnabled={prefs.pushCookNudge}
          onClose={() => setCooking(false)}
          onFinish={() => {
            setCooking(false);
            // Straight to the ratings — this is the moment they can answer.
            document
              .getElementById('recipe-ratings')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Center column — the wide area gets the ingredients + instructions. */}
        <div className="lg:col-span-2 space-y-5">
          <RecipeHero recipe={recipe} onStartCooking={() => setCooking(true)} />
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
            <CookingInstructions
              instructions={recipe.instructions}
              units={units}
            />
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
