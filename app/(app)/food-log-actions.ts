'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';

// The personal food log is per-user (not household). Every query is scoped to
// the signed-in user's id so one member can't read or edit another's log.

export interface FoodLogEntry {
  id: string;
  date: string; // local YYYY-MM-DD
  meal: string; // Breakfast | Lunch | Dinner | Snack
  recipeId: string | null;
  name: string;
  servings: number;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
}

type FoodLogRow = Prisma.FoodLogEntryGetPayload<Record<string, never>>;

function rowToEntry(r: FoodLogRow): FoodLogEntry {
  return {
    id: r.id,
    date: r.date,
    meal: r.meal,
    recipeId: r.recipeId,
    name: r.name,
    servings: r.servings,
    calories: r.calories,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    fiberG: r.fiberG,
    sugarG: r.sugarG,
    sodiumMg: r.sodiumMg,
  };
}

/** All of the signed-in user's log entries for one local day. */
export async function loadFoodLog(date: string): Promise<FoodLogEntry[]> {
  const { userId } = await requireSession();
  const rows = await prisma.foodLogEntry.findMany({
    where: { userId, date },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(rowToEntry);
}

export interface AddFoodLogInput {
  date: string;
  meal: string;
  recipeId?: string | null;
  name: string;
  servings: number;
  calories: number;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  sugarG?: number | null;
  sodiumMg?: number | null;
}

export async function addFoodLogEntry(
  input: AddFoodLogInput,
): Promise<FoodLogEntry> {
  const { userId } = await requireSession();
  const row = await prisma.foodLogEntry.create({
    data: {
      userId,
      date: input.date,
      meal: input.meal,
      recipeId: input.recipeId ?? null,
      name: input.name,
      servings: input.servings,
      calories: input.calories,
      proteinG: input.proteinG ?? null,
      carbsG: input.carbsG ?? null,
      fatG: input.fatG ?? null,
      fiberG: input.fiberG ?? null,
      sugarG: input.sugarG ?? null,
      sodiumMg: input.sodiumMg ?? null,
    },
  });
  return rowToEntry(row);
}

/** Update the servings and/or meal of one entry the user owns. */
export async function updateFoodLogEntry(
  id: string,
  patch: { servings?: number; meal?: string },
): Promise<void> {
  const { userId } = await requireSession();
  const data: Prisma.FoodLogEntryUpdateInput = {};
  if (patch.servings !== undefined) data.servings = patch.servings;
  if (patch.meal !== undefined) data.meal = patch.meal;
  if (Object.keys(data).length === 0) return;
  // updateMany with the userId guard so a mismatched id is a no-op, not a leak.
  await prisma.foodLogEntry.updateMany({ where: { id, userId }, data });
}

export async function removeFoodLogEntry(id: string): Promise<void> {
  const { userId } = await requireSession();
  await prisma.foodLogEntry.deleteMany({ where: { id, userId } });
}
