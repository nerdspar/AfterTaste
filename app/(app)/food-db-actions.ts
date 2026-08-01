'use server';

import { requireSession } from '@/lib/session';
import { searchFoods, lookupBarcode, type FoodItem } from '@/lib/food-db';

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
