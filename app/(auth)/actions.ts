'use server';

import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/db';
import { signIn, signOut } from '@/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { resolveOrigin } from '@/lib/url';

export interface AuthActionState {
  error?: string;
  ok?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export async function login(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '')
    .toLowerCase()
    .trim();
  const password = String(formData.get('password') ?? '');
  if (!EMAIL_RE.test(email) || !password) {
    return { error: 'Enter your email and password.' };
  }

  try {
    await signIn('credentials', { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password.' };
    }
    throw error;
  }
  redirect('/dashboard');
}

export async function signup(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '')
    .toLowerCase()
    .trim();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();

  if (!EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: 'An account with that email already exists.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // If someone already invited this email to a household, join it instead of
  // creating a new one.
  const invite = await prisma.householdInvite.findFirst({
    where: { email, status: 'pending' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, householdId: true },
  });

  if (invite) {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName: displayName || null,
          householdId: invite.householdId,
        },
      });
      await tx.householdInvite.update({
        where: { id: invite.id },
        data: { status: 'accepted' },
      });
    });
  } else {
    // User and Household reference each other, so create both in a transaction:
    // user first (household null), then the household it owns, then link them.
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, displayName: displayName || null },
      });
      const household = await tx.household.create({
        data: {
          name: displayName ? `${displayName}'s Household` : 'My Household',
          ownerId: user.id,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { householdId: household.id },
      });
    });
  }

  try {
    await signIn('credentials', { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      // Account created but auto sign-in failed — send them to sign in manually.
      redirect('/login');
    }
    throw error;
  }
  redirect('/dashboard');
}

export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '')
    .toLowerCase()
    .trim();
  if (!EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.' };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  // Only send when the account exists, but always return the same response so
  // the form never discloses whether an email is registered.
  if (user) {
    const rawToken = randomBytes(32).toString('hex');
    // Replace any outstanding tokens so only the newest link works.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    const origin = await resolveOrigin();
    const resetUrl = `${origin}/reset-password?token=${rawToken}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch {
      // Swallow send failures — the generic response still applies and we do
      // not want to leak that the address exists.
    }
  }

  return { ok: true };
}

export async function resetPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (!token) {
    return { error: 'This reset link is invalid. Request a new one.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.' };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: 'This reset link is invalid or has expired.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    // Consume this token and drop any other outstanding ones for the user.
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  redirect('/login?reset=1');
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
