// Turning a party's dishes into shopping lines.
//
// The list is the cook's, not the app's. These lines are a starting point that
// gets edited, overruled and added to — last year's note says "we made too much
// butter (1 stick is probably plenty)", which is a person overruling exactly the
// kind of number this file produces. So two rules follow from that:
//
//   - Every derived line keeps the dishes it came from, because an aggregate
//     that reads wrong in a supermarket aisle is only debuggable if it can show
//     its working-out.
//   - A line someone has edited is never silently recomputed.
//
// Guest-brought dishes contribute nothing: they cost oven time, not money.

import { scaleQuantity } from '@/lib/quantity';
import { guessGroceryCategory } from '@/lib/grocery-category';
import type { Ingredient } from '@/data/sample/recipes';

/** A dish as this module needs to see it. */
export interface ShoppingDish {
  id: string;
  name: string;
  /** "1.5x recipe". Applied to every quantity. */
  multiplier: number;
  /** Two turkeys means twice the shopping, even though it is one dish. */
  instances: number;
  /** Set when a guest is bringing it — then it buys nothing. */
  broughtByGuest: boolean;
  ingredients: Ingredient[];
}

export interface DerivedLine {
  /** Lower-cased ingredient name; the key lines are merged on. */
  key: string;
  /** Display name, taken from the first dish that mentioned it. */
  label: string;
  /** Combined amount where the units allowed it, else the parts listed. */
  quantity: string;
  category: string;
  /** Which dishes fed this line, and how much each wanted. */
  from: { dishId: string; dishName: string; quantity: string }[];
  /** False when the amounts could not be added up and are merely listed. */
  summed: boolean;
}

/** Ingredient names are messy; merge on something stable but recognisable. */
function mergeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(',')[0]
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "2 tbsp" → { amount: 2, unit: 'tbsp' }, or null if it isn't that simple. */
const SIMPLE = /^\s*(\d+(?:\.\d+)?)\s*([a-z]+)?\s*$/i;

function parseSimple(q: string): { amount: number; unit: string } | null {
  const m = q.match(SIMPLE);
  if (!m) return null;
  return { amount: Number(m[1]), unit: (m[2] ?? '').toLowerCase() };
}

/**
 * Add up a set of quantities for one ingredient.
 *
 * Deliberately conservative: it only sums quantities that share a unit after
 * scaling. Converting tablespoons to cups to grams is possible with the density
 * table, but a wrong conversion on a shopping list is worse than a line that
 * reads "½ cup + 2 tbsp" and lets the cook do the last step.
 */
function combine(parts: string[]): { quantity: string; summed: boolean } {
  const parsed = parts.map(parseSimple);
  const units = new Set(parsed.map((p) => p?.unit ?? null));
  if (parsed.every((p) => p !== null) && units.size === 1) {
    const total = parsed.reduce((sum, p) => sum + (p as { amount: number }).amount, 0);
    const unit = (parsed[0] as { unit: string }).unit;
    const rounded = Number(total.toFixed(2));
    return { quantity: unit ? `${rounded} ${unit}` : String(rounded), summed: true };
  }
  const listed = parts.filter((p) => p.trim()).join(' + ');
  return { quantity: listed, summed: false };
}

/**
 * Shopping lines for a party's dishes, one per ingredient, in category order.
 *
 * Section headers in a recipe's ingredient list are skipped, and so is anything
 * a guest is bringing.
 */
export function deriveShoppingLines(dishes: ShoppingDish[]): DerivedLine[] {
  const byKey = new Map<string, DerivedLine>();

  for (const dish of dishes) {
    if (dish.broughtByGuest) continue;
    const factor = dish.multiplier * Math.max(1, dish.instances);

    for (const ing of dish.ingredients) {
      if (ing.section !== undefined) continue; // a header, not an ingredient
      const name = ing.name?.trim();
      if (!name) continue;
      const key = mergeKey(name);
      if (!key) continue;

      const scaled = scaleQuantity(ing.quantity ?? '', factor);
      const existing = byKey.get(key);
      if (existing) {
        existing.from.push({ dishId: dish.id, dishName: dish.name, quantity: scaled });
      } else {
        byKey.set(key, {
          key,
          label: name,
          quantity: scaled,
          category: guessGroceryCategory(name),
          from: [{ dishId: dish.id, dishName: dish.name, quantity: scaled }],
          summed: true,
        });
      }
    }
  }

  for (const line of byKey.values()) {
    const combined = combine(line.from.map((f) => f.quantity));
    line.quantity = combined.quantity;
    line.summed = combined.summed || line.from.length === 1;
  }

  return [...byKey.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label),
  );
}

/** Lines are matched to what is already on the list by name, loosely. */
function listKey(label: string): string {
  return label.toLowerCase().trim();
}

/**
 * The lines a re-derive should actually add.
 *
 * Deriving is a button, which means it gets pressed again after a dish is added
 * — and the list it is adding to has been edited by then. So an ingredient that
 * is already on the list is skipped rather than merged or overwritten: the line
 * sitting there may say "1 stick is probably plenty", and recomputing it would
 * throw away the only part of the list that was actually decided by a person.
 *
 * Running this twice in a row therefore adds nothing the second time.
 */
export function freshShoppingLines(
  lines: DerivedLine[],
  existingLabels: string[],
): DerivedLine[] {
  const have = new Set(existingLabels.map(listKey));
  return lines.filter((l) => !have.has(listKey(l.label)));
}
