import type { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';
import type {
  Recipe,
  GroceryItem,
  Ingredient,
  Instruction,
  Chef,
} from '@/data/sample/recipes';

// Server-side data access + mappers between Prisma rows and the app's domain
// types. Everything is scoped to the session's household.

type RecipeRow = Prisma.RecipeGetPayload<Record<string, never>>;
type GroceryRow = Prisma.GroceryItemGetPayload<Record<string, never>>;
type MealRow = Prisma.MealPlanGetPayload<Record<string, never>>;

const EMPTY_CHEF: Chef = { name: '', avatar: '', recipeCount: 0, rating: 0 };

// Notes share the plan map with recipe ids using this prefix (mirrors the
// client store). The DB keeps recipeId and note in separate columns.
const NOTE_PREFIX = 'note:';

// ---------------------------------------------------------------------------
// Row -> app type
// ---------------------------------------------------------------------------

export function recipeRowToApp(r: RecipeRow): Recipe {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    image: r.image ?? '',
    rating: r.rating,
    ratingCount: r.ratingCount,
    cookTime: r.cookTime,
    cookTimeMinutes: r.cookTimeMinutes,
    prepTimeMinutes: r.prepTimeMinutes,
    totalTimeMinutes: r.totalTimeMinutes,
    servings: r.servings,
    calories: r.calories,
    proteinG: r.proteinG ?? undefined,
    carbsG: r.carbsG ?? undefined,
    fatG: r.fatG ?? undefined,
    fiberG: r.fiberG ?? undefined,
    sugarG: r.sugarG ?? undefined,
    sodiumMg: r.sodiumMg ?? undefined,
    nutritionSource:
      (r.nutritionSource as Recipe['nutritionSource']) ?? undefined,
    difficulty: r.difficulty,
    cost: r.cost,
    isFavorite: r.isFavorite,
    description: r.description,
    recipeNotes: r.recipeNotes,
    myNotes: r.myNotes,
    ingredients: (r.ingredients as unknown as Ingredient[]) ?? [],
    instructions: (r.instructions as unknown as Instruction[]) ?? [],
    chef: (r.chef as unknown as Chef | null) ?? EMPTY_CHEF,
    source: r.source,
    cuisine: r.cuisine,
    cookingClassType: r.cookingClassType,
    ease: r.ease,
    taste: r.taste,
    cleanup: r.cleanup,
    makeAgain: r.makeAgain,
    remade: r.remade,
    tags: r.tags,
    createdAt: r.createdAt.getTime(),
    sourceUrl: r.sourceUrl ?? undefined,
  };
}

export function groceryRowToApp(g: GroceryRow): GroceryItem {
  return {
    id: g.id,
    name: g.name,
    quantity: g.quantity,
    checked: g.checked,
    category: g.category,
    ...(g.recipeId ? { recipeId: g.recipeId } : {}),
    ...(g.recipeTitle ? { recipeTitle: g.recipeTitle } : {}),
  };
}

export function mealsToPlan(meals: MealRow[]): Record<string, string[]> {
  const plan: Record<string, string[]> = {};
  // A slot can hold several entries; order them by position (main first).
  const sorted = [...meals].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  for (const m of sorted) {
    const key = `${m.date}_${m.meal}`;
    const value = m.recipeId
      ? m.recipeId
      : m.note != null
        ? NOTE_PREFIX + m.note
        : null;
    if (value == null) continue;
    (plan[key] ??= []).push(value);
  }
  return plan;
}

// ---------------------------------------------------------------------------
// app type -> Prisma write payloads
// ---------------------------------------------------------------------------

export function recipeToCreateData(
  r: Recipe,
  householdId: string,
  createdById: string,
): Prisma.RecipeUncheckedCreateInput {
  return {
    id: r.id,
    householdId,
    createdById,
    title: r.title,
    category: r.category,
    image: r.image || null,
    sourceUrl: r.sourceUrl || null,
    rating: r.rating ?? 0,
    ratingCount: r.ratingCount ?? 0,
    cookTime: r.cookTime ?? '',
    cookTimeMinutes: r.cookTimeMinutes ?? 0,
    prepTimeMinutes: r.prepTimeMinutes ?? 0,
    totalTimeMinutes: r.totalTimeMinutes ?? 0,
    servings: r.servings ?? 4,
    calories: r.calories ?? 0,
    proteinG: r.proteinG ?? null,
    carbsG: r.carbsG ?? null,
    fatG: r.fatG ?? null,
    fiberG: r.fiberG ?? null,
    sugarG: r.sugarG ?? null,
    sodiumMg: r.sodiumMg ?? null,
    nutritionSource: r.nutritionSource ?? null,
    difficulty: r.difficulty ?? 'Medium',
    cost: r.cost ?? 0,
    cookingClassType: r.cookingClassType ?? 'Cozy Comfort Food',
    cuisine: r.cuisine ?? '',
    source: r.source ?? 'Original',
    description: r.description ?? '',
    recipeNotes: r.recipeNotes ?? '',
    myNotes: r.myNotes ?? '',
    ingredients: (r.ingredients ?? []) as unknown as Prisma.InputJsonValue,
    instructions: (r.instructions ?? []) as unknown as Prisma.InputJsonValue,
    chef: (r.chef ?? EMPTY_CHEF) as unknown as Prisma.InputJsonValue,
    ease: r.ease ?? 0,
    taste: r.taste ?? 0,
    cleanup: r.cleanup ?? 0,
    makeAgain: r.makeAgain ?? null,
    remade: r.remade ?? 0,
    tags: r.tags ?? [],
    isFavorite: r.isFavorite ?? false,
  };
}

export function recipeToUpdateData(
  u: Partial<Recipe>,
): Prisma.RecipeUpdateInput {
  const data: Prisma.RecipeUpdateInput = {};
  if (u.title !== undefined) data.title = u.title;
  if (u.category !== undefined) data.category = u.category;
  if (u.image !== undefined) data.image = u.image || null;
  if (u.sourceUrl !== undefined) data.sourceUrl = u.sourceUrl || null;
  if (u.rating !== undefined) data.rating = u.rating;
  if (u.ratingCount !== undefined) data.ratingCount = u.ratingCount;
  if (u.cookTime !== undefined) data.cookTime = u.cookTime;
  if (u.cookTimeMinutes !== undefined) data.cookTimeMinutes = u.cookTimeMinutes;
  if (u.prepTimeMinutes !== undefined) data.prepTimeMinutes = u.prepTimeMinutes;
  if (u.totalTimeMinutes !== undefined)
    data.totalTimeMinutes = u.totalTimeMinutes;
  if (u.servings !== undefined) data.servings = u.servings;
  if (u.calories !== undefined) data.calories = u.calories;
  if (u.proteinG !== undefined) data.proteinG = u.proteinG ?? null;
  if (u.carbsG !== undefined) data.carbsG = u.carbsG ?? null;
  if (u.fatG !== undefined) data.fatG = u.fatG ?? null;
  if (u.fiberG !== undefined) data.fiberG = u.fiberG ?? null;
  if (u.sugarG !== undefined) data.sugarG = u.sugarG ?? null;
  if (u.sodiumMg !== undefined) data.sodiumMg = u.sodiumMg ?? null;
  if (u.nutritionSource !== undefined)
    data.nutritionSource = u.nutritionSource ?? null;
  if (u.difficulty !== undefined) data.difficulty = u.difficulty;
  if (u.cost !== undefined) data.cost = u.cost;
  if (u.cookingClassType !== undefined)
    data.cookingClassType = u.cookingClassType;
  if (u.cuisine !== undefined) data.cuisine = u.cuisine;
  if (u.source !== undefined) data.source = u.source;
  if (u.description !== undefined) data.description = u.description;
  if (u.recipeNotes !== undefined) data.recipeNotes = u.recipeNotes;
  if (u.myNotes !== undefined) data.myNotes = u.myNotes;
  if (u.ingredients !== undefined)
    data.ingredients = u.ingredients as unknown as Prisma.InputJsonValue;
  if (u.instructions !== undefined)
    data.instructions = u.instructions as unknown as Prisma.InputJsonValue;
  if (u.chef !== undefined)
    data.chef = u.chef as unknown as Prisma.InputJsonValue;
  if (u.ease !== undefined) data.ease = u.ease;
  if (u.taste !== undefined) data.taste = u.taste;
  if (u.cleanup !== undefined) data.cleanup = u.cleanup;
  if (u.makeAgain !== undefined) data.makeAgain = u.makeAgain;
  if (u.remade !== undefined) data.remade = u.remade;
  if (u.tags !== undefined) data.tags = u.tags;
  if (u.isFavorite !== undefined) data.isFavorite = u.isFavorite;
  return data;
}

/** Split a client slot value ("recipeId" or "note:text") into DB columns. */
export function parseSlotValue(value: string): {
  recipeId: string | null;
  note: string | null;
} {
  if (value.startsWith(NOTE_PREFIX)) {
    return { recipeId: null, note: value.slice(NOTE_PREFIX.length) };
  }
  return { recipeId: value, note: null };
}

// ---------------------------------------------------------------------------
// Reads (for the server layout)
// ---------------------------------------------------------------------------

export interface HouseholdState {
  recipes: Recipe[];
  grocery: GroceryItem[];
  plan: Record<string, string[]>;
  favorites: string[];
  recentlyViewed: string[];
}

/** Load the full initial state for the signed-in user's household. */
export async function loadHouseholdState(): Promise<HouseholdState> {
  const { householdId, userId } = await requireSession();

  const [recipes, grocery, meals, viewed] = await Promise.all([
    prisma.recipe.findMany({
      where: { householdId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.groceryItem.findMany({
      where: { householdId },
      orderBy: { position: 'asc' },
    }),
    prisma.mealPlan.findMany({
      where: { householdId },
      orderBy: { position: 'asc' },
    }),
    prisma.recentlyViewed.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: 20,
      select: { recipeId: true },
    }),
  ]);

  const recipeList = recipes.map(recipeRowToApp);
  return {
    recipes: recipeList,
    grocery: grocery.map(groceryRowToApp),
    plan: mealsToPlan(meals),
    favorites: recipeList.filter((r) => r.isFavorite).map((r) => r.id),
    recentlyViewed: viewed.map((v) => v.recipeId),
  };
}

export interface UserProfile {
  id: string;
  /** Display name, falling back to the email. Used for greetings/avatars. */
  name: string;
  displayName: string;
  email: string;
  image: string | null;
  accent: string;
  theme: string;
  units: string;
}

/** Load the signed-in user's profile + preferences. */
export async function loadUserProfile(): Promise<UserProfile> {
  const { userId } = await requireSession();
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      displayName: true,
      email: true,
      avatarUrl: true,
      accent: true,
      theme: true,
      units: true,
    },
  });
  if (!u) redirect('/login');
  return {
    id: userId,
    name: u.displayName ?? u.email,
    displayName: u.displayName ?? '',
    email: u.email,
    image: u.avatarUrl,
    accent: u.accent,
    theme: u.theme,
    units: u.units,
  };
}
