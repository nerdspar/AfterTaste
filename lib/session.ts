import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export interface SessionContext {
  userId: string;
  householdId: string;
  email: string;
  name: string;
}

/**
 * Server-side guard for app routes and server actions. Returns the current
 * user + household, redirecting to /login when unauthenticated. Every data
 * query in the app scopes to `householdId`.
 *
 * householdId is read from the DB (not the JWT) so that joining/leaving a
 * household takes effect immediately without needing to re-login.
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { householdId: true, email: true, displayName: true },
  });
  if (!user?.householdId) redirect('/login');

  return {
    userId,
    householdId: user.householdId,
    email: user.email,
    name: user.displayName ?? user.email,
  };
}
