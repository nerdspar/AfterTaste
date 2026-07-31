import { redirect } from 'next/navigation';
import { auth } from '@/auth';

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
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.householdId) redirect('/login');

  return {
    userId: user.id,
    householdId: user.householdId,
    email: user.email ?? '',
    name: user.name ?? user.email ?? '',
  };
}
