import { SectionHeader } from '../SectionHeader';
import type { Recipe } from '@/data/sample/recipes';

interface RecipeNotesProps {
  recipe: Recipe;
}

/**
 * Shows the recipe's notes. "Recipe Notes" are tips that came with the
 * original recipe; "My Notes" are the household's own tweaks. Each block is
 * omitted when empty, and the whole section renders nothing when both are.
 */
export function RecipeNotes({ recipe }: RecipeNotesProps) {
  const recipeNotes = recipe.recipeNotes?.trim();
  const myNotes = recipe.myNotes?.trim();

  if (!recipeNotes && !myNotes) return null;

  return (
    <section>
      <SectionHeader title="Notes" />

      <div className="space-y-3">
        {recipeNotes && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700/40 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
              Recipe Notes
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {recipeNotes}
            </p>
          </div>
        )}

        {myNotes && (
          <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-500/30 dark:bg-primary-500/10">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary-500 dark:text-primary-400 mb-1.5">
              My Notes
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {myNotes}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
