'use server';

import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';
import {
  recipeToCreateData,
  recipeToUpdateData,
  parseSlotValue,
} from '@/lib/data';
import { notifyHousehold } from '@/lib/realtime';
import {
  persistRecipeImages,
  persistRecipeUpdateImages,
} from '@/lib/uploads';
import type { Recipe, GroceryItem } from '@/data/sample/recipes';

// All mutations are scoped to the session's household. Writes that target an
// existing row use `where: { id, householdId }` so a client can never touch
// another household's data even if it forges an id. After each write we NOTIFY
// the household channel so other members' open sessions refetch that slice.

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export async function createRecipeAction(recipe: Recipe): Promise<void> {
  const { householdId, userId } = await requireSession();
  const persisted = await persistRecipeImages(recipe);
  await prisma.recipe.create({
    data: recipeToCreateData(persisted, householdId, userId),
  });
  await notifyHousehold(householdId, 'recipes', userId);
}

export async function createRecipesAction(recipes: Recipe[]): Promise<void> {
  const { householdId, userId } = await requireSession();
  if (recipes.length === 0) return;
  const persisted = await Promise.all(recipes.map(persistRecipeImages));
  await prisma.recipe.createMany({
    data: persisted.map((r) => recipeToCreateData(r, householdId, userId)),
    skipDuplicates: true,
  });
  await notifyHousehold(householdId, 'recipes', userId);
}

export async function updateRecipeAction(
  id: string,
  updates: Partial<Recipe>,
): Promise<void> {
  const { householdId, userId } = await requireSession();
  const persisted = await persistRecipeUpdateImages(updates);
  await prisma.recipe.updateMany({
    where: { id, householdId },
    data: recipeToUpdateData(persisted),
  });
  await notifyHousehold(householdId, 'recipes', userId);
}

export async function deleteRecipeAction(id: string): Promise<void> {
  const { householdId, userId } = await requireSession();
  await prisma.recipe.deleteMany({ where: { id, householdId } });
  await notifyHousehold(householdId, 'recipes', userId);
}

// ---------------------------------------------------------------------------
// Favorites (shared — stored as Recipe.isFavorite)
// ---------------------------------------------------------------------------

export async function setFavoriteAction(
  recipeId: string,
  isFavorite: boolean,
): Promise<void> {
  const { householdId, userId } = await requireSession();
  await prisma.recipe.updateMany({
    where: { id: recipeId, householdId },
    data: { isFavorite },
  });
  await notifyHousehold(householdId, 'favorites', userId);
}

// ---------------------------------------------------------------------------
// Grocery list
// ---------------------------------------------------------------------------

export async function addGroceryItemsAction(
  items: GroceryItem[],
): Promise<void> {
  const { householdId, userId } = await requireSession();
  if (items.length === 0) return;
  const agg = await prisma.groceryItem.aggregate({
    where: { householdId },
    _max: { position: true },
  });
  let position = (agg._max.position ?? -1) + 1;
  await prisma.groceryItem.createMany({
    data: items.map((it) => ({
      id: it.id,
      householdId,
      name: it.name,
      quantity: it.quantity,
      category: it.category,
      checked: it.checked,
      recipeId: it.recipeId ?? null,
      recipeTitle: it.recipeTitle ?? null,
      position: position++,
    })),
    skipDuplicates: true,
  });
  await notifyHousehold(householdId, 'grocery', userId);
}

export async function toggleGroceryItemAction(id: string): Promise<void> {
  const { householdId, userId } = await requireSession();
  const item = await prisma.groceryItem.findFirst({
    where: { id, householdId },
    select: { checked: true },
  });
  if (!item) return;
  await prisma.groceryItem.updateMany({
    where: { id, householdId },
    data: { checked: !item.checked },
  });
  await notifyHousehold(householdId, 'grocery', userId);
}

export async function removeGroceryItemAction(id: string): Promise<void> {
  const { householdId, userId } = await requireSession();
  await prisma.groceryItem.deleteMany({ where: { id, householdId } });
  await notifyHousehold(householdId, 'grocery', userId);
}

export async function reorderGroceryItemsAction(
  items: GroceryItem[],
): Promise<void> {
  const { householdId, userId } = await requireSession();
  await prisma.$transaction(
    items.map((it, index) =>
      prisma.groceryItem.updateMany({
        where: { id: it.id, householdId },
        data: { position: index, category: it.category },
      }),
    ),
  );
  await notifyHousehold(householdId, 'grocery', userId);
}

// ---------------------------------------------------------------------------
// Meal plan
// ---------------------------------------------------------------------------

function splitSlotKey(slotKey: string): { date: string; meal: string } {
  // slotKey is `YYYY-MM-DD_Meal` — the date is a fixed 10 chars.
  return { date: slotKey.slice(0, 10), meal: slotKey.slice(11) };
}

// Replace all entries for a slot with the given ordered list (recipe ids or
// `note:<text>` values). A slot can hold several recipes plus a note now.
export async function setMealSlotAction(
  slotKey: string,
  values: string[],
): Promise<void> {
  const { householdId, userId } = await requireSession();
  const { date, meal } = splitSlotKey(slotKey);
  await prisma.$transaction([
    prisma.mealPlan.deleteMany({ where: { householdId, date, meal } }),
    ...values.map((value, position) => {
      const { recipeId, note } = parseSlotValue(value);
      return prisma.mealPlan.create({
        data: { householdId, date, meal, recipeId, note, position },
      });
    }),
  ]);
  await notifyHousehold(householdId, 'mealplan', userId);
}

export async function clearMealSlotAction(slotKey: string): Promise<void> {
  const { householdId, userId } = await requireSession();
  const { date, meal } = splitSlotKey(slotKey);
  await prisma.mealPlan.deleteMany({ where: { householdId, date, meal } });
  await notifyHousehold(householdId, 'mealplan', userId);
}

// ---------------------------------------------------------------------------
// Recently viewed (per-user — no household broadcast)
// ---------------------------------------------------------------------------

export async function recordViewAction(recipeId: string): Promise<void> {
  const { userId, householdId } = await requireSession();
  // Ignore views of recipes outside the household (e.g. a stale id).
  const exists = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId },
    select: { id: true },
  });
  if (!exists) return;
  await prisma.recentlyViewed.upsert({
    where: { userId_recipeId: { userId, recipeId } },
    create: { userId, recipeId },
    update: { viewedAt: new Date() },
  });
}
