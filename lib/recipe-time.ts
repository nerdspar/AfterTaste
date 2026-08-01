import type { Recipe } from '@/data/sample/recipes';

/** Best-available total time in minutes (falls back to prep + cook). */
export function recipeTotalMinutes(r: Recipe): number {
  if (r.totalTimeMinutes && r.totalTimeMinutes > 0) return r.totalTimeMinutes;
  return (r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0);
}

/** Format minutes as "45 min" or "1h 30m". Empty string for 0. */
export function formatMinutes(m: number): string {
  if (!m || m <= 0) return '';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? `${h}h ${min}m` : `${h}h`;
}

/** Display label for a recipe's total time; falls back to its cookTime text. */
export function recipeTimeLabel(r: Recipe): string {
  return formatMinutes(recipeTotalMinutes(r)) || r.cookTime || '';
}
