// Estimate a recipe's nutrition from its ingredient list by looking each
// ingredient up in the food database (USDA + Open Food Facts, per-100 g) and
// scaling by a grams estimate parsed from the quantity text.
//
// This is inherently approximate — quantity parsing, volume→grams (which
// ignores density), and food matching are all fuzzy — so results are tagged
// nutritionSource="estimated" and meant to be reviewed. The single entry point
// estimateNutrition() is the seam where an LLM-based engine can slot in later.
//
// Server-only: imports food-db, which reads process.env and hits external APIs.

import { searchFoods, type FoodItem } from '@/lib/food-db';

export interface EstimatedNutrition {
  // Whole-recipe totals (the recipe form enters whole-recipe numbers).
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  /** How many real ingredients we found a food match for. */
  matched: number;
  /** How many real ingredients there were (excludes section headers). */
  total: number;
}

export interface EstimateIngredient {
  name: string;
  quantity: string;
  section?: string;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6,
};

// Grams per unit. Mass units are exact; volume units assume a water-like
// density (~1 g/ml) and are therefore rough for solids. Keys are normalized
// (lowercased, trailing period stripped).
const UNIT_GRAMS: Record<string, number> = {
  g: 1, gram: 1, grams: 1, gr: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  mg: 0.001,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
  // volume (approx)
  cup: 240, cups: 240, c: 240,
  tbsp: 15, tbsps: 15, tablespoon: 15, tablespoons: 15, tbs: 15,
  tsp: 5, tsps: 5, teaspoon: 5, teaspoons: 5,
  ml: 1, milliliter: 1, milliliters: 1,
  l: 1000, liter: 1000, liters: 1000, litre: 1000,
  'fl oz': 30, floz: 30,
  pint: 473, pints: 473, quart: 946, quarts: 946, gallon: 3785,
  pinch: 0.5, dash: 0.5,
  // count-ish approximations
  clove: 5, cloves: 5,
  slice: 25, slices: 25,
  stick: 113, sticks: 113, // a stick of butter
  can: 400, cans: 400,
  package: 250, packages: 250, pkg: 250,
  stalk: 40, stalks: 40, sprig: 3, sprigs: 3,
};

// Fallback grams for a "count" ingredient (e.g. "2 eggs") when the matched
// food has no labelled serving size.
const DEFAULT_ITEM_GRAMS = 100;

function normalizeUnit(token: string): string {
  return token.toLowerCase().replace(/\.+$/, '').trim();
}

/** Parse a leading numeric amount (int, decimal, fraction, mixed, or range). */
function parseLeadingAmount(input: string): { amount: number | null; rest: string } {
  // Expand unicode fractions to "+0.5" style so "1½" and "1 ½" both work.
  let s = input;
  for (const [glyph, val] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.replace(new RegExp(glyph, 'g'), ` ${val} `);
  }
  s = s.replace(/\s+/g, ' ').trim();

  // Range: "1-2", "1 to 2" → average.
  const range = s.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\b/i);
  if (range) {
    const a = (parseFloat(range[1]) + parseFloat(range[2])) / 2;
    return { amount: a, rest: s.slice(range[0].length).trim() };
  }
  // Mixed number: "1 1/2".
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)\b/);
  if (mixed) {
    const a = parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
    return { amount: a, rest: s.slice(mixed[0].length).trim() };
  }
  // Simple fraction: "1/2".
  const frac = s.match(/^(\d+)\/(\d+)\b/);
  if (frac) {
    return { amount: parseInt(frac[1], 10) / parseInt(frac[2], 10), rest: s.slice(frac[0].length).trim() };
  }
  // Decimal or integer, possibly a sum from an expanded unicode fraction
  // ("1 0.5" → 1.5).
  const dec = s.match(/^(\d+(?:\.\d+)?)(?:\s+(\d+\.\d+))?\b/);
  if (dec) {
    let a = parseFloat(dec[1]);
    if (dec[2]) a += parseFloat(dec[2]);
    return { amount: a, rest: s.slice(dec[0].length).trim() };
  }
  return { amount: null, rest: s };
}

// Prep/qualifier words to drop so the food search matches the core ingredient.
const NOISE =
  /\b(fresh(?:ly)?|dried|chopped|minced|diced|sliced|grated|shredded|ground|crushed|melted|softened|packed|divided|drained|rinsed|cooked|raw|large|small|medium|ripe|boneless|skinless|to taste|optional|for serving|for garnish|plus more|room temperature|at room temperature|finely|roughly|thinly)\b/gi;

function cleanFoodName(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, ' ') // parentheticals
    .split(',')[0] // drop "…, minced" style trailers
    .replace(NOISE, ' ')
    .replace(/\bof\b/gi, ' ')
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Grams for one ingredient line, given its best food match (for serving size). */
function gramsForLine(quantity: string, name: string, item: FoodItem | null): number {
  const line = `${quantity} ${name}`.trim();
  const { amount, rest } = parseLeadingAmount(line);
  const qty = amount == null ? 1 : amount;

  // Try to read a unit from the token right after the amount.
  const unitMatch = rest.match(/^([a-zA-Z.]+)\b/);
  if (unitMatch) {
    const u = normalizeUnit(unitMatch[1]);
    if (UNIT_GRAMS[u] != null) return qty * UNIT_GRAMS[u];
  }
  // No recognized unit → treat as a count of items.
  return qty * (item?.servingSizeG ?? DEFAULT_ITEM_GRAMS);
}

function scale(per100: number | null, grams: number): number {
  if (per100 == null) return 0;
  return (per100 * grams) / 100;
}

// Small in-process cache so repeated ingredient names (across a recipe or
// between imports in the same server run) don't re-hit the food APIs.
const lookupCache = new Map<string, FoodItem | null>();

async function lookupFood(name: string): Promise<FoodItem | null> {
  const key = name.toLowerCase();
  if (lookupCache.has(key)) return lookupCache.get(key) ?? null;
  let item: FoodItem | null = null;
  try {
    const results = await searchFoods(name);
    item = results[0] ?? null;
  } catch {
    item = null;
  }
  if (lookupCache.size > 500) lookupCache.clear();
  lookupCache.set(key, item);
  return item;
}

/**
 * Estimate whole-recipe nutrition from an ingredient list. Returns null when
 * nothing could be matched (caller should then leave nutrition blank + notify).
 */
export async function estimateNutrition(
  ingredients: EstimateIngredient[],
): Promise<EstimatedNutrition | null> {
  // Real ingredients only (section headers carry a `section` field).
  const items = ingredients.filter((i) => !i.section && i.name.trim());
  if (items.length === 0) return null;

  const totals = {
    calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0,
  };
  let matched = 0;

  // Look up each ingredient's food (deduped via the cache).
  const foods = await Promise.all(
    items.map((i) => lookupFood(cleanFoodName(i.name) || i.name)),
  );

  items.forEach((ing, idx) => {
    const food = foods[idx];
    if (!food) return;
    const grams = gramsForLine(ing.quantity, ing.name, food);
    if (grams <= 0) return;
    matched += 1;
    totals.calories += scale(food.per100.calories, grams);
    totals.proteinG += scale(food.per100.proteinG, grams);
    totals.carbsG += scale(food.per100.carbsG, grams);
    totals.fatG += scale(food.per100.fatG, grams);
    totals.fiberG += scale(food.per100.fiberG, grams);
    totals.sugarG += scale(food.per100.sugarG, grams);
    totals.sodiumMg += scale(food.per100.sodiumMg, grams);
  });

  if (matched === 0) return null;

  return {
    calories: Math.round(totals.calories),
    proteinG: Math.round(totals.proteinG),
    carbsG: Math.round(totals.carbsG),
    fatG: Math.round(totals.fatG),
    fiberG: Math.round(totals.fiberG),
    sugarG: Math.round(totals.sugarG),
    sodiumMg: Math.round(totals.sodiumMg),
    matched,
    total: items.length,
  };
}
