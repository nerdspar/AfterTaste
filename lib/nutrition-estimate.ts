// Estimate a recipe's nutrition from its ingredient list by looking each
// ingredient up in the food database (USDA + Open Food Facts, per-100 g) and
// scaling by a grams estimate parsed from the quantity text.
//
// Three things decide whether the number is any good: how much the line
// weighs, which food record we match, and whether that record is sane.
//   - Weight comes from lib/ingredient-weights (a cup of spinach is 30 g, not
//     240 g; a clove of garlic is 3 g). A line we cannot size is reported as
//     unmatched rather than given a made-up weight.
//   - Matching prefers the generic whole food over a branded package, since a
//     bakery's "Onion" bagel is a perfect name match and a 7x calorie error.
//   - Sanity checks live in lib/food-db, which drops records claiming things
//     like 1330 g of carbohydrate per 100 g.
//
// It is still an estimate — results are tagged nutritionSource="estimated" and
// meant to be reviewed. The single entry point estimateNutrition() is the seam
// where an LLM-based engine can slot in later.
//
// Server-only: imports food-db, which reads process.env and hits external APIs.

import { searchFoods, type FoodItem } from '@/lib/food-db';
import { weightsFor, isNegligible } from '@/lib/ingredient-weights';

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

// Units split by what they measure. Volume has to go through the
// ingredient's own density (a cup of spinach and a cup of honey differ by 10x),
// mass is exact, and the rest are "one of a thing".

/** Volume units, expressed in cups. */
const VOLUME_CUPS: Record<string, number> = {
  cup: 1, cups: 1, c: 1,
  tbsp: 1 / 16, tbsps: 1 / 16, tbs: 1 / 16,
  tablespoon: 1 / 16, tablespoons: 1 / 16,
  tsp: 1 / 48, tsps: 1 / 48, teaspoon: 1 / 48, teaspoons: 1 / 48,
  ml: 1 / 236.6, milliliter: 1 / 236.6, milliliters: 1 / 236.6,
  l: 4.227, liter: 4.227, liters: 4.227, litre: 4.227, litres: 4.227,
  'fl oz': 1 / 8, floz: 1 / 8,
  pint: 2, pints: 2, quart: 4, quarts: 4, gallon: 16, gallons: 16,
};

/** Mass units, in grams. */
const MASS_GRAMS: Record<string, number> = {
  g: 1, gram: 1, grams: 1, gr: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  mg: 0.001,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
};

// Units that count things rather than measure them. These are fallbacks: when
// the ingredient itself has a known per-item weight (a garlic clove is 3 g),
// that wins over the generic figure here.
const COUNT_GRAMS: Record<string, number> = {
  clove: 3, cloves: 3,
  slice: 25, slices: 25,
  stick: 113, sticks: 113, // a stick of butter
  can: 400, cans: 400, jar: 400, jars: 400,
  package: 250, packages: 250, pkg: 250, pkgs: 250,
  stalk: 40, stalks: 40, sprig: 3, sprigs: 3,
  head: 500, heads: 500, bunch: 150, bunches: 150,
  ear: 90, ears: 90, fillet: 170, fillets: 170,
  pinch: 0.4, pinches: 0.4, dash: 0.4, dashes: 0.4,
};

/** A cup of something we have no density for — water, near enough. */
const DEFAULT_GRAMS_PER_CUP = 240;

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

// Measure words that belong to the quantity, not the food. Without this the
// search for "3 cloves garlic" goes looking for cloves the spice.
const LEADING_MEASURE =
  /^\s*(cloves?|slices?|sticks?|cans?|jars?|packages?|pkgs?|stalks?|sprigs?|heads?|bunches?|bunch|ears?|fillets?|pinch(?:es)?|dash(?:es)?|cups?|tbsps?|tsps?|tablespoons?|teaspoons?|ounces?|oz|pounds?|lbs?|grams?|g|kg|ml|l)\b\s*/i;

function cleanFoodName(raw: string): string {
  const base = raw
    .replace(/\([^)]*\)/g, ' ') // parentheticals
    .split(',')[0] // drop "…, minced" style trailers
    .replace(NOISE, ' ')
    .replace(/\bof\b/gi, ' ')
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return base.replace(LEADING_MEASURE, '').trim() || base;
}

/**
 * Grams for one ingredient line. Returns 0 for a line that names a seasoning
 * without an amount ("salt, to taste"), and null when the line cannot be sized
 * at all — the caller reports that as an unmatched ingredient rather than
 * inventing a weight.
 */
function gramsForLine(
  quantity: string,
  name: string,
  item: FoodItem | null,
): number | null {
  const line = `${quantity} ${name}`.trim();
  // "to taste", "for garnish" — named, never measured. Counting these as a
  // real amount is how a pinch of salt became 100 g of it.
  if (isNegligible(line)) return 0;

  const { amount, rest } = parseLeadingAmount(line);
  if (amount == null) return null; // no number anywhere; nothing to scale
  const weights = weightsFor(name);

  const unitMatch = rest.match(/^([a-zA-Z.]+)\b/);
  const unit = unitMatch ? normalizeUnit(unitMatch[1]) : null;

  if (unit) {
    if (MASS_GRAMS[unit] != null) return amount * MASS_GRAMS[unit];
    if (VOLUME_CUPS[unit] != null) {
      const cups = amount * VOLUME_CUPS[unit];
      return cups * (weights.perCup ?? DEFAULT_GRAMS_PER_CUP);
    }
    if (COUNT_GRAMS[unit] != null) {
      return amount * (weights.perItem ?? COUNT_GRAMS[unit]);
    }
  }

  // No unit: a count of the thing itself ("2 eggs", "1 onion").
  const perItem = weights.perItem ?? item?.servingSizeG ?? null;
  if (perItem == null) return null;
  return amount * perItem;
}

function scale(per100: number | null, grams: number): number {
  if (per100 == null) return 0;
  return (per100 * grams) / 100;
}

// Small in-process cache so repeated ingredient names (across a recipe or
// between imports in the same server run) don't re-hit the food APIs.
const lookupCache = new Map<string, FoodItem | null>();

/**
 * How well a food record answers the ingredient we asked about. A recipe means
 * the generic staple, so a short unbranded name wins over a packaged product,
 * and a record sharing none of the query's words is not a match at all —
 * without that, "cloves garlic" happily matched ground clove spice.
 */
function scoreMatch(query: string, item: FoodItem): number {
  const q = query.toLowerCase().trim();
  const name = item.name.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const hits = words.filter((w) => name.includes(w)).length;
  if (hits === 0) return -1;

  // How much of what we asked for the name actually covers. This dominates
  // every other signal: a record matching both words of "black pepper" must
  // beat one matching only "pepper", or a raw banana pepper wins the spice.
  let score = (hits / words.length) * 100;
  // Whether the record is generic is the next strongest signal: a bakery's
  // branded "Onion" bagel is a perfect string match for "onion" and a 7x
  // calorie error, while the generic "Onions, Raw" is what the recipe means.
  if (!item.brand) score += 50;
  if (name === q) score += 20;
  else if (name.startsWith(q)) score += 10;
  // A recipe calling for chicken breast means the raw cut, not an oven-roasted
  // deli roll. USDA marks the whole-food entries "raw".
  if (/\braw\b/.test(name)) score += 20;
  // Every extra comma-separated qualifier narrows the record to a more
  // specific preparation than the recipe asked for. Kept gentle, because USDA
  // names whole foods verbosely ("Chicken, Broilers Or Fryers, Breast, Raw").
  score -= 3 * Math.max(0, name.split(',').length - 2);
  score -= Math.min(12, name.length / 5);
  return score;
}

async function lookupFood(name: string): Promise<FoodItem | null> {
  const key = name.toLowerCase();
  if (lookupCache.has(key)) return lookupCache.get(key) ?? null;
  let item: FoodItem | null = null;
  try {
    const results = await searchFoods(name);
    let bestScore = 0; // anything at or below this is not worth matching
    for (const candidate of results) {
      const score = scoreMatch(name, candidate);
      if (score > bestScore) {
        bestScore = score;
        item = candidate;
      }
    }
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
    const grams = gramsForLine(ing.quantity, ing.name, food);
    // null = we could not size the line at all, so it stays unmatched rather
    // than contributing a guessed weight.
    if (grams == null) return;
    // 0 = a seasoning-to-taste or garnish: correctly handled, adds nothing.
    if (grams === 0) {
      matched += 1;
      return;
    }
    if (!food) return; // sized, but no nutrition data to scale
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
