import JSZip from 'jszip';
import type { Recipe, Ingredient, Instruction } from '@/data/sample/recipes';

// ---------------------------------------------------------------------------
// Crouton `.crumb` recipe files (JSON). See memory: crouton-import-format.
// ---------------------------------------------------------------------------

interface CroutonQuantity {
  amount?: number | null;
  quantityType?: string | null;
}
interface CroutonIngredient {
  quantity?: CroutonQuantity;
  ingredient?: { name?: string };
  order?: number;
}
interface CroutonStep {
  step?: string;
  isSection?: boolean;
  order?: number;
}
export interface CroutonRecipe {
  name?: string;
  serves?: number;
  duration?: number; // prep minutes
  cookingDuration?: number; // cook minutes
  ingredients?: CroutonIngredient[];
  steps?: CroutonStep[];
  images?: string[]; // base64 JPEG, no data: prefix
  sourceImage?: string;
  sourceName?: string;
  webLink?: string;
  tags?: string[];
  neutritionalInfo?: string;
  notes?: string; // free-form recipe notes from the source
  uuid?: string; // stable per-recipe id, used to dedupe re-imports
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&h=400&fit=crop';
const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face';

const UNIT_MAP: Record<string, string> = {
  TABLESPOON: 'tbsp',
  TEASPOON: 'tsp',
  CUP: 'cup',
  POUND: 'lb',
  OUNCE: 'oz',
  GRAM: 'g',
  GRAMS: 'g',
  KILOGRAM: 'kg',
  MILLILITER: 'ml',
  MILLS: 'ml',
  LITER: 'L',
  BOTTLE: 'bottle',
  ITEM: '',
  NONE: '',
};

const UNICODE_FRACTIONS: [number, string][] = [
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
];

function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const whole = Math.floor(n);
  const frac = n - whole;
  let best = '';
  let bestDiff = 0.06;
  for (const [val, sym] of UNICODE_FRACTIONS) {
    const d = Math.abs(frac - val);
    if (d < bestDiff) {
      best = sym;
      bestDiff = d;
    }
  }
  if (best) return whole ? `${whole}${best}` : best;
  return String(Math.round(n * 100) / 100);
}

function pluralizeUnit(unit: string, amount: number): string {
  if (amount === 1) return unit;
  if (unit === 'lb') return 'lbs';
  if (unit === 'cup' || unit === 'bottle') return `${unit}s`;
  return unit;
}

function formatQuantity(amount?: number | null, type?: string | null): string {
  if (type === 'SECTION') return '';
  const amountStr = amount != null ? formatAmount(amount) : '';
  const rawUnit = type ? (UNIT_MAP[type] ?? type.toLowerCase()) : '';
  if (!rawUnit) return amountStr;
  const unit = pluralizeUnit(rawUnit, amount ?? 0);
  return `${amountStr} ${unit}`.trim();
}

function parseCalories(info?: string): number {
  if (!info) return 0;
  const m = info.match(/Calories:\s*([\d.]+)/i);
  return m ? Math.round(Number(m[1])) : 0;
}

function formatCookTime(mins: number): string {
  if (mins <= 0) return '—';
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m} mins` : `${h}h`;
}

function slugId(title: string, uuid: string | undefined, idx: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  // Prefer Crouton's stable per-recipe uuid so re-importing the same export
  // dedupes by id instead of duplicating. Fall back to a unique (but not
  // stable) suffix only when a recipe has no uuid.
  const suffix = uuid
    ? uuid.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)
    : `${Date.now().toString(36)}-${idx}`;
  return `${base || 'recipe'}-crouton-${suffix}`;
}

// Shrink a base64 JPEG so a whole library fits in localStorage.
function downscaleImage(base64Jpeg: string, maxW = 640): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve('');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / (img.width || maxW));
      const w = Math.max(1, Math.round((img.width || maxW) * scale));
      const h = Math.max(1, Math.round((img.height || maxW) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = `data:image/jpeg;base64,${base64Jpeg}`;
  });
}

async function croutonToRecipe(
  json: CroutonRecipe,
  idx: number,
): Promise<Recipe> {
  const title = (json.name ?? 'Untitled Recipe').trim() || 'Untitled Recipe';
  const prep = Math.max(0, Math.round(json.duration ?? 0));
  const cook = Math.max(0, Math.round(json.cookingDuration ?? 0));
  const total = prep + cook;

  const ingredients: Ingredient[] = (json.ingredients ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((ing) => ({
      name: (ing.ingredient?.name ?? '').trim(),
      quantity: formatQuantity(ing.quantity?.amount, ing.quantity?.quantityType),
      image: '',
    }))
    .filter((i) => i.name);

  // Crouton marks section headers with `isSection`; keep them as our section
  // dividers (which restart step numbering) instead of dropping them.
  const instructions: Instruction[] = (json.steps ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s): Instruction => {
      const text = (s.step ?? '').trim();
      return s.isSection
        ? { step: '', title: '', body: '', videoThumb: '', section: text }
        : { step: '', title: '', body: text, videoThumb: '' };
    })
    .filter((s) => (s.section !== undefined ? !!s.section : !!s.body));

  let image = '';
  if (json.images?.[0]) image = await downscaleImage(json.images[0]);
  if (!image && json.sourceImage) image = await downscaleImage(json.sourceImage);
  if (!image) image = FALLBACK_IMAGE;

  return {
    id: slugId(title, json.uuid, idx),
    title,
    category: 'Dinner',
    image,
    rating: 0,
    ratingCount: 0,
    cookTime: formatCookTime(cook || total),
    cookTimeMinutes: cook,
    prepTimeMinutes: prep,
    totalTimeMinutes: total,
    servings: json.serves && json.serves > 0 ? Math.round(json.serves) : 4,
    calories: parseCalories(json.neutritionalInfo),
    difficulty: 'Medium',
    cost: 0,
    isFavorite: false,
    description: '',
    recipeNotes: (json.notes ?? '').trim(),
    myNotes: '',
    ingredients,
    instructions,
    chef: {
      name: json.sourceName || 'Imported',
      avatar: FALLBACK_AVATAR,
      recipeCount: 1,
      rating: 5,
    },
    source: json.webLink ? 'Internet' : 'Cookbook',
    cuisine: '',
    cookingClassType: 'Cozy Comfort Food',
    ease: 0,
    taste: 0,
    cleanup: 0,
    makeAgain: null,
    remade: 0,
    tags: Array.isArray(json.tags)
      ? json.tags.filter((t): t is string => typeof t === 'string')
      : [],
    createdAt: Date.now(),
    sourceUrl: json.webLink || undefined,
  };
}

// Read .crumb JSON out of a File (either a .zip archive or a single .crumb).
export async function readCroutonFile(file: File): Promise<CroutonRecipe[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files).filter(
      (f) => !f.dir && f.name.toLowerCase().endsWith('.crumb'),
    );
    const out: CroutonRecipe[] = [];
    for (const entry of entries) {
      try {
        out.push(JSON.parse(await entry.async('string')));
      } catch {
        // skip an unreadable entry
      }
    }
    return out;
  }
  // Single .crumb / .json file.
  try {
    return [JSON.parse(await file.text())];
  } catch {
    return [];
  }
}

/** Parse one or more selected files (zip and/or .crumb) into AfterTaste recipes. */
export async function importCroutonFiles(files: File[]): Promise<Recipe[]> {
  const jsons: CroutonRecipe[] = [];
  for (const file of files) {
    jsons.push(...(await readCroutonFile(file)));
  }
  const recipes: Recipe[] = [];
  for (let i = 0; i < jsons.length; i++) {
    recipes.push(await croutonToRecipe(jsons[i], i));
  }
  return recipes;
}
