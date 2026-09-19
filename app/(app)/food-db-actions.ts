'use server';

import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { searchFoods, lookupBarcode, type FoodItem } from '@/lib/food-db';
import {
  estimateNutrition,
  type EstimateIngredient,
  type EstimatedNutrition,
} from '@/lib/nutrition-estimate';

// Thin authenticated wrappers around the food-database lookups. Running them
// server-side keeps the (optional) USDA key private and avoids browser CORS.

export async function searchFoodDatabase(query: string): Promise<FoodItem[]> {
  await requireSession();
  try {
    return await searchFoods(query);
  } catch {
    return [];
  }
}

export async function lookupFoodBarcode(
  code: string,
): Promise<FoodItem | null> {
  await requireSession();
  try {
    return await lookupBarcode(code);
  } catch {
    return null;
  }
}

/** A saved IngredientMatch row, back in the shape the estimator works in. */
type SavedMatch = {
  term: string;
  foodId: string;
  foodName: string;
  brand: string | null;
  source: string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  servingSizeG: number | null;
};

function rowToFood(row: SavedMatch): FoodItem {
  return {
    id: row.foodId,
    name: row.foodName,
    brand: row.brand ?? undefined,
    source: row.source === 'off' ? 'off' : 'usda',
    per100: {
      calories: row.calories,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      fiberG: row.fiberG,
      sugarG: row.sugarG,
      sodiumMg: row.sodiumMg,
    },
    servingSizeG: row.servingSizeG ?? undefined,
  };
}

/**
 * Estimate whole-recipe nutrition from an ingredient list (food-database
 * lookups), applying the household's saved ingredient corrections first.
 * Returns null when nothing could be matched — the caller then leaves the
 * macros blank and tells the user.
 */
export async function estimateRecipeNutrition(
  ingredients: EstimateIngredient[],
): Promise<EstimatedNutrition | null> {
  const { householdId } = await requireSession();
  try {
    const rows = await prisma.ingredientMatch.findMany({
      where: { householdId },
    });
    const saved = new Map<string, FoodItem>(
      rows.map((r) => [r.term, rowToFood(r)] as const),
    );
    return await estimateNutrition(ingredients, saved);
  } catch {
    return null;
  }
}

/**
 * Remember what this household means by an ingredient. Upserted per term, so
 * correcting the same ingredient twice replaces the answer rather than
 * accumulating them, and every later estimate — for anyone in the household —
 * uses it without asking the food APIs.
 */
export async function saveIngredientMatch(
  term: string,
  food: FoodItem,
): Promise<void> {
  const { householdId } = await requireSession();
  const key = term.toLowerCase().trim();
  if (!key) return;
  const snapshot = {
    foodId: food.id,
    foodName: food.name,
    brand: food.brand ?? null,
    source: food.source,
    calories: food.per100.calories,
    proteinG: food.per100.proteinG,
    carbsG: food.per100.carbsG,
    fatG: food.per100.fatG,
    fiberG: food.per100.fiberG,
    sugarG: food.per100.sugarG,
    sodiumMg: food.per100.sodiumMg,
    servingSizeG: food.servingSizeG ?? null,
  };
  await prisma.ingredientMatch.upsert({
    where: { householdId_term: { householdId, term: key } },
    create: { householdId, term: key, ...snapshot },
    update: snapshot,
  });
}

/** Drop a saved correction, so the estimator goes back to guessing this term. */
export async function forgetIngredientMatch(term: string): Promise<void> {
  const { householdId } = await requireSession();
  await prisma.ingredientMatch.deleteMany({
    where: { householdId, term: term.toLowerCase().trim() },
  });
}
