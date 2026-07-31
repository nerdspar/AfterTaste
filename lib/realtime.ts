import { prisma } from '@/lib/db';

// Which slice of household data changed. The client refetches only that slice.
export type ChangeScope = 'recipes' | 'grocery' | 'mealplan' | 'favorites';

export interface ChangePayload {
  scope: ChangeScope;
  actor: string; // userId that made the change (clients skip their own)
}

export function householdChannel(householdId: string): string {
  return `household_${householdId}`;
}

/**
 * Broadcast a change to the household's realtime channel via Postgres
 * NOTIFY. The SSE endpoint (/api/events) forwards it to connected members.
 */
export async function notifyHousehold(
  householdId: string,
  scope: ChangeScope,
  actor: string,
): Promise<void> {
  const payload: ChangePayload = { scope, actor };
  try {
    await prisma.$executeRaw`SELECT pg_notify(${householdChannel(
      householdId,
    )}, ${JSON.stringify(payload)})`;
  } catch (e) {
    // Realtime is best-effort — never fail a mutation because of it.
    console.error('[realtime] notify failed', e);
  }
}
