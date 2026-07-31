import { AppShell } from '@/components/aftertaste/AppShell';
import { FavoritesProvider } from '@/components/aftertaste/FavoritesProvider';
import { RecipeStoreProvider } from '@/components/aftertaste/RecipeStoreProvider';
import { GroceryStoreProvider } from '@/components/aftertaste/GroceryStoreProvider';
import { MealPlanStoreProvider } from '@/components/aftertaste/MealPlanStoreProvider';
import { RecipeActionsProvider } from '@/components/aftertaste/RecipeActionsProvider';
import { RecentlyViewedHydrator } from '@/components/aftertaste/RecentlyViewedHydrator';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { loadHouseholdState } from '@/lib/data';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate the app (defense in depth alongside middleware) and surface the
  // signed-in user to the header.
  const session = await auth();
  if (!session?.user?.id || !session.user.householdId) redirect('/login');

  const user = {
    name: session.user.name ?? session.user.email ?? 'Account',
    email: session.user.email ?? '',
    image: session.user.image ?? null,
  };

  // Load the household's data on the server and seed the client stores.
  const state = await loadHouseholdState();

  return (
    <RecipeStoreProvider initialRecipes={state.recipes}>
      <FavoritesProvider initialFavorites={state.favorites}>
        <GroceryStoreProvider initialItems={state.grocery}>
          <MealPlanStoreProvider initialPlan={state.plan}>
            <RecipeActionsProvider>
              <RecentlyViewedHydrator ids={state.recentlyViewed} />
              <AppShell user={user}>{children}</AppShell>
            </RecipeActionsProvider>
          </MealPlanStoreProvider>
        </GroceryStoreProvider>
      </FavoritesProvider>
    </RecipeStoreProvider>
  );
}
