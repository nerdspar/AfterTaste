'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AccountResult {
  ok?: boolean;
  error?: string;
}

/** Change the signed-in user's email (requires the current password). */
export async function changeEmail(input: {
  newEmail: string;
  currentPassword: string;
}): Promise<AccountResult> {
  const { userId } = await requireSession();
  const newEmail = input.newEmail.toLowerCase().trim();
  if (!EMAIL_RE.test(newEmail)) {
    return { error: 'Enter a valid email address.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });
  if (!user) return { error: 'Account not found.' };
  if (newEmail === user.email) return { error: 'That is already your email.' };

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) return { error: 'Current password is incorrect.' };

  const taken = await prisma.user.findUnique({
    where: { email: newEmail },
    select: { id: true },
  });
  if (taken) return { error: 'That email is already in use.' };

  await prisma.user.update({ where: { id: userId }, data: { email: newEmail } });
  return { ok: true };
}

/** Change the signed-in user's password (requires the current password). */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<AccountResult> {
  const { userId } = await requireSession();
  if (input.newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { error: 'Account not found.' };

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) return { error: 'Current password is incorrect.' };

  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { ok: true };
}
