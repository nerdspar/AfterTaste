import type { Ingredient, Instruction } from '@/data/sample/recipes';

export interface ParsedRecipe {
  title?: string;
  description?: string;
  image?: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  calories?: number; // per serving (kcal)
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  nutritionSource?: 'manual' | 'imported' | 'estimated';
  cuisine?: string;
  category?: string;
  rating?: number;
  ratingCount?: number;
  ingredients?: Ingredient[];
  instructions?: Instruction[];
  recipeNotes?: string;
  myNotes?: string;
  sourceUrl?: string;
}

// A step "title" that just repeats the automatic number ("Step 1", "1.", "2)")
// is noise — the UI already numbers steps — so treat those (and blanks) as no
// title. A real sub-heading like "Make the sauce" is kept.
const GENERIC_STEP_TITLE = /^\s*(?:step\s*)?\d+\s*[.:)]?\s*$/i;
export function isGenericStepTitle(title: string | undefined): boolean {
  return !title || !title.trim() || GENERIC_STEP_TITLE.test(title.trim());
}

// Recipe sites often embed HTML entities inside their JSON-LD/meta text
// (e.g. "it&#39;s fast" or "salt &amp; pepper"). Decode them so imported
// recipes read cleanly. Runs server-side, so it can't rely on the DOM.
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  deg: '°',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
};

function decodeEntities(input: string): string {
  if (!input || input.indexOf('&') === -1) return input;
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, body) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (Number.isNaN(code) || code <= 0 || code > 0x10ffff) return m;
      try {
        return String.fromCodePoint(code);
      } catch {
        return m;
      }
    }
    const named = NAMED_ENTITIES[body];
    return named ?? m;
  });
}

/** Decode HTML entities across every user-facing string in a parsed recipe. */
function decodeParsed(r: ParsedRecipe): ParsedRecipe {
  const d = (s?: string) => (s == null ? s : decodeEntities(s));
  return {
    ...r,
    title: d(r.title),
    description: d(r.description),
    cuisine: d(r.cuisine),
    category: d(r.category),
    recipeNotes: d(r.recipeNotes),
    myNotes: d(r.myNotes),
    ingredients: r.ingredients?.map((i) => ({
      ...i,
      name: decodeEntities(i.name),
      quantity: decodeEntities(i.quantity),
      section: i.section == null ? i.section : decodeEntities(i.section),
    })),
    instructions: r.instructions?.map((s) => ({
      ...s,
      title: decodeEntities(s.title),
      body: decodeEntities(s.body),
      section: s.section == null ? s.section : decodeEntities(s.section),
    })),
  };
}

// Pull the first usable image URL out of schema.org's `image`, which may be a
// string, an array of strings or ImageObjects, or a single ImageObject.
function extractImageUrl(image: unknown): string {
  if (!image) return '';
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) {
    for (const entry of image) {
      const url = extractImageUrl(entry);
      if (url) return url;
    }
    return '';
  }
  if (typeof image === 'object') {
    const url = (image as { url?: unknown }).url;
    if (typeof url === 'string') return url;
  }
  return '';
}

function stripWaybackPrefix(url: string): string {
  if (typeof url !== 'string' || !url) return '';
  // Archived pages rewrite asset URLs through web.archive.org; recover the
  // original so imported images don't depend on the Wayback Machine.
  return url.replace(
    /^https?:\/\/web\.archive\.org\/web\/\d+(?:\w{2}_)?\/(https?:\/\/)/i,
    '$1',
  );
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes;
}

// Pull the leading number out of a schema.org nutrition value like "12 g",
// "1.5 grams", or "250 mg". Returns whole units (grams / mg).
function parseNutrientNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const m = String(value).match(/(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  const n = Math.round(parseFloat(m[1]));
  return isNaN(n) ? undefined : n;
}

// Parse free-text durations like "10 minutes", "1 hour 30 min", "1 hr", "45m".
function parseMinutesFromText(value: string): number | undefined {
  let total = 0;
  let matched = false;
  const hr = value.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr|h)\b/i);
  if (hr) {
    total += Math.round(parseFloat(hr[1]) * 60);
    matched = true;
  }
  const min = value.match(/(\d+)\s*(?:minutes?|mins?|min|m)\b/i);
  if (min) {
    total += parseInt(min[1], 10);
    matched = true;
  }
  if (!matched) {
    const bare = value.trim().match(/^(\d+)$/);
    if (bare) {
      total = parseInt(bare[1], 10);
      matched = true;
    }
  }
  return matched ? total : undefined;
}

function guessCategory(title: string, keywords: string[] = []): string {
  const text = [title, ...keywords].join(' ').toLowerCase();
  if (/breakfast|pancake|waffle|omelette|smoothie|granola|cereal/.test(text))
    return 'Breakfast';
  if (/dessert|cake|cookie|pie|brownie|chocolate|sweet|ice cream/.test(text))
    return 'Dessert';
  if (/lunch|salad|sandwich|wrap|soup|bowl/.test(text)) return 'Lunch';
  return 'Dinner';
}

// Map a site's recipeCategory (free-form: "Main Course", "30-minute meals",
// "Drinks"…) onto one of our five categories; if it doesn't clearly match,
// fall back to guessing from the title/keywords.
function normalizeCategory(
  raw: string,
  title: string,
  keywords: string[] = [],
): string {
  const r = raw.toLowerCase();
  if (/breakfast|brunch/.test(r)) return 'Breakfast';
  if (/dessert|sweet|cake|cookie|baking|pastry/.test(r)) return 'Dessert';
  if (/lunch/.test(r)) return 'Lunch';
  if (/snack|appetiz|starter|side|dip/.test(r)) return 'Snack';
  if (/dinner|main|entr[ée]e|supper/.test(r)) return 'Dinner';
  return guessCategory(title, keywords);
}

// Recipe pages often suffix the site name onto the title: "Recipe Name | Site",
// "Recipe Name – Site". Strip a trailing " <sep> Site" for pipe/en/em dashes
// (hyphens are left alone since they appear in real titles).
function cleanTitle(title: string): string {
  const cleaned = title.replace(/\s*[|–—]\s*[^|–—]+$/, '').trim();
  return cleaned || title.trim();
}

export function parseRecipeFromJsonLd(html: string): ParsedRecipe | null {
  const scriptRegex =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1]);

      if (Array.isArray(data)) {
        data = data.find(
          (d) => d['@type'] === 'Recipe' || d['@type']?.includes?.('Recipe'),
        );
      }

      if (data?.['@graph']) {
        data = data['@graph'].find(
          (d: Record<string, unknown>) =>
            d['@type'] === 'Recipe' || (d['@type'] as string[])?.includes?.('Recipe'),
        );
      }

      if (
        !data ||
        (data['@type'] !== 'Recipe' && !data['@type']?.includes?.('Recipe'))
      )
        continue;

      const ingredients: Ingredient[] = (
        data.recipeIngredient ?? []
      ).map((text: string) => {
        const parts = text.match(/^([\d/.\s½¼¾⅓⅔⅛]+\s*\w*)\s+(.+)$/);
        return {
          name: parts ? parts[2].trim() : text.trim(),
          quantity: parts ? parts[1].trim() : '',
          image: '',
        };
      });

      // recipeInstructions may be an array, a single object, or a single
      // string; normalize to an array so we never iterate a string's characters.
      const rawInstructions = Array.isArray(data.recipeInstructions)
        ? data.recipeInstructions
        : data.recipeInstructions
          ? [data.recipeInstructions]
          : [];
      const instructions: Instruction[] = [];

      function pushStep(text: string, name?: string) {
        const lines = text
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length <= 1) {
          const body = lines[0] || '';
          // Keep a real sub-heading; drop names that just echo the number.
          const title =
            name && name !== body && !isGenericStepTitle(name) ? name : '';
          instructions.push({
            step: String(instructions.length + 1).padStart(2, '0'),
            title,
            body,
            videoThumb: '',
          });
        } else {
          for (const line of lines) {
            instructions.push({
              step: String(instructions.length + 1).padStart(2, '0'),
              title: '',
              body: line,
              videoThumb: '',
            });
          }
        }
      }

      function typeIncludes(
        item: Record<string, unknown>,
        type: string,
      ): boolean {
        const t = item['@type'];
        return t === type || (Array.isArray(t) && t.includes(type));
      }

      function addStep(item: unknown) {
        if (typeof item === 'string') {
          pushStep(item);
          return;
        }
        if (!item || typeof item !== 'object') return;
        const obj = item as Record<string, unknown>;

        // A section groups sub-steps; recurse into them.
        if (typeIncludes(obj, 'HowToSection')) {
          const subs = obj.itemListElement;
          if (Array.isArray(subs) && subs.length > 0) {
            for (const sub of subs) addStep(sub);
          } else if (typeof obj.text === 'string') {
            pushStep(obj.text, obj.name as string | undefined);
          }
          return;
        }

        // Otherwise treat any object carrying step text as a step. Some sites
        // omit @type entirely or provide it as an array (e.g. ["HowToStep"]).
        if (typeof obj.text === 'string' && obj.text.trim()) {
          pushStep(obj.text, obj.name as string | undefined);
        }
      }

      for (const item of rawInstructions) {
        addStep(item);
      }

      // `image` can be a string, an array (of strings OR ImageObjects), or a
      // single ImageObject. Pull out the first usable URL string. (Passing a
      // non-string on to stripWaybackPrefix used to throw and abort the whole
      // parse — e.g. Hearst sites that use an array of ImageObjects.)
      const imageUrl = stripWaybackPrefix(extractImageUrl(data.image));

      const nutrition = data.nutrition ?? {};
      let calories: number | undefined;
      if (nutrition.calories) {
        const cal = parseInt(String(nutrition.calories), 10);
        if (!isNaN(cal)) calories = cal;
      }
      const proteinG = parseNutrientNumber(nutrition.proteinContent);
      const carbsG = parseNutrientNumber(nutrition.carbohydrateContent);
      const fatG = parseNutrientNumber(nutrition.fatContent);
      const fiberG = parseNutrientNumber(nutrition.fiberContent);
      const sugarG = parseNutrientNumber(nutrition.sugarContent);
      const sodiumMg = parseNutrientNumber(nutrition.sodiumContent);
      const hasNutrition =
        calories !== undefined ||
        proteinG !== undefined ||
        carbsG !== undefined ||
        fatG !== undefined ||
        fiberG !== undefined ||
        sugarG !== undefined ||
        sodiumMg !== undefined;

      let rating: number | undefined;
      let ratingCount: number | undefined;
      const agg = Array.isArray(data.aggregateRating)
        ? data.aggregateRating[0]
        : data.aggregateRating;
      if (agg) {
        const rv = parseFloat(String(agg.ratingValue));
        if (!isNaN(rv)) rating = Math.round(rv * 10) / 10;
        const rc = parseInt(String(agg.ratingCount ?? agg.reviewCount), 10);
        if (!isNaN(rc)) ratingCount = rc;
      }

      let servingsNum: number | undefined;
      if (data.recipeYield) {
        const y = Array.isArray(data.recipeYield)
          ? data.recipeYield[0]
          : data.recipeYield;
        const parsed = parseInt(String(y), 10);
        if (!isNaN(parsed)) servingsNum = parsed;
      }

      const keywords = typeof data.keywords === 'string'
        ? data.keywords.split(',').map((k: string) => k.trim())
        : Array.isArray(data.keywords) ? data.keywords : [];

      return {
        title: data.name || undefined,
        description: data.description || undefined,
        image: imageUrl || undefined,
        servings: servingsNum,
        prepTimeMinutes: data.prepTime
          ? parseISO8601Duration(data.prepTime)
          : undefined,
        cookTimeMinutes: data.cookTime
          ? parseISO8601Duration(data.cookTime)
          : undefined,
        calories,
        proteinG,
        carbsG,
        fatG,
        fiberG,
        sugarG,
        sodiumMg,
        nutritionSource: hasNutrition ? 'imported' : undefined,
        cuisine: data.recipeCuisine
          ? (Array.isArray(data.recipeCuisine)
              ? data.recipeCuisine[0]
              : data.recipeCuisine)
          : undefined,
        category: data.recipeCategory
          ? normalizeCategory(
              String(
                Array.isArray(data.recipeCategory)
                  ? data.recipeCategory[0]
                  : data.recipeCategory,
              ),
              data.name || '',
              keywords,
            )
          : guessCategory(data.name || '', keywords),
        rating,
        ratingCount,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        instructions: instructions.length > 0 ? instructions : undefined,
      };
    } catch {
      continue;
    }
  }
  return null;
}

function extractMetaContent(html: string, property: string): string {
  // Capture up to the SAME quote character that opened the value (backref \\2),
  // so an apostrophe inside a double-quoted value (e.g. "Ree Drummond's ...")
  // doesn't truncate the match.
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)\\s*=\\s*["']${property}["'][^>]*content\\s*=\\s*(["'])(.*?)\\1`,
    'i',
  );
  const match = html.match(regex);
  if (match) return match[2];
  const regex2 = new RegExp(
    `<meta[^>]*content\\s*=\\s*(["'])(.*?)\\1[^>]*(?:property|name)\\s*=\\s*["']${property}["']`,
    'i',
  );
  const match2 = html.match(regex2);
  return match2 ? match2[2] : '';
}

export function parseRecipeFromMeta(html: string): ParsedRecipe | null {
  const rawTitle =
    extractMetaContent(html, 'og:title') ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = extractMetaContent(html, 'og:description');
  const image = extractMetaContent(html, 'og:image');

  if (!rawTitle) return null;
  const title = cleanTitle(rawTitle);

  return {
    title,
    description: description || undefined,
    image: image || undefined,
    category: guessCategory(title),
  };
}

// --- Plain-text / PDF / docx recipe parsing --------------------------------
//
// PDFs and pasted text have no structure to lean on, so we classify each line:
// numbered lines are steps, quantity/bullet lines are ingredients, "Label:"
// lines are metadata (times/servings) or sub-section headers, and boilerplate
// (URLs, copyright, page footers) is dropped. Wrapped step lines are re-joined.

const TEXT_JUNK: RegExp[] = [
  /^https?:\/\//i,
  /©|\bcopyright\b/i,
  /all rights reserved/i,
  /^\d+\s+of\s+\d+\b/i, // "1 of 1  5/26/11 3:15 PM"
  /^page\s+\d+\b/i,
  /\brecipe courtesy\b/i,
  /television food network/i,
];
function isTextJunk(line: string): boolean {
  return TEXT_JUNK.some((re) => re.test(line));
}

const FOOD_UNIT =
  '(?:cups?|c|tbsps?|tablespoons?|tsps?|teaspoons?|pounds?|lbs?|ounces?|oz|grams?|g|kg|ml|milliliters?|l|liters?|litres?|cloves?|cans?|packages?|pkgs?|pinch(?:es)?|quarts?|qts?|pints?|pts?|sticks?|slices?|ribs?|bunch(?:es)?|dash(?:es)?|handfuls?|sprigs?|stalks?|heads?|boxes?|box|jars?|bottles?|bags?|containers?)';
const QTY_START = /^[\d¼½¾⅓⅔⅛⅜⅝⅞]/;
const NUMBERED = /^(\d{1,3})[.)]\s+(.*\S)/;
const BULLET = /^[-–—•*·▪]\s+/;
const FOOD_UNIT_WORD = new RegExp(`^${FOOD_UNIT}[.,]?$`, 'i');
const FOOD_UNIT_NEAR = new RegExp(`\\b${FOOD_UNIT}\\b`, 'i');

// A quantity line naming a food measure ("¼ cup butter") — an ingredient even
// when it appears amid the steps. Excludes "5 to 7 minutes" / "500 degrees F".
function looksLikeIngredient(line: string): boolean {
  if (!QTY_START.test(line)) return false;
  return FOOD_UNIT_NEAR.test(line.split(/\s+/).slice(0, 4).join(' '));
}

function splitIngredient(line: string): { quantity: string; name: string } {
  const m = line.match(
    /^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?)|[¼½¾⅓⅔⅛⅜⅝⅞])\s*(.*)$/,
  );
  if (!m) return { quantity: '', name: line };
  let quantity = m[1];
  let rest = m[2];
  const words = rest.split(/\s+/);
  if (words[0] && FOOD_UNIT_WORD.test(words[0])) {
    quantity = `${quantity} ${words[0].replace(/[.,]$/, '')}`.trim();
    rest = words.slice(1).join(' ');
  }
  return { quantity: quantity.trim(), name: rest.trim() || line };
}

function firstInt(s: string): number | undefined {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : undefined;
}

interface MetaHit {
  kind: 'prep' | 'cook' | 'serves' | 'skip';
  minutes?: number;
  number?: number;
  consumeNext?: boolean;
}
function classifyMetaLabel(label: string): MetaHit['kind'] | null {
  const l = label.toLowerCase().trim();
  if (/^(?:active\s+|inactive\s+)?prep(?:\s*time)?$/.test(l)) return 'prep';
  if (/^(?:cook(?:ing)?|bake|baking|total)(?:\s*time)?$/.test(l))
    return l.startsWith('total') ? 'skip' : 'cook';
  if (/^(?:serves?|servings?|yields?|makes|portions?)$/.test(l)) return 'serves';
  if (/^(?:level|difficulty|category|course|cuisine|prep time)$/.test(l))
    return 'skip';
  return null;
}
// Recognize "Prep Time: 10 min" (inline) or "Serves:" then the value on the
// next line. Returns null for anything that isn't a known metadata label.
function matchMeta(line: string, next: string | undefined): MetaHit | null {
  const inline = line.match(/^([A-Za-z][A-Za-z /]*?)\s*:\s*(\S.*)$/);
  if (inline) {
    const kind = classifyMetaLabel(inline[1]);
    if (!kind) return null;
    if (kind === 'prep' || kind === 'cook')
      return { kind, minutes: parseMinutesFromText(inline[2]) };
    if (kind === 'serves') return { kind, number: firstInt(inline[2]) };
    return { kind: 'skip' };
  }
  const only = line.match(/^([A-Za-z][A-Za-z /]*?)\s*:\s*$/);
  if (only && next) {
    const kind = classifyMetaLabel(only[1]);
    if (!kind) return null;
    if (kind === 'prep' || kind === 'cook')
      return { kind, minutes: parseMinutesFromText(next), consumeNext: true };
    if (kind === 'serves')
      return { kind, number: firstInt(next), consumeNext: true };
    return { kind: 'skip', consumeNext: true };
  }
  return null;
}

// A heading that begins trailing notes/variations after the steps — an
// alternate version, a "Notes:"/"Tips:" block, storage advice, etc. Everything
// from here to the end goes into the recipe notes rather than the steps.
function isNotesHeading(line: string): boolean {
  return (
    /^(?:notes?|tips?|variations?|to serve|serving suggestions?|make[- ]ahead|storage|substitutions?)\s*:?\s*$/i.test(
      line,
    ) ||
    /^(?:other|alternate|alternative)\b.*\b(?:option|stuffing|version|recipe|method|filling|topping|sauce|variation)\b/i.test(
      line,
    ) ||
    /\bincludes:\s*$/i.test(line)
  );
}

export function parseRecipeFromText(
  text: string,
  opts: { fallbackTitle?: string } = {},
): ParsedRecipe {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !isTextJunk(l));

  let servings: number | undefined;
  let prepTimeMinutes: number | undefined;
  let cookTimeMinutes: number | undefined;
  let textTitle: string | undefined;

  const ingredients: Ingredient[] = [];
  const steps: Instruction[] = [];
  const notes: string[] = [];
  let mode: 'pre' | 'ingredients' | 'instructions' | 'notes' = 'pre';
  let lastNumbered = false;

  const addIngredient = (line: string) => {
    const { quantity, name } = splitIngredient(line);
    if (name) ingredients.push({ name, quantity, image: '' });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Once in the trailing-notes block, everything is a note.
    if (mode === 'notes') {
      notes.push(line);
      continue;
    }

    // A notes/variation heading after the steps ends the recipe body — collect
    // the rest as notes (an alternate version, tips, storage, etc.).
    if (mode === 'instructions' && steps.length > 0 && isNotesHeading(line)) {
      mode = 'notes';
      notes.push(line);
      continue;
    }

    // Metadata (times / servings) — only before the instructions body, so a
    // step that says "Bake: ..." isn't eaten.
    if (mode !== 'instructions') {
      const meta = matchMeta(line, lines[i + 1]);
      if (meta) {
        if (meta.consumeNext) i++;
        if (meta.kind === 'prep' && prepTimeMinutes === undefined)
          prepTimeMinutes = meta.minutes;
        if (meta.kind === 'cook' && cookTimeMinutes === undefined)
          cookTimeMinutes = meta.minutes;
        if (meta.kind === 'serves' && servings === undefined)
          servings = meta.number;
        continue;
      }
    }

    // Explicit "Ingredients" / "Directions" headers switch mode.
    if (/^ingredients?:?\s*$/i.test(line)) {
      mode = 'ingredients';
      continue;
    }
    if (
      /^(?:directions?|instructions?|method|steps?|preparation|procedure):?\s*$/i.test(
        line,
      )
    ) {
      mode = 'instructions';
      continue;
    }

    // Numbered lines are always steps.
    const num = line.match(NUMBERED);
    if (num) {
      mode = 'instructions';
      steps.push({ step: '', title: '', body: num[2].trim(), videoThumb: '' });
      lastNumbered = true;
      continue;
    }

    // Bulleted lines are ingredients.
    if (BULLET.test(line)) {
      if (mode === 'pre') mode = 'ingredients';
      addIngredient(line.replace(BULLET, ''));
      continue;
    }

    // A quantity + food-unit line is an ingredient, even amid the steps.
    if (looksLikeIngredient(line)) {
      if (mode === 'pre') mode = 'ingredients';
      addIngredient(line);
      continue;
    }

    // A short "Label:" line is an ingredient sub-section (e.g. "Stuffing:").
    if (/:\s*$/.test(line) && line.length <= 32 && !QTY_START.test(line)) {
      const label = line.replace(/:\s*$/, '').trim();
      if (mode === 'instructions') {
        steps.push({ step: '', title: '', body: label, videoThumb: '' });
        lastNumbered = false;
      } else {
        if (mode === 'pre') mode = 'ingredients';
        ingredients.push({ name: '', quantity: '', image: '', section: label });
      }
      continue;
    }

    // Plain prose.
    if (mode === 'instructions') {
      const last = steps[steps.length - 1];
      // A wrapped continuation (after a numbered step, or a line that didn't end
      // a sentence) is appended; otherwise it starts a new step.
      if (last && (lastNumbered || !/[.!?]$/.test(last.body))) {
        last.body = `${last.body} ${line}`.trim();
      } else {
        steps.push({ step: '', title: '', body: line, videoThumb: '' });
      }
      lastNumbered = false;
    } else if (mode === 'ingredients') {
      addIngredient(line);
    } else if (textTitle === undefined) {
      // First prose line before anything else — the in-text title candidate.
      textTitle = line;
      mode = 'ingredients';
    }
  }

  steps.forEach((s, i) => {
    s.step = String(i + 1).padStart(2, '0');
    // No generic "Step N" title — the UI numbers steps automatically.
    s.title = '';
  });

  const title =
    (opts.fallbackTitle && opts.fallbackTitle.trim()) ||
    textTitle ||
    lines[0] ||
    'Untitled Recipe';

  return decodeParsed({
    title,
    category: guessCategory(title),
    servings,
    prepTimeMinutes,
    cookTimeMinutes,
    ingredients: ingredients.length > 0 ? ingredients : undefined,
    instructions: steps.length > 0 ? steps : undefined,
    recipeNotes: notes.length > 0 ? notes.join('\n') : undefined,
  });
}

export function parseRecipeFromHtml(html: string): ParsedRecipe | null {
  const parsed = parseRecipeFromJsonLd(html) ?? parseRecipeFromMeta(html);
  return parsed ? decodeParsed(parsed) : null;
}
