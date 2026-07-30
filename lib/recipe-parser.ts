import type { Ingredient, Instruction } from '@/data/sample/recipes';

export interface ParsedRecipe {
  title?: string;
  description?: string;
  image?: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  calories?: number;
  cuisine?: string;
  category?: string;
  ingredients?: Ingredient[];
  instructions?: Instruction[];
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes;
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

      const rawInstructions =
        data.recipeInstructions ?? [];
      const instructions: Instruction[] = [];
      for (const item of rawInstructions) {
        if (typeof item === 'string') {
          instructions.push({
            step: String(instructions.length + 1).padStart(2, '0'),
            title: `Step ${instructions.length + 1}`,
            body: item,
            videoThumb: '',
          });
        } else if (item['@type'] === 'HowToStep') {
          instructions.push({
            step: String(instructions.length + 1).padStart(2, '0'),
            title: item.name || `Step ${instructions.length + 1}`,
            body: item.text || '',
            videoThumb: '',
          });
        } else if (item['@type'] === 'HowToSection') {
          for (const sub of item.itemListElement ?? []) {
            instructions.push({
              step: String(instructions.length + 1).padStart(2, '0'),
              title: sub.name || `Step ${instructions.length + 1}`,
              body: sub.text || '',
              videoThumb: '',
            });
          }
        }
      }

      let imageUrl = '';
      if (typeof data.image === 'string') imageUrl = data.image;
      else if (Array.isArray(data.image)) imageUrl = data.image[0];
      else if (data.image?.url) imageUrl = data.image.url;

      let calories: number | undefined;
      if (data.nutrition?.calories) {
        const cal = parseInt(String(data.nutrition.calories), 10);
        if (!isNaN(cal)) calories = cal;
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
        cuisine: data.recipeCuisine
          ? (Array.isArray(data.recipeCuisine)
              ? data.recipeCuisine[0]
              : data.recipeCuisine)
          : undefined,
        category: data.recipeCategory
          ? (Array.isArray(data.recipeCategory)
              ? data.recipeCategory[0]
              : data.recipeCategory)
          : guessCategory(data.name || '', keywords),
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
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)\\s*=\\s*["']${property}["'][^>]*content\\s*=\\s*["']([^"']+)["']`,
    'i',
  );
  const match = html.match(regex);
  if (match) return match[1];
  const regex2 = new RegExp(
    `<meta[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*(?:property|name)\\s*=\\s*["']${property}["']`,
    'i',
  );
  const match2 = html.match(regex2);
  return match2 ? match2[1] : '';
}

export function parseRecipeFromMeta(html: string): ParsedRecipe | null {
  const title =
    extractMetaContent(html, 'og:title') ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = extractMetaContent(html, 'og:description');
  const image = extractMetaContent(html, 'og:image');

  if (!title) return null;

  return {
    title,
    description: description || undefined,
    image: image || undefined,
    category: guessCategory(title),
  };
}

export function parseRecipeFromText(text: string): ParsedRecipe {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const title = lines[0] || 'Untitled Recipe';

  const ingredientPatterns =
    /^[-•*]\s+|^\d+[.)]\s+|^(?:[\d/½¼¾⅓⅔⅛]+\s)/;
  const ingredientLines: string[] = [];
  const instructionLines: string[] = [];
  let inIngredients = false;
  let inInstructions = false;

  for (const line of lines.slice(1)) {
    const lower = line.toLowerCase();
    if (/^ingredients?:?$/i.test(line)) {
      inIngredients = true;
      inInstructions = false;
      continue;
    }
    if (
      /^(?:instructions?|directions?|steps?|method|preparation):?$/i.test(line)
    ) {
      inInstructions = true;
      inIngredients = false;
      continue;
    }

    if (inIngredients) {
      ingredientLines.push(line.replace(/^[-•*]\s+/, ''));
    } else if (inInstructions) {
      instructionLines.push(line.replace(/^\d+[.)]\s+/, ''));
    } else if (ingredientPatterns.test(line) && !inInstructions) {
      ingredientLines.push(line.replace(/^[-•*]\s+/, ''));
    } else if (/^\d+[.)]\s/.test(line)) {
      instructionLines.push(line.replace(/^\d+[.)]\s+/, ''));
    } else if (lower.includes('cup') || lower.includes('tbsp') || lower.includes('tsp') || lower.includes('oz')) {
      ingredientLines.push(line);
    }
  }

  const ingredients: Ingredient[] = ingredientLines.map((line) => {
    const parts = line.match(/^([\d/.\s½¼¾⅓⅔⅛]+\s*\w*)\s+(.+)$/);
    return {
      name: parts ? parts[2].trim() : line,
      quantity: parts ? parts[1].trim() : '',
      image: '',
    };
  });

  const instructions: Instruction[] = instructionLines.map((line, i) => ({
    step: String(i + 1).padStart(2, '0'),
    title: `Step ${i + 1}`,
    body: line,
    videoThumb: '',
  }));

  let description = '';
  if (!inIngredients && !inInstructions && lines.length > 1) {
    const descLine = lines[1];
    if (!ingredientPatterns.test(descLine) && !/^\d+[.)]/.test(descLine)) {
      description = descLine;
    }
  }

  return {
    title,
    description: description || undefined,
    category: guessCategory(title),
    ingredients: ingredients.length > 0 ? ingredients : undefined,
    instructions: instructions.length > 0 ? instructions : undefined,
  };
}

export function parseRecipeFromHtml(html: string): ParsedRecipe | null {
  return parseRecipeFromJsonLd(html) ?? parseRecipeFromMeta(html);
}
