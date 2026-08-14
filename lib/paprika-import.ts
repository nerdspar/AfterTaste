import JSZip from 'jszip';
import type { Recipe, Ingredient, Instruction } from '@/data/sample/recipes';
import { downscaleImage } from './crouton-import';

// ---------------------------------------------------------------------------
// Paprika 3 recipe files. A `.paprikarecipes` file is a ZIP of `.paprikarecipe`
// entries; each entry — and a standalone `.paprikarecipe` — is GZIP-compressed
// JSON. Fields follow Paprika's documented export schema. Ingredients and
// directions arrive as newline-separated strings (not arrays like Crouton).
// ---------------------------------------------------------------------------

export interface PaprikaRecipe {
  uid?: string;
  name?: string;
  ingredients?: string; // newline-separated
  directions?: string; // newline-separated
  description?: string;
  notes?: string;
  nutritional_info?: string;
  prep_time?: string;
  cook_time?: string;
  total_time?: string;
  difficulty?: string;
  servings?: string;
  rating?: number; // 0–5 stars
  source?: string;
  source_url?: string;
  photo_data?: string; // base64 JPEG, no data: prefix
  image_url?: string; // remote photo URL
  categories?: string[]; // user folders / tags
  created?: string; // "YYYY-MM-DD HH:MM:SS"
}

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face';

// Meal categories mirror the Crouton importer: Paprika has no meal-type field,
// but the user's folders often name one, so map a matching folder to a category.
const CATEGORY_KEYWORDS: [string, RegExp][] = [
  ['Breakfast', /\b(breakfast|brunch)\b/i],
  ['Lunch', /\blunch\b/i],
  ['Dessert', /\b(dessert|sweets?|baking|cake|cookie)\b/i],
  ['Snack', /\b(snack|appetiz|starter|side|dip)\b/i],
  ['Dinner', /\b(dinner|supper|main|entr[ée]e|mains)\b/i],
];

function categoryFrom(cats?: string[]): string {
  if (Array.isArray(cats)) {
    for (const [category, re] of CATEGORY_KEYWORDS) {
      if (cats.some((c) => typeof c === 'string' && re.test(c))) return category;
    }
  }
  return 'Dinner';
}

interface Nutrition {
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  hasMacros: boolean;
}

// Paprika stores nutrition as a free-text blob ("Calories 200, Fat: 5 g, ...").
// Pull out whatever's present; the separator after a label may be ':' or space.
function parseNutrition(info?: string): Nutrition {
  const num = (label: string): number | undefined => {
    if (!info) return undefined;
    const m = info.match(new RegExp(`${label}[:\\s]\\s*([\\d.]+)`, 'i'));
    return m ? Math.round(Number(m[1])) : undefined;
  };
  const proteinG = num('Protein');
  const carbsG = num('(?:Carbohydrates?|Carbs?)');
  const fatG = num('Fat');
  const fiberG = num('Fib(?:er|re)');
  const sugarG = num('Sugar');
  const sodiumMg = num('Sodium');
  return {
    calories: num('Calories') ?? 0,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    sugarG,
    sodiumMg,
    hasMacros: [proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg].some(
      (v) => v !== undefined,
    ),
  };
}

// Parse a Paprika time string ("10 min", "1 hr 30 min", "1:30") to minutes.
function parseMinutes(s?: string): number {
  if (!s) return 0;
  const h = s.match(/(\d+)\s*(?:h|hr|hour)/i);
  const m = s.match(/(\d+)\s*(?:m|min)/i);
  if (h || m) {
    return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
  }
  const bare = s.match(/\d+/); // a lone number → minutes
  return bare ? parseInt(bare[0], 10) : 0;
}

function parseServings(s?: string): number {
  const n = s?.match(/\d+/);
  return n ? Math.max(1, parseInt(n[0], 10)) : 4;
}

function parseCreated(s?: string): number {
  if (!s) return Date.now();
  const t = Date.parse(s.replace(' ', 'T'));
  return Number.isNaN(t) ? Date.now() : t;
}

function formatCookTime(mins: number): string {
  if (mins <= 0) return '—';
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m} mins` : `${h}h`;
}

function lines(block?: string): string[] {
  return (block ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function slugId(title: string, uid: string | undefined, idx: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  // Prefer Paprika's stable per-recipe uid so re-importing the same export
  // dedupes by id instead of duplicating.
  const suffix = uid
    ? uid.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)
    : `${Date.now().toString(36)}-${idx}`;
  return `${base || 'recipe'}-paprika-${suffix}`;
}

// GZIP-decompress a `.paprikarecipe` entry to its JSON text. If the bytes aren't
// gzip (magic 0x1f 0x8b) — e.g. an older/plain export — decode them as-is.
async function gunzipToString(bytes: Uint8Array): Promise<string> {
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return new TextDecoder().decode(bytes);
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

async function paprikaToRecipe(
  json: PaprikaRecipe,
  idx: number,
): Promise<Recipe> {
  const title = (json.name ?? 'Untitled Recipe').trim() || 'Untitled Recipe';
  const prep = parseMinutes(json.prep_time);
  const cook = parseMinutes(json.cook_time);
  const total = parseMinutes(json.total_time) || prep + cook;

  // Each non-empty line is one ingredient. Keep the whole line as the name —
  // Paprika ingredients are freeform ("1 cup flour"), so splitting risks
  // mis-parsing; the full line displays and adds to the grocery list cleanly.
  const ingredients: Ingredient[] = lines(json.ingredients).map((name) => ({
    name,
    quantity: '',
    image: '',
  }));

  // Each non-empty line is one step. Strip any leading number ("1.", "Step 2:")
  // so it doesn't double up with our automatic step numbering.
  const instructions: Instruction[] = lines(json.directions).map(
    (line): Instruction => ({
      step: '',
      title: '',
      body: line.replace(/^\s*(?:step\s*)?\d+\s*[.):]\s*/i, '').trim(),
      videoThumb: '',
    }),
  );

  let image = '';
  if (json.photo_data) image = await downscaleImage(json.photo_data);
  if (!image && json.image_url) image = json.image_url;

  const nutrition = parseNutrition(json.nutritional_info);
  const rating = Math.max(0, Math.min(5, Math.round(json.rating ?? 0)));

  return {
    id: slugId(title, json.uid, idx),
    title,
    category: categoryFrom(json.categories),
    image,
    rating,
    ratingCount: rating > 0 ? 1 : 0,
    cookTime: formatCookTime(cook || total),
    cookTimeMinutes: cook,
    prepTimeMinutes: prep,
    totalTimeMinutes: total,
    servings: parseServings(json.servings),
    calories: nutrition.calories,
    proteinG: nutrition.proteinG,
    carbsG: nutrition.carbsG,
    fatG: nutrition.fatG,
    fiberG: nutrition.fiberG,
    sugarG: nutrition.sugarG,
    sodiumMg: nutrition.sodiumMg,
    nutritionSource:
      nutrition.calories > 0 || nutrition.hasMacros ? 'imported' : undefined,
    difficulty: (json.difficulty ?? '').trim() || 'Medium',
    cost: 0,
    isFavorite: false,
    description: (json.description ?? '').trim(),
    recipeNotes: (json.notes ?? '').trim(),
    myNotes: '',
    ingredients,
    instructions,
    chef: {
      name: (json.source ?? '').trim() || 'Imported',
      avatar: FALLBACK_AVATAR,
      recipeCount: 1,
      rating: 5,
    },
    source: json.source_url ? 'Internet' : 'Cookbook',
    cuisine: '',
    cookingClassType: 'Cozy Comfort Food',
    ease: 0,
    taste: 0,
    cleanup: 0,
    makeAgain: null,
    remade: 0,
    tags: Array.isArray(json.categories)
      ? json.categories.filter((t): t is string => typeof t === 'string')
      : [],
    createdAt: parseCreated(json.created),
    sourceUrl: json.source_url || undefined,
  };
}

// Read Paprika JSON out of a File (a `.paprikarecipes` archive or a single
// gzipped `.paprikarecipe`).
export async function readPaprikaFile(file: File): Promise<PaprikaRecipe[]> {
  const name = file.name.toLowerCase();
  const out: PaprikaRecipe[] = [];
  if (name.endsWith('.paprikarecipes') || name.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files).filter(
      (f) => !f.dir && f.name.toLowerCase().endsWith('.paprikarecipe'),
    );
    for (const entry of entries) {
      try {
        const bytes = await entry.async('uint8array');
        out.push(JSON.parse(await gunzipToString(bytes)));
      } catch {
        // skip an unreadable entry
      }
    }
    return out;
  }
  // Single .paprikarecipe (gzipped JSON).
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    out.push(JSON.parse(await gunzipToString(bytes)));
  } catch {
    // not a readable Paprika file
  }
  return out;
}

/** Parse one or more selected Paprika files into AfterTaste recipes. */
export async function importPaprikaFiles(files: File[]): Promise<Recipe[]> {
  const jsons: PaprikaRecipe[] = [];
  for (const file of files) {
    jsons.push(...(await readPaprikaFile(file)));
  }
  const recipes: Recipe[] = [];
  for (let i = 0; i < jsons.length; i++) {
    recipes.push(await paprikaToRecipe(jsons[i], i));
  }
  return recipes;
}
