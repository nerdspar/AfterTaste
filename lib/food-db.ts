// Food database lookups against Open Food Facts (branded/packaged foods,
// barcode-friendly) and USDA FoodData Central (generic whole foods). All
// nutrition is normalized to per-100 g so the client can scale to any amount.
//
// This module fetches external APIs and reads process.env, so it must only be
// imported by server code. Clients should `import type { FoodItem }` only.

export interface FoodMacros {
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
}

export interface FoodItem {
  id: string; // e.g. "off:737628064502" or "usda:1105314"
  name: string;
  brand?: string;
  source: 'off' | 'usda';
  per100: FoodMacros; // nutrition per 100 g
  servingSizeG?: number; // grams per labelled serving, when known
}

const OFF_UA = 'AfterTaste/1.0 (self-hosted recipe app)';

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function rnd(v: number | null): number | null {
  return v == null ? null : Math.round(v);
}

// Both databases carry records with impossible numbers — a salt entry listing
// 1330 g of carbohydrate per 100 g, a pepper entry listing 167 g. Usually the
// value was recorded in the wrong unit or against the wrong serving size.
// Left alone they dwarf every real ingredient in a recipe estimate, so each
// field is checked against what 100 g of food can physically contain.

/** Nothing edible carries more than ~900 kcal per 100 g (pure fat is 884). */
const MAX_KCAL_PER_100G = 900;
/** Pure table salt is ~38,758 mg sodium per 100 g. */
const MAX_SODIUM_MG_PER_100G = 40000;

function gramsField(v: number | null): number | null {
  if (v == null) return null;
  // A gram-per-100 g figure outside 0..100 is not a real measurement.
  return v < 0 || v > 100 ? null : v;
}

/**
 * Drop impossible values from a record, and reject the record outright when
 * its calories are impossible or its macros do not fit in 100 g of food (a
 * sign the whole row is scaled wrong). Returns null when unusable.
 */
function sanitizeMacros(m: FoodMacros): FoodMacros | null {
  if (!Number.isFinite(m.calories) || m.calories < 0) return null;
  if (m.calories > MAX_KCAL_PER_100G) return null;

  const clean: FoodMacros = {
    calories: m.calories,
    proteinG: gramsField(m.proteinG),
    carbsG: gramsField(m.carbsG),
    fatG: gramsField(m.fatG),
    fiberG: gramsField(m.fiberG),
    sugarG: gramsField(m.sugarG),
    sodiumMg:
      m.sodiumMg == null || m.sodiumMg < 0 || m.sodiumMg > MAX_SODIUM_MG_PER_100G
        ? null
        : m.sodiumMg,
  };

  // The big three cannot add up to more than 100 g of a 100 g food. A little
  // slack absorbs rounding and the usual water/ash bookkeeping.
  const bulk =
    (clean.proteinG ?? 0) + (clean.carbsG ?? 0) + (clean.fatG ?? 0);
  if (bulk > 105) return null;

  return clean;
}

// USDA descriptions are ALL CAPS; make them readable.
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

async function fetchJson(
  url: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // The APIs sometimes return an HTML error/interstitial page with a 200;
    // parsing that as JSON throws deep in .json(). Fail cleanly instead.
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) throw new Error(`non-JSON response (${ct})`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// ---- Open Food Facts ---------------------------------------------------------

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  lang?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string>;
};

function offToItem(p: OffProduct, fallbackCode?: string): FoodItem | null {
  const name = (p.product_name_en || p.product_name || '').trim();
  const n = p.nutriments || {};
  const cals = num(n['energy-kcal_100g']);
  if (!name || cals == null) return null; // need a name and calories

  const sodiumG = num(n['sodium_100g']);
  const saltG = num(n['salt_100g']);
  const sodiumMg =
    sodiumG != null
      ? Math.round(sodiumG * 1000)
      : saltG != null
        ? Math.round(saltG * 400) // salt -> sodium
        : null;

  const servingG = num(p.serving_quantity);
  const code = p.code || fallbackCode;
  const brand = (p.brands || '').split(',')[0].trim();

  const per100 = sanitizeMacros({
    calories: Math.round(cals),
    proteinG: rnd(num(n['proteins_100g'])),
    carbsG: rnd(num(n['carbohydrates_100g'])),
    fatG: rnd(num(n['fat_100g'])),
    fiberG: rnd(num(n['fiber_100g'])),
    sugarG: rnd(num(n['sugars_100g'])),
    sodiumMg,
  });
  if (!per100) return null;

  return {
    id: `off:${code || name}`,
    name,
    brand: brand || undefined,
    source: 'off',
    per100,
    servingSizeG: servingG && servingG > 0 ? Math.round(servingG) : undefined,
  };
}

async function searchOff(query: string, limit: number): Promise<FoodItem[]> {
  // Open Food Facts' "Search-a-licious" API. Unlike the legacy cgi/search.pl
  // (which is slow and often returns an HTML error page instead of JSON, and is
  // French-dominated), this returns reliable JSON and honours `lang=en`, so
  // results are relevant AND in English.
  const url =
    'https://search.openfoodfacts.org/search?' +
    new URLSearchParams({
      q: query,
      page_size: String(limit),
      lang: 'en',
      fields:
        'code,product_name,product_name_en,lang,brands,serving_quantity,nutriments',
    });
  const data = (await fetchJson(url, {
    headers: { 'User-Agent': OFF_UA },
  })) as { hits?: OffProduct[] };
  return (data.hits || [])
    .map((p) => offToItem(p))
    .filter((x): x is FoodItem => x != null);
}

// ---- USDA FoodData Central ---------------------------------------------------

type UsdaNutrient = {
  nutrientName?: string;
  unitName?: string;
  value?: number;
};
type UsdaFood = {
  fdcId: number;
  description?: string;
  brandOwner?: string;
  foodNutrients?: UsdaNutrient[];
};

// Energy is not recorded under one name. SR Legacy rows carry a plain "Energy"
// in both kcal and kJ, but Foundation rows — the modern whole-food entries, and
// exactly the ones a recipe means — carry no plain "Energy" at all: they report
// "Energy (Atwater General Factors)". Looking only for "Energy" therefore threw
// away raw chicken breast and baby spinach before they could be scored, leaving
// the branded supermarket packet as the only candidate.
const ENERGY_NAMES = [
  'Energy',
  'Energy (Atwater General Factors)',
  'Energy (Atwater Specific Factors)',
];

/** Calories per 100 g, preferring the plain figure, then Atwater, then kJ. */
function energyKcal(nutrients: UsdaNutrient[]): number | null {
  const kcal = new Map<string, number>();
  let kj: number | null = null;
  for (const fn of nutrients) {
    const name = fn.nutrientName;
    if (!name || fn.value == null || !ENERGY_NAMES.includes(name)) continue;
    const unit = (fn.unitName || '').toUpperCase();
    if (unit === 'KCAL') {
      if (!kcal.has(name)) kcal.set(name, fn.value);
    } else if (unit === 'KJ' && kj == null) {
      kj = fn.value;
    }
  }
  for (const name of ENERGY_NAMES) {
    const v = kcal.get(name);
    if (v != null) return v;
  }
  return kj == null ? null : kj / 4.184;
}

function usdaToItem(f: UsdaFood): FoodItem | null {
  const name = (f.description || '').trim();
  if (!name) return null;
  const nutrients = f.foodNutrients || [];
  const byName: Record<string, number> = {};
  for (const fn of nutrients) {
    if (!fn.nutrientName || fn.value == null) continue;
    byName[fn.nutrientName] = fn.value;
  }
  const cals = energyKcal(nutrients);
  if (cals == null) return null;
  const per100 = sanitizeMacros({
    calories: Math.round(cals),
    proteinG: rnd(num(byName['Protein'])),
    carbsG: rnd(num(byName['Carbohydrate, by difference'])),
    fatG: rnd(num(byName['Total lipid (fat)'])),
    fiberG: rnd(num(byName['Fiber, total dietary'])),
    sugarG: rnd(
      num(byName['Sugars, total including NLEA'] ?? byName['Total Sugars']),
    ),
    sodiumMg: rnd(num(byName['Sodium, Na'])),
  });
  if (!per100) return null;
  return {
    id: `usda:${f.fdcId}`,
    name: titleCase(name),
    brand: f.brandOwner ? titleCase(f.brandOwner) : undefined,
    source: 'usda',
    per100,
  };
}

async function searchUsdaSet(
  query: string,
  dataType: string,
  limit: number,
): Promise<FoodItem[]> {
  const key = process.env.FDC_API_KEY || 'DEMO_KEY';
  const url =
    'https://api.nal.usda.gov/fdc/v1/foods/search?' +
    new URLSearchParams({
      query,
      pageSize: String(limit),
      dataType,
      api_key: key,
    });
  const data = (await fetchJson(url)) as { foods?: UsdaFood[] };
  return (data.foods || [])
    .map(usdaToItem)
    .filter((x): x is FoodItem => x != null);
}

/**
 * USDA ranks branded products above generic ones, and there are far more of
 * them, so a single mixed search for "spinach" comes back as fifteen
 * supermarket bags with "Spinach, raw" nowhere in it — the whole-food record a
 * recipe means never reached the scorer at all. Asking the generic datasets and
 * the branded one separately guarantees both are represented.
 */
async function searchUsda(query: string, limit: number): Promise<FoodItem[]> {
  const [generic, branded] = await Promise.all([
    searchUsdaSet(query, 'Foundation,SR Legacy', limit).catch(
      () => [] as FoodItem[],
    ),
    searchUsdaSet(query, 'Branded', limit).catch(() => [] as FoodItem[]),
  ]);
  // Generic first: searchFoods de-dupes by name, so on a tie the whole-food
  // record should be the one that survives.
  return [...generic, ...branded];
}

// ---- public API --------------------------------------------------------------

// Cache recent searches (per server process) so typing/backspacing and repeat
// lookups don't re-hit the APIs — helps latency and the USDA DEMO_KEY limit.
const searchCache = new Map<string, FoodItem[]>();

/** Search both sources in parallel and interleave the results. */
export async function searchFoods(query: string): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const cacheKey = q.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const [off, usda] = await Promise.all([
    searchOff(q, 15).catch(() => [] as FoodItem[]),
    searchUsda(q, 15).catch(() => [] as FoodItem[]),
  ]);

  // Interleave OFF (branded) and USDA (generic), de-duping by lowercased name.
  const seen = new Set<string>();
  const out: FoodItem[] = [];
  const max = Math.max(off.length, usda.length);
  for (let i = 0; i < max; i++) {
    for (const item of [usda[i], off[i]]) {
      if (!item) continue;
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  const result = out.slice(0, 24);
  // Only cache non-empty results, so a transient API blip isn't sticky.
  if (result.length > 0) {
    if (searchCache.size > 300) searchCache.clear();
    searchCache.set(cacheKey, result);
  }
  return result;
}

/** Look up a single product by barcode (Open Food Facts). */
export async function lookupBarcode(code: string): Promise<FoodItem | null> {
  const clean = code.replace(/\D/g, '');
  if (clean.length < 6) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json?lc=en&fields=code,product_name,product_name_en,brands,serving_quantity,nutriments`;
  const data = (await fetchJson(url, {
    headers: { 'User-Agent': OFF_UA },
  }).catch(() => null)) as { status?: number; product?: OffProduct } | null;
  if (!data || data.status !== 1 || !data.product) return null;
  return offToItem(data.product, clean);
}
