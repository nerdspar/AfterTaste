import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { recipeRowToApp, groceryRowToApp, mealsToPlan } from '@/lib/data';

export const dynamic = 'force-dynamic';

// Returns a single slice of the household's data, used by the realtime client
// to refetch just what changed.
export async function GET(req: Request) {
  const { householdId } = await requireSession();
  const scope = new URL(req.url).searchParams.get('scope');

  if (scope === 'grocery') {
    const grocery = await prisma.groceryItem.findMany({
      where: { householdId },
      orderBy: { position: 'asc' },
    });
    return NextResponse.json({ grocery: grocery.map(groceryRowToApp) });
  }

  if (scope === 'mealplan') {
    const meals = await prisma.mealPlan.findMany({ where: { householdId } });
    return NextResponse.json({ plan: mealsToPlan(meals) });
  }

  if (scope === 'recipes') {
    const recipes = await prisma.recipe.findMany({
      where: { householdId },
      orderBy: { createdAt: 'desc' },
    });
    const list = recipes.map(recipeRowToApp);
    return NextResponse.json({
      recipes: list,
      favorites: list.filter((r) => r.isFavorite).map((r) => r.id),
    });
  }

  if (scope === 'favorites') {
    const recipes = await prisma.recipe.findMany({
      where: { householdId },
      select: { id: true, isFavorite: true },
    });
    return NextResponse.json({
      favorites: recipes.filter((r) => r.isFavorite).map((r) => r.id),
    });
  }

  return NextResponse.json({ error: 'unknown scope' }, { status: 400 });
}
