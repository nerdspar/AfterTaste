import { AppShell } from '@/components/aftertaste/AppShell';
import { FavoritesProvider } from '@/components/aftertaste/FavoritesProvider';
import { RecipeStoreProvider } from '@/components/aftertaste/RecipeStoreProvider';
import { GroceryStoreProvider } from '@/components/aftertaste/GroceryStoreProvider';
import { MealPlanStoreProvider } from '@/components/aftertaste/MealPlanStoreProvider';
import { RecipeActionsProvider } from '@/components/aftertaste/RecipeActionsProvider';
import { RecentlyViewedHydrator } from '@/components/aftertaste/RecentlyViewedHydrator';
import { RealtimeSync } from '@/components/aftertaste/RealtimeSync';
import { CurrentUserProvider } from '@/components/aftertaste/CurrentUserProvider';
import { UserPrefsProvider } from '@/components/aftertaste/UserPrefsProvider';
import { PrefsInitializer } from '@/components/aftertaste/PrefsInitializer';
import { CookTimersProvider } from '@/components/aftertaste/CookTimersProvider';
import { loadHouseholdState, loadUserProfile } from '@/lib/data';
import { isReadOnly, READ_ONLY_MESSAGE } from '@/lib/read-only';

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
      <UserPrefsProvider initial={profile.prefs}>
      <PrefsInitializer />
      <RecipeStoreProvider initialRecipes={state.recipes}>
        <FavoritesProvider initialFavorites={state.favorites}>
          <GroceryStoreProvider initialItems={state.grocery}>
            <MealPlanStoreProvider initialPlan={state.plan}>
              <RecipeActionsProvider>
                <RecentlyViewedHydrator ids={state.recentlyViewed} />
                <RealtimeSync />
                {/* Above AppShell on purpose: timers have to outlive the page
                    you started them from. */}
                <CookTimersProvider>
                  {isReadOnly() && (
                    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                      {READ_ONLY_MESSAGE}
                    </div>
                  )}
                  <AppShell>{children}</AppShell>
                </CookTimersProvider>
              </RecipeActionsProvider>
            </MealPlanStoreProvider>
          </GroceryStoreProvider>
        </FavoritesProvider>
      </RecipeStoreProvider>
      </UserPrefsProvider>
    </CurrentUserProvider>
  );
}
