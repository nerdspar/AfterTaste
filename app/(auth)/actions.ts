'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/db';
import { signIn, signOut } from '@/auth';

export interface AuthActionState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
