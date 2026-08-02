'use server';

import { requireSession } from '@/lib/session';
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

/**
 * Estimate whole-recipe nutrition from an ingredient list (food-database
 * lookups). Returns null when nothing could be matched — the caller then leaves
 * the macros blank and tells the user.
 */
export async function estimateRecipeNutrition(
  ingredients: EstimateIngredient[],
): Promise<EstimatedNutrition | null> {
  await requireSession();
  try {
    return await estimateNutrition(ingredients);
  } catch {
    return null;
  }
}
