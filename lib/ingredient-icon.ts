/**
 * Derives a small icon for an ingredient from its name — no per-ingredient
 * image needed. A curated keyword→emoji map covers common ingredients; anything
 * unmatched falls back to a color-hashed monogram (see getIngredientMonogram).
 */

// Only confident matches — a wrong emoji is worse than a clean monogram.
const INGREDIENT_EMOJI: Record<string, string> = {
  // Vegetables
  'cherry tomato': '🍅',
  tomato: '🍅',
  'sweet potato': '🍠',
  potato: '🥔',
  'green onion': '🧅',
  'spring onion': '🧅',
  'red onion': '🧅',
  onion: '🧅',
  shallot: '🧅',
  garlic: '🧄',
  carrot: '🥕',
  broccoli: '🥦',
  cucumber: '🥒',
  zucchini: '🥒',
  courgette: '🥒',
  lettuce: '🥬',
  romaine: '🥬',
  spinach: '🥬',
  kale: '🥬',
  cabbage: '🥬',
  'bok choy': '🥬',
  corn: '🌽',
  mushroom: '🍄',
  eggplant: '🍆',
  aubergine: '🍆',
  avocado: '🥑',
  'bell pepper': '🫑',
  jalapeno: '🌶️',
  chili: '🌶️',
  chilli: '🌶️',
  chile: '🌶️',
  'black pepper': '🧂',
  peppercorn: '🧂',
  pepper: '🫑',
  // Fruit
  lemon: '🍋',
  lime: '🍋',
  orange: '🍊',
  banana: '🍌',
  apple: '🍎',
  strawberry: '🍓',
  blueberry: '🫐',
  raspberry: '🫐',
  blackberry: '🫐',
  berry: '🫐',
  grape: '🍇',
  pineapple: '🍍',
  mango: '🥭',
  peach: '🍑',
  cherry: '🍒',
  coconut: '🥥',
  olive: '🫒',
  // Dairy & eggs
  egg: '🥚',
  butter: '🧈',
  parmesan: '🧀',
  mozzarella: '🧀',
  cheddar: '🧀',
  feta: '🧀',
  cheese: '🧀',
  milk: '🥛',
  cream: '🥛',
  yogurt: '🥛',
  yoghurt: '🥛',
  // Protein
  chicken: '🍗',
  turkey: '🍗',
  beef: '🥩',
  steak: '🥩',
  pork: '🥩',
  bacon: '🥓',
  ham: '🍖',
  lamb: '🍖',
  sausage: '🌭',
  shrimp: '🦐',
  prawn: '🦐',
  salmon: '🐟',
  tuna: '🐟',
  anchovy: '🐟',
  fish: '🐟',
  crab: '🦀',
  lobster: '🦞',
  // Grains & bakery
  baguette: '🥖',
  crouton: '🥖',
  bread: '🍞',
  rice: '🍚',
  spaghetti: '🍝',
  pasta: '🍝',
  noodle: '🍜',
  flour: '🌾',
  oat: '🌾',
  wheat: '🌾',
  // Nuts & legumes
  peanut: '🥜',
  almond: '🥜',
  cashew: '🥜',
  walnut: '🥜',
  pecan: '🥜',
  nut: '🥜',
  chickpea: '🫘',
  lentil: '🫘',
  bean: '🫘',
  pea: '🫛',
  // Herbs & aromatics
  basil: '🌿',
  cilantro: '🌿',
  coriander: '🌿',
  parsley: '🌿',
  mint: '🌿',
  rosemary: '🌿',
  thyme: '🌿',
  oregano: '🌿',
  dill: '🌿',
  herb: '🌿',
  ginger: '🫚',
  // Pantry & drinks
  honey: '🍯',
  salt: '🧂',
  chocolate: '🍫',
  cocoa: '🍫',
  coffee: '☕',
  tea: '🍵',
  wine: '🍷',
  beer: '🍺',
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Precompiled once, longest keyword first so specific matches win
// (e.g. "sweet potato" before "potato", "bell pepper" before "pepper").
// The leading \b lets plurals/suffixes match ("tomatoes") without matching
// mid-word ("unsalted" won't match "salt").
const MATCHERS: Array<{ re: RegExp; emoji: string }> = Object.keys(
  INGREDIENT_EMOJI,
)
  .sort((a, b) => b.length - a.length)
  .map((keyword) => ({
    re: new RegExp('\\b' + escapeRegExp(keyword)),
    emoji: INGREDIENT_EMOJI[keyword],
  }));

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    // Singularize "ies" plurals so "berries"/"cherries" match "berry"/"cherry".
    // ("oes"/"s" plurals already match via the leading-boundary prefix rule.)
    .replace(/\b(\w+?)ies\b/g, '$1y')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getIngredientEmoji(name: string): string | null {
  const normalized = normalize(name);
  if (!normalized) return null;
  for (const { re, emoji } of MATCHERS) {
    if (re.test(normalized)) return emoji;
  }
  return null;
}

// Full literal class strings so Tailwind's JIT scanner picks them up.
const MONOGRAM_COLORS = [
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
];

export function getIngredientMonogram(name: string): {
  letter: string;
  colorClass: string;
} {
  const trimmed = name.trim();
  const letter = (trimmed.match(/[a-z0-9]/i)?.[0] ?? '?').toUpperCase();
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
  }
  return {
    letter,
    colorClass: MONOGRAM_COLORS[hash % MONOGRAM_COLORS.length],
  };
}
