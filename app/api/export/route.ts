import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiSession } from '@/lib/session';
import { uploadsReferenced } from '@/lib/uploads-referenced';

export const dynamic = 'force-dynamic';

// Everything the native app (aftertaste-apple) needs to take over from this
// server, for the signed-in person: the household's shared data, plus that
// person's own food log, goals and settings — never anyone else's. Rows are
// returned as stored (not reshaped for the web UI) so nothing is lost on the
// way. Media files are listed by URL; /api/uploads serves them.
export async function GET() {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  const { userId, householdId } = session;
  const where = { householdId };

  const [household, user, recipes, grocery, mealPlan, ingredientMatches, parties, foodLog, recentlyViewed] =
    await Promise.all([
      prisma.household.findUnique({
        where: { id: householdId },
        select: {
          id: true,
          name: true,
          ownerId: true,
          members: { select: { id: true, email: true, displayName: true } },
        },
      }),
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.recipe.findMany({ where, orderBy: { createdAt: 'asc' } }),
      prisma.groceryItem.findMany({ where, orderBy: { position: 'asc' } }),
      prisma.mealPlan.findMany({ where, orderBy: [{ date: 'asc' }, { position: 'asc' }] }),
      prisma.ingredientMatch.findMany({ where }),
      prisma.party.findMany({
        where,
        orderBy: { date: 'asc' },
        include: { guests: true, dishes: true, tasks: true, items: true, partyNotes: true },
      }),
      prisma.foodLogEntry.findMany({ where: { userId }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] }),
      prisma.recentlyViewed.findMany({ where: { userId } }),
    ]);

  // The person's settings, without what only this server needs.
  const { passwordHash: _hash, ...me } = user ?? ({} as Record<string, unknown>);

  return NextResponse.json({
    app: 'AfterTaste',
    kind: 'native-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    household,
    me,
    recipes,
    grocery,
    mealPlan,
    ingredientMatches,
    parties,
    foodLog,
    recentlyViewed,
    media: uploadsReferenced(recipes, me),
  });
}
