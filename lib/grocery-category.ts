/**
 * Best-effort mapping of an ingredient name to one of the grocery list's
 * categories, so ingredients added from a recipe land in a sensible section.
 * Falls back to "Pantry Essentials".
 */
export const GROCERY_CATEGORIES = [
  'Fruits & Vegetables',
  'Dairy & Eggs',
  'Grains & Cereals',
  'Protein',
  'Spices & Seasonings',
  'Pantry Essentials',
] as const;

const DEFAULT_CATEGORY = 'Pantry Essentials';

const RULES: Record<string, string> = {
  // Dairy & Eggs
  milk: 'Dairy & Eggs',
  cream: 'Dairy & Eggs',
  yogurt: 'Dairy & Eggs',
  yoghurt: 'Dairy & Eggs',
  cheese: 'Dairy & Eggs',
  feta: 'Dairy & Eggs',
  parmesan: 'Dairy & Eggs',
  mozzarella: 'Dairy & Eggs',
  cheddar: 'Dairy & Eggs',
  butter: 'Dairy & Eggs',
  egg: 'Dairy & Eggs',
  // Protein
  chicken: 'Protein',
  beef: 'Protein',
  steak: 'Protein',
  pork: 'Protein',
  turkey: 'Protein',
  lamb: 'Protein',
  bacon: 'Protein',
  sausage: 'Protein',
  ham: 'Protein',
  shrimp: 'Protein',
  prawn: 'Protein',
  salmon: 'Protein',
  tuna: 'Protein',
  anchovy: 'Protein',
  fish: 'Protein',
  crab: 'Protein',
  lobster: 'Protein',
  tofu: 'Protein',
  // Grains & Cereals
  rice: 'Grains & Cereals',
  pasta: 'Grains & Cereals',
  spaghetti: 'Grains & Cereals',
  noodle: 'Grains & Cereals',
  bread: 'Grains & Cereals',
  baguette: 'Grains & Cereals',
  crouton: 'Grains & Cereals',
  flour: 'Grains & Cereals',
  oat: 'Grains & Cereals',
  quinoa: 'Grains & Cereals',
  couscous: 'Grains & Cereals',
  tortilla: 'Grains & Cereals',
  cereal: 'Grains & Cereals',
  cracker: 'Grains & Cereals',
  // Spices & Seasonings
  salt: 'Spices & Seasonings',
  peppercorn: 'Spices & Seasonings',
  'black pepper': 'Spices & Seasonings',
  cinnamon: 'Spices & Seasonings',
  cumin: 'Spices & Seasonings',
  paprika: 'Spices & Seasonings',
  nutmeg: 'Spices & Seasonings',
  oregano: 'Spices & Seasonings',
  basil: 'Spices & Seasonings',
  thyme: 'Spices & Seasonings',
  rosemary: 'Spices & Seasonings',
  parsley: 'Spices & Seasonings',
  cilantro: 'Spices & Seasonings',
  coriander: 'Spices & Seasonings',
  dill: 'Spices & Seasonings',
  mint: 'Spices & Seasonings',
  chili: 'Spices & Seasonings',
  chilli: 'Spices & Seasonings',
  vanilla: 'Spices & Seasonings',
  spice: 'Spices & Seasonings',
  seasoning: 'Spices & Seasonings',
  // Fruits & Vegetables
  tomato: 'Fruits & Vegetables',
  'sweet potato': 'Fruits & Vegetables',
  potato: 'Fruits & Vegetables',
  onion: 'Fruits & Vegetables',
  shallot: 'Fruits & Vegetables',
  garlic: 'Fruits & Vegetables',
  carrot: 'Fruits & Vegetables',
  broccoli: 'Fruits & Vegetables',
  cucumber: 'Fruits & Vegetables',
  zucchini: 'Fruits & Vegetables',
  courgette: 'Fruits & Vegetables',
  lettuce: 'Fruits & Vegetables',
  romaine: 'Fruits & Vegetables',
  spinach: 'Fruits & Vegetables',
  kale: 'Fruits & Vegetables',
  cabbage: 'Fruits & Vegetables',
  corn: 'Fruits & Vegetables',
  mushroom: 'Fruits & Vegetables',
  eggplant: 'Fruits & Vegetables',
  aubergine: 'Fruits & Vegetables',
  avocado: 'Fruits & Vegetables',
  'bell pepper': 'Fruits & Vegetables',
  pepper: 'Fruits & Vegetables',
  lemon: 'Fruits & Vegetables',
  lime: 'Fruits & Vegetables',
  orange: 'Fruits & Vegetables',
  banana: 'Fruits & Vegetables',
  apple: 'Fruits & Vegetables',
  strawberry: 'Fruits & Vegetables',
  blueberry: 'Fruits & Vegetables',
  berry: 'Fruits & Vegetables',
  grape: 'Fruits & Vegetables',
  pineapple: 'Fruits & Vegetables',
  mango: 'Fruits & Vegetables',
  peach: 'Fruits & Vegetables',
  cherry: 'Fruits & Vegetables',
  celery: 'Fruits & Vegetables',
  ginger: 'Fruits & Vegetables',
  olive: 'Fruits & Vegetables',
  // Pantry Essentials
  'olive oil': 'Pantry Essentials',
  oil: 'Pantry Essentials',
  vinegar: 'Pantry Essentials',
  sugar: 'Pantry Essentials',
  honey: 'Pantry Essentials',
  sauce: 'Pantry Essentials',
  tahini: 'Pantry Essentials',
  mustard: 'Pantry Essentials',
  ketchup: 'Pantry Essentials',
  mayo: 'Pantry Essentials',
  broth: 'Pantry Essentials',
  stock: 'Pantry Essentials',
  chocolate: 'Pantry Essentials',
  cocoa: 'Pantry Essentials',
  peanut: 'Pantry Essentials',
  almond: 'Pantry Essentials',
  cashew: 'Pantry Essentials',
  walnut: 'Pantry Essentials',
  nut: 'Pantry Essentials',
  bean: 'Pantry Essentials',
  lentil: 'Pantry Essentials',
  chickpea: 'Pantry Essentials',
  coconut: 'Pantry Essentials',
  syrup: 'Pantry Essentials',
  extract: 'Pantry Essentials',
  baking: 'Pantry Essentials',
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longest keyword first so specific matches win ("sweet potato" over "potato",
// "olive oil" over "olive"/"oil", "eggplant" over "egg").
const MATCHERS: Array<{ re: RegExp; category: string }> = Object.keys(RULES)
  .sort((a, b) => b.length - a.length)
  .map((keyword) => ({
    re: new RegExp('\\b' + escapeRegExp(keyword)),
    category: RULES[keyword],
  }));

export function guessGroceryCategory(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(\w+?)ies\b/g, '$1y')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return DEFAULT_CATEGORY;
  for (const { re, category } of MATCHERS) {
    if (re.test(normalized)) return category;
  }
  return DEFAULT_CATEGORY;
}
