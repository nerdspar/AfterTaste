'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { persistDataUrl } from '@/lib/uploads';

export interface UserPrefsInput {
  accent?: string;
  theme?: string;
  units?: string;
  displayName?: string;
  /** A data-URI (uploaded photo), http URL, or '' to clear. */
  avatarUrl?: string;
  // Nutrition goals. `null` clears a goal; omit to leave unchanged.
  calorieGoal?: number | null;
  proteinGoal?: number | null;
  carbsGoal?: number | null;
  fatGoal?: number | null;
}

/** Persist the signed-in user's profile / preferences. */
export async function updateUserPrefs(input: UserPrefsInput): Promise<void> {
  const { userId } = await requireSession();

  const data: Prisma.UserUpdateInput = {};
  if (input.accent !== undefined) data.accent = input.accent;
  if (input.theme !== undefined) data.theme = input.theme;
  if (input.units !== undefined) data.units = input.units;
  if (input.displayName !== undefined) {
    data.displayName = input.displayName.trim() || null;
  }
  if (input.avatarUrl !== undefined) {
    // A data-URI is written to the uploads volume; other values pass through.
    data.avatarUrl = (await persistDataUrl(input.avatarUrl)) || null;
  }
  if (input.calorieGoal !== undefined) data.calorieGoal = input.calorieGoal;
  if (input.proteinGoal !== undefined) data.proteinGoalG = input.proteinGoal;
  if (input.carbsGoal !== undefined) data.carbsGoalG = input.carbsGoal;
  if (input.fatGoal !== undefined) data.fatGoalG = input.fatGoal;
  if (Object.keys(data).length === 0) return;

  await prisma.user.update({ where: { id: userId }, data });
}
