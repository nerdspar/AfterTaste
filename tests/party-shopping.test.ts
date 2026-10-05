import { describe, expect, it } from 'vitest';
import {
  deriveShoppingLines,
  freshShoppingLines,
  type ShoppingDish,
} from '@/lib/party-shopping';
import type { Ingredient } from '@/data/sample/recipes';

/** Recipe ingredients carry an image; irrelevant here, required by the type. */
const ing = (quantity: string, name: string): Ingredient => ({ quantity, name, image: '' });
const section = (title: string): Ingredient =>
  ({ section: title, name: '', quantity: '', image: '' }) as Ingredient;

const dish = (over: Partial<ShoppingDish> & Pick<ShoppingDish, 'id' | 'name'>): ShoppingDish => ({
  multiplier: 1,
  instances: 1,
  broughtByGuest: false,
  ingredients: [],
  ...over,
});

describe('deriving a party shopping list', () => {
  it('merges the same ingredient across dishes and keeps the breakdown', () => {
    const lines = deriveShoppingLines([
      dish({ id: 'd1', name: 'Stuffing', ingredients: [ing('2 tbsp', 'butter')] }),
      dish({ id: 'd2', name: 'Rolls', ingredients: [ing('4 tbsp', 'butter')] }),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe('6 tbsp');
    // The breakdown is the whole point: an aggregate that reads wrong in an
    // aisle is only debuggable if it can say where it came from.
    expect(lines[0].from.map((f) => `${f.dishName} ${f.quantity}`)).toEqual([
      'Stuffing 2 tbsp',
      'Rolls 4 tbsp',
    ]);
  });

  it('applies the recipe multiplier', () => {
    const [line] = deriveShoppingLines([
      dish({
        id: 'd1',
        name: 'Stuffing',
        multiplier: 1.5,
        ingredients: [ing('2 cups', 'chicken broth')],
      }),
    ]);
    expect(line.quantity).toBe('3 cups');
  });

  it('multiplies by instances — two turkeys is twice the shopping', () => {
    const [line] = deriveShoppingLines([
      dish({
        id: 'd1',
        name: 'Turkey',
        instances: 2,
        ingredients: [ing('1', 'turkey')],
      }),
    ]);
    expect(line.quantity).toBe('2');
  });

  it('buys nothing for a dish a guest is bringing', () => {
    const lines = deriveShoppingLines([
      dish({
        id: 'd1',
        name: 'Pecan pie',
        broughtByGuest: true,
        ingredients: [ing('2 cups', 'pecans')],
      }),
    ]);
    expect(lines).toEqual([]);
  });

  it('lists the parts rather than guessing when units differ', () => {
    const [line] = deriveShoppingLines([
      dish({ id: 'd1', name: 'Turkey', ingredients: [ing('1/2 cup', 'butter')] }),
      dish({ id: 'd2', name: 'Greens', ingredients: [ing('2 tbsp', 'butter')] }),
    ]);
    // Converting cups to tablespoons is possible, but a wrong conversion on a
    // shopping list is worse than making the cook do the last step.
    expect(line.summed).toBe(false);
    expect(line.quantity).toContain('+');
  });

  it('skips section headers in a recipe ingredient list', () => {
    const lines = deriveShoppingLines([
      dish({
        id: 'd1',
        name: 'Stuffing',
        ingredients: [
          section('For the bread'),
          ing('1 loaf', 'sourdough'),
        ],
      }),
    ]);
    expect(lines.map((l) => l.label)).toEqual(['sourdough']);
  });

  it('merges names that differ only in preparation', () => {
    const lines = deriveShoppingLines([
      dish({ id: 'd1', name: 'Stuffing', ingredients: [ing('2', 'onions, diced')] }),
      dish({ id: 'd2', name: 'Gravy', ingredients: [ing('1', 'onions')] }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe('3');
  });

  it('sorts into grocery categories', () => {
    const lines = deriveShoppingLines([
      dish({
        id: 'd1',
        name: 'Dinner',
        ingredients: [
          ing('1', 'butter'),
          ing('2', 'onions'),
        ],
      }),
    ]);
    expect(lines.map((l) => l.category)).toEqual(['Dairy & Eggs', 'Fruits & Vegetables']);
  });
});

describe('re-deriving onto a list someone has already edited', () => {
  const lines = (...labels: string[]) =>
    deriveShoppingLines(
      labels.map((l, i) => dish({ id: `d${i}`, name: 'Dish', ingredients: [ing('1 cup', l)] })),
    );

  it('adds nothing the second time', () => {
    const derived = lines('butter', 'chicken broth');
    const once = freshShoppingLines(derived, []);
    expect(once.map((l) => l.label).sort()).toEqual(['butter', 'chicken broth']);

    // The button gets pressed again; the list already has these.
    const twice = freshShoppingLines(derived, once.map((l) => l.label));
    expect(twice).toEqual([]);
  });

  it('leaves an edited line alone instead of recomputing it', () => {
    const derived = lines('butter');
    // The cook wrote "1 stick is probably plenty" against this line last year.
    expect(freshShoppingLines(derived, ['Butter '])).toEqual([]);
  });

  it('still adds an ingredient a newly added dish brought in', () => {
    const derived = lines('butter', 'sage');
    const fresh = freshShoppingLines(derived, ['butter']);
    expect(fresh.map((l) => l.label)).toEqual(['sage']);
  });
});
