import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export interface SessionContext {
  userId: string;
  householdId: string;
  email: string;
  name: string;
}

/**
 * The current user + household, or null when signed out (or the user has no
 * household). householdId is read from the DB (not the JWT) so that
 * joining/leaving a household takes effect immediately without re-login.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { householdId: true, email: true, displayName: true },
  });
  if (!user?.householdId) return null;

  return {
    userId,
    householdId: user.householdId,
    email: user.email,
    name: user.displayName ?? user.email,
  };
}

/**
 * Server-side guard for app routes and server actions. Returns the current
 * user + household, redirecting to /login when unauthenticated. Every data
 * query in the app scopes to `householdId`.
 */
export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');
  return ctx;
}

/**
 * Guard for API routes, which fetch() callers can't follow to /login: returns
 * the session, or a JSON 401 response for the route to return as-is.
 */
export async function requireApiSession(): Promise<SessionContext | NextResponse> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  return ctx;
}
