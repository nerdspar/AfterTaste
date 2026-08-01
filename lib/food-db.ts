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
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// ---- Open Food Facts ---------------------------------------------------------

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string>;
};

function offToItem(p: OffProduct, fallbackCode?: string): FoodItem | null {
  const name = (p.product_name || '').trim();
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

  return {
    id: `off:${code || name}`,
    name,
    brand: brand || undefined,
    source: 'off',
    per100: {
      calories: Math.round(cals),
      proteinG: rnd(num(n['proteins_100g'])),
      carbsG: rnd(num(n['carbohydrates_100g'])),
      fatG: rnd(num(n['fat_100g'])),
      fiberG: rnd(num(n['fiber_100g'])),
      sugarG: rnd(num(n['sugars_100g'])),
      sodiumMg,
    },
    servingSizeG: servingG && servingG > 0 ? Math.round(servingG) : undefined,
  };
}

async function searchOff(query: string, limit: number): Promise<FoodItem[]> {
  const url =
    'https://world.openfoodfacts.org/cgi/search.pl?' +
    new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: String(limit),
      fields: 'code,product_name,brands,serving_quantity,nutriments',
    });
  const data = (await fetchJson(url, {
    headers: { 'User-Agent': OFF_UA },
  })) as { products?: OffProduct[] };
  const items = (data.products || [])
    .map((p) => offToItem(p))
    .filter((x): x is FoodItem => x != null);
  return items;
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

function usdaToItem(f: UsdaFood): FoodItem | null {
  const name = (f.description || '').trim();
  if (!name) return null;
  const byName: Record<string, number> = {};
  let cals: number | null = null;
  for (const fn of f.foodNutrients || []) {
    if (!fn.nutrientName || fn.value == null) continue;
    if (
      fn.nutrientName === 'Energy' &&
      (fn.unitName === 'KCAL' || fn.unitName === 'kcal')
    ) {
      cals = fn.value;
    }
    byName[fn.nutrientName] = fn.value;
  }
  if (cals == null) return null;
  return {
    id: `usda:${f.fdcId}`,
    name: titleCase(name),
    brand: f.brandOwner ? titleCase(f.brandOwner) : undefined,
    source: 'usda',
    per100: {
      calories: Math.round(cals),
      proteinG: rnd(num(byName['Protein'])),
      carbsG: rnd(num(byName['Carbohydrate, by difference'])),
      fatG: rnd(num(byName['Total lipid (fat)'])),
      fiberG: rnd(num(byName['Fiber, total dietary'])),
      sugarG: rnd(
        num(byName['Sugars, total including NLEA'] ?? byName['Total Sugars']),
      ),
      sodiumMg: rnd(num(byName['Sodium, Na'])),
    },
  };
}

async function searchUsda(query: string, limit: number): Promise<FoodItem[]> {
  const key = process.env.FDC_API_KEY || 'DEMO_KEY';
  const url =
    'https://api.nal.usda.gov/fdc/v1/foods/search?' +
    new URLSearchParams({
      query,
      pageSize: String(limit),
      dataType: 'Foundation,SR Legacy,Branded',
      api_key: key,
    });
  const data = (await fetchJson(url)) as { foods?: UsdaFood[] };
  return (data.foods || [])
    .map(usdaToItem)
    .filter((x): x is FoodItem => x != null);
}

// ---- public API --------------------------------------------------------------

/** Search both sources in parallel and interleave the results. */
export async function searchFoods(query: string): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];
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
  return out.slice(0, 24);
}

/** Look up a single product by barcode (Open Food Facts). */
export async function lookupBarcode(code: string): Promise<FoodItem | null> {
  const clean = code.replace(/\D/g, '');
  if (clean.length < 6) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=code,product_name,brands,serving_quantity,nutriments`;
  const data = (await fetchJson(url, {
    headers: { 'User-Agent': OFF_UA },
  }).catch(() => null)) as { status?: number; product?: OffProduct } | null;
  if (!data || data.status !== 1 || !data.product) return null;
  return offToItem(data.product, clean);
}
