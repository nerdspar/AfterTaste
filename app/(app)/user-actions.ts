'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';

export interface UserPrefsInput {
  accent?: string;
  theme?: string;
  units?: string;
  displayName?: string;
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
  if (Object.keys(data).length === 0) return;

  await prisma.user.update({ where: { id: userId }, data });
}
