import { AppShell } from '@/components/aftertaste/AppShell';
import { FavoritesProvider } from '@/components/aftertaste/FavoritesProvider';
import { RecipeStoreProvider } from '@/components/aftertaste/RecipeStoreProvider';
import { GroceryStoreProvider } from '@/components/aftertaste/GroceryStoreProvider';
import { MealPlanStoreProvider } from '@/components/aftertaste/MealPlanStoreProvider';
import { RecipeActionsProvider } from '@/components/aftertaste/RecipeActionsProvider';
import { RecentlyViewedHydrator } from '@/components/aftertaste/RecentlyViewedHydrator';
import { CurrentUserProvider } from '@/components/aftertaste/CurrentUserProvider';
import { PrefsInitializer } from '@/components/aftertaste/PrefsInitializer';
import { loadHouseholdState, loadUserProfile } from '@/lib/data';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate the app + load the user's profile and household data on the server.
  // Both helpers call requireSession() (redirecting to /login if unauthed).
  const [profile, state] = await Promise.all([
    loadUserProfile(),
    loadHouseholdState(),
  ]);

  return (
    <CurrentUserProvider user={profile}>
      <PrefsInitializer />
      <RecipeStoreProvider initialRecipes={state.recipes}>
        <FavoritesProvider initialFavorites={state.favorites}>
          <GroceryStoreProvider initialItems={state.grocery}>
            <MealPlanStoreProvider initialPlan={state.plan}>
              <RecipeActionsProvider>
                <RecentlyViewedHydrator ids={state.recentlyViewed} />
                <AppShell>{children}</AppShell>
              </RecipeActionsProvider>
            </MealPlanStoreProvider>
          </GroceryStoreProvider>
        </FavoritesProvider>
      </RecipeStoreProvider>
    </CurrentUserProvider>
  );
}
