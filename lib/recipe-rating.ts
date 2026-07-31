import type { Recipe } from '@/data/sample/recipes';

/**
 * Your overall rating for a recipe: a taste-weighted blend of the personal
 * scores (taste 50%, ease 25%, cleanup 25%). All inputs are 1-5, so the result
 * is 1-5. This is the headline rating shown on cards and the detail page; the
 * `rating`/`ratingCount` fields hold the separate community/source rating.
 */
export function computePersonalRating(
  taste: number,
  ease: number,
  cleanup: number,
): number {
  return Math.round((taste * 0.5 + ease * 0.25 + cleanup * 0.25) * 10) / 10;
}

export function recipePersonalRating(recipe: Recipe): number {
  return computePersonalRating(recipe.taste, recipe.ease, recipe.cleanup);
}
