import type { Recipe } from '@/data/sample/recipes';

// ---------------------------------------------------------------------------
// Filter config types – extensible by design.
// New filters can be added by appending to the `defaultFilterConfigs` array.
// Options within a filter can be edited, reordered, or changed at any time.
// ---------------------------------------------------------------------------

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  /** Unique key – maps to a field on Recipe (or a derived key like 'cookTimeBucket') */
  key: string;
  /** Display label shown in the UI */
  label: string;
  /** The Recipe field this filter reads from */
  recipeField: keyof Recipe;
  /** How the filter matches: 'exact' compares value directly, 'range' buckets numerics */
  matchMode: 'exact' | 'range';
  /** Available options the user can pick from (multi-select) */
  options: FilterOption[];
  /** Display order – lower numbers render first */
  order: number;
}

// ---------------------------------------------------------------------------
// Sort config
// ---------------------------------------------------------------------------

export interface SortOption {
  label: string;
  field: keyof Recipe;
  direction: 'asc' | 'desc';
}

export const sortOptions: SortOption[] = [
  { label: 'Rating (High to Low)', field: 'rating', direction: 'desc' },
  { label: 'Rating (Low to High)', field: 'rating', direction: 'asc' },
  { label: 'Cook Time (Quick First)', field: 'cookTimeMinutes', direction: 'asc' },
  { label: 'Cook Time (Longest First)', field: 'cookTimeMinutes', direction: 'desc' },
  { label: 'Calories (Low to High)', field: 'calories', direction: 'asc' },
  { label: 'Calories (High to Low)', field: 'calories', direction: 'desc' },
  { label: 'Ease (Easiest First)', field: 'ease', direction: 'desc' },
  { label: 'Taste (Best First)', field: 'taste', direction: 'desc' },
  { label: 'Cleanup (Easiest First)', field: 'cleanup', direction: 'desc' },
  { label: 'Times Remade (Most First)', field: 'remade', direction: 'desc' },
  { label: 'Title (A-Z)', field: 'title', direction: 'asc' },
  { label: 'Title (Z-A)', field: 'title', direction: 'desc' },
];

// ---------------------------------------------------------------------------
// Default filter configs – the full suite requested by the user.
// ---------------------------------------------------------------------------

export const defaultFilterConfigs: FilterConfig[] = [
  {
    key: 'source',
    label: 'Recipe Source',
    recipeField: 'source',
    matchMode: 'exact',
    order: 1,
    options: [
      { label: 'Cooking Class', value: 'Cooking Class' },
      { label: 'Internet', value: 'Internet' },
      { label: 'Cookbook', value: 'Cookbook' },
      { label: 'Family Recipe', value: 'Family Recipe' },
      { label: 'Friend Recommendation', value: 'Friend Recommendation' },
      { label: 'Original', value: 'Original' },
      { label: 'AI Generated', value: 'AI Generated' },
    ],
  },
  {
    key: 'cuisine',
    label: 'Cuisine',
    recipeField: 'cuisine',
    matchMode: 'exact',
    order: 2,
    options: [
      { label: 'American', value: 'American' },
      { label: 'Italian', value: 'Italian' },
      { label: 'Mexican', value: 'Mexican' },
      { label: 'Chinese', value: 'Chinese' },
      { label: 'Japanese', value: 'Japanese' },
      { label: 'Korean', value: 'Korean' },
      { label: 'Thai', value: 'Thai' },
      { label: 'Vietnamese', value: 'Vietnamese' },
      { label: 'Indian', value: 'Indian' },
      { label: 'Mediterranean', value: 'Mediterranean' },
      { label: 'Middle Eastern', value: 'Middle Eastern' },
      { label: 'French', value: 'French' },
      { label: 'Spanish', value: 'Spanish' },
      { label: 'Greek', value: 'Greek' },
      { label: 'Caribbean', value: 'Caribbean' },
      { label: 'Fusion', value: 'Fusion' },
    ],
  },
  {
    key: 'cookingClassType',
    label: 'Cooking Class Type',
    recipeField: 'cookingClassType',
    matchMode: 'exact',
    order: 3,
    options: [
      { label: 'Light & Fresh', value: 'Light & Fresh' },
      { label: 'Taco Tuesday', value: 'Taco Tuesday' },
      { label: 'Fusion Feast', value: 'Fusion Feast' },
      { label: 'Cozy Comfort Food', value: 'Cozy Comfort Food' },
      { label: 'Feeling Fancy', value: 'Feeling Fancy' },
      { label: 'Date Night In', value: 'Date Night In' },
      { label: 'Pasta Party', value: 'Pasta Party' },
      { label: 'Salad Celebration', value: 'Salad Celebration' },
    ],
  },
  {
    key: 'ease',
    label: 'Ease',
    recipeField: 'ease',
    matchMode: 'exact',
    order: 4,
    options: [
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
      { label: '4', value: '4' },
      { label: '5', value: '5' },
    ],
  },
  {
    key: 'taste',
    label: 'Taste',
    recipeField: 'taste',
    matchMode: 'exact',
    order: 5,
    options: [
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
      { label: '4', value: '4' },
      { label: '5', value: '5' },
    ],
  },
  {
    key: 'cleanup',
    label: 'Clean Up',
    recipeField: 'cleanup',
    matchMode: 'exact',
    order: 6,
    options: [
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
      { label: '4', value: '4' },
      { label: '5', value: '5' },
    ],
  },
  {
    key: 'cookTime',
    label: 'Cook Time',
    recipeField: 'cookTimeMinutes',
    matchMode: 'range',
    order: 7,
    options: [
      { label: '0-15 mins', value: '0-15' },
      { label: '15-30 mins', value: '15-30' },
      { label: '30-45 mins', value: '30-45' },
      { label: '45-60 mins', value: '45-60' },
      { label: '60-75 mins', value: '60-75' },
      { label: '75-90 mins', value: '75-90' },
      { label: '90+ mins', value: '90-9999' },
    ],
  },
  {
    key: 'makeAgain',
    label: 'Make Again?',
    recipeField: 'makeAgain',
    matchMode: 'exact',
    order: 8,
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' },
    ],
  },
  {
    key: 'remade',
    label: 'Remade',
    recipeField: 'remade',
    matchMode: 'range',
    order: 9,
    options: [
      { label: 'Never', value: '0-0' },
      { label: '1-3 times', value: '1-3' },
      { label: '4-6 times', value: '4-6' },
      { label: '7-9 times', value: '7-9' },
      { label: '10+ times', value: '10-9999' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Filter state type – a map from filter key → selected values (multi-select)
// ---------------------------------------------------------------------------

export type ActiveFilters = Record<string, string[]>;

// ---------------------------------------------------------------------------
// Engine – applies all active filters to a recipe list.
// ---------------------------------------------------------------------------

function matchesRange(value: number, rangeStr: string): boolean {
  const [minStr, maxStr] = rangeStr.split('-');
  const min = Number(minStr);
  const max = Number(maxStr);
  return value >= min && value <= max;
}

export function applyFilters(
  recipes: Recipe[],
  filters: ActiveFilters,
  configs: FilterConfig[],
): Recipe[] {
  const activeKeys = Object.keys(filters).filter(
    (k) => filters[k] && filters[k].length > 0,
  );

  if (activeKeys.length === 0) return recipes;

  return recipes.filter((recipe) =>
    activeKeys.every((key) => {
      const config = configs.find((c) => c.key === key);
      if (!config) return true;

      const selectedValues = filters[key];
      const recipeValue = recipe[config.recipeField];

      if (config.matchMode === 'range') {
        const numericValue = Number(recipeValue);
        return selectedValues.some((sv) => matchesRange(numericValue, sv));
      }

      // exact match – compare stringified recipe value against selected values
      const stringValue = String(recipeValue);
      return selectedValues.includes(stringValue);
    }),
  );
}

// ---------------------------------------------------------------------------
// Sort engine
// ---------------------------------------------------------------------------

export function applySort(recipes: Recipe[], sort: SortOption | null): Recipe[] {
  if (!sort) return recipes;

  return [...recipes].sort((a, b) => {
    const aVal = a[sort.field];
    const bVal = b[sort.field];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sort.direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    const aNum = Number(aVal);
    const bNum = Number(bVal);
    return sort.direction === 'asc' ? aNum - bNum : bNum - aNum;
  });
}
