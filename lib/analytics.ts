import type { Recipe } from '@/data/sample/recipes';
import { computePersonalRating } from '@/lib/recipe-rating';

// Canonical meal-category order for charts (Snack included).
export const MEAL_CATEGORY_ORDER = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Dessert',
] as const;

/** A recipe counts as "rated" once any personal score has been set. */
export function isRated(r: Recipe): boolean {
  return r.taste > 0 || r.ease > 0 || r.cleanup > 0;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((s, n) => s + n, 0) / values.length : 0;
}

// Present categories in canonical order, then any unknown ones by count.
function orderedCounts(
  counts: Record<string, number>,
  order: readonly string[],
): [string, number][] {
  const known = order
    .filter((k) => counts[k] > 0)
    .map((k) => [k, counts[k]] as [string, number]);
  const extras = Object.keys(counts)
    .filter((k) => !order.includes(k) && counts[k] > 0)
    .sort((a, b) => counts[b] - counts[a])
    .map((k) => [k, counts[k]] as [string, number]);
  return [...known, ...extras];
}

// ---------------------------------------------------------------------------
// Ratings (formerly "Scoring")
// ---------------------------------------------------------------------------

export interface ScoringData {
  total: number;
  ratedCount: number;
  avgRating: number | null;
  avgEase: number;
  avgTaste: number;
  avgCleanup: number;
  avgCost: number | null;
  avgCookTime: number;
  quickCount: number;
  totalRemade: number;
  makeAgainCount: number;
  makeAgainDecided: number;
  makeAgainPct: number | null;
  ratingBuckets: { star: number; count: number }[];
  topScored: { id: string; title: string; score: number }[];
  mostRemade: { id: string; title: string; remade: number }[];
}

export function computeScoring(recipes: Recipe[]): ScoringData {
  const total = recipes.length;
  const rated = recipes.filter(isRated);
  const ratedCount = rated.length;

  const avgRating = ratedCount
    ? mean(rated.map((r) => computePersonalRating(r.taste, r.ease, r.cleanup)))
    : null;

  const costs = recipes.filter((r) => r.cost > 0).map((r) => r.cost);

  const decided = recipes.filter((r) => r.makeAgain !== null);
  const makeAgainCount = recipes.filter((r) => r.makeAgain === true).length;

  const ratingBuckets = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: rated.filter(
      (r) =>
        Math.round(computePersonalRating(r.taste, r.ease, r.cleanup)) === star,
    ).length,
  }));

  const topScored = rated
    .map((r) => ({ id: r.id, title: r.title, score: r.ease + r.taste + r.cleanup }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const mostRemade = recipes
    .filter((r) => r.remade > 0)
    .map((r) => ({ id: r.id, title: r.title, remade: r.remade }))
    .sort((a, b) => b.remade - a.remade)
    .slice(0, 5);

  return {
    total,
    ratedCount,
    avgRating,
    avgEase: mean(rated.map((r) => r.ease)),
    avgTaste: mean(rated.map((r) => r.taste)),
    avgCleanup: mean(rated.map((r) => r.cleanup)),
    avgCost: costs.length ? mean(costs) : null,
    avgCookTime: total ? Math.round(mean(recipes.map((r) => r.cookTimeMinutes))) : 0,
    quickCount: recipes.filter(
      (r) => r.cookTimeMinutes > 0 && r.cookTimeMinutes <= 30,
    ).length,
    totalRemade: recipes.reduce((s, r) => s + r.remade, 0),
    makeAgainCount,
    makeAgainDecided: decided.length,
    makeAgainPct: decided.length
      ? Math.round((makeAgainCount / decided.length) * 100)
      : null,
    ratingBuckets,
    topScored,
    mostRemade,
  };
}

// ---------------------------------------------------------------------------
// Collection (formerly "Insights")
// ---------------------------------------------------------------------------

export interface CollectionData {
  totalRecipes: number;
  totalCalories: number;
  avgCookTime: number;
  avgRating: number | null;
  topCategory: string | null;
  categoryEntries: [string, number][];
  cuisineEntries: [string, number][];
  sourceEntries: [string, number][];
  categoryAvgCalories: { category: string; avg: number }[];
}

export function computeCollection(recipes: Recipe[]): CollectionData {
  const totalRecipes = recipes.length;
  const totalCalories = recipes.reduce((s, r) => s + r.calories, 0);
  const avgCookTime = totalRecipes
    ? Math.round(mean(recipes.map((r) => r.totalTimeMinutes)))
    : 0;

  const rated = recipes.filter(isRated);
  const avgRating = rated.length
    ? mean(rated.map((r) => computePersonalRating(r.taste, r.ease, r.cleanup)))
    : null;

  const catCounts: Record<string, number> = {};
  for (const r of recipes) catCounts[r.category] = (catCounts[r.category] ?? 0) + 1;
  const categoryEntries = orderedCounts(catCounts, MEAL_CATEGORY_ORDER);
  const topCategory = categoryEntries.length
    ? [...categoryEntries].sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const cuisineCounts: Record<string, number> = {};
  for (const r of recipes) {
    if (r.cuisine) cuisineCounts[r.cuisine] = (cuisineCounts[r.cuisine] ?? 0) + 1;
  }
  const cuisineEntries = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const sourceCounts: Record<string, number> = {};
  for (const r of recipes) {
    if (r.source) sourceCounts[r.source] = (sourceCounts[r.source] ?? 0) + 1;
  }
  const sourceEntries = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);

  const categoryAvgCalories = categoryEntries.map(([category]) => {
    const catRecipes = recipes.filter((r) => r.category === category);
    return {
      category,
      avg: Math.round(mean(catRecipes.map((r) => r.calories))),
    };
  });

  return {
    totalRecipes,
    totalCalories,
    avgCookTime,
    avgRating,
    topCategory,
    categoryEntries,
    cuisineEntries,
    sourceEntries,
    categoryAvgCalories,
  };
}
