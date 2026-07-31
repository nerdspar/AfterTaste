import { AppShell } from '@/components/aftertaste/AppShell';
import { FavoritesProvider } from '@/components/aftertaste/FavoritesProvider';
import { RecipeStoreProvider } from '@/components/aftertaste/RecipeStoreProvider';
import { GroceryStoreProvider } from '@/components/aftertaste/GroceryStoreProvider';
import { MealPlanStoreProvider } from '@/components/aftertaste/MealPlanStoreProvider';
import { RecipeActionsProvider } from '@/components/aftertaste/RecipeActionsProvider';
import { requireSession } from '@/lib/session';
import { auth } from '@/auth';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate the app (defense in depth alongside middleware) and surface the
  // signed-in user to the header.
  await requireSession();
  const session = await auth();
  const user = {
    name: session?.user?.name ?? session?.user?.email ?? 'Account',
    email: session?.user?.email ?? '',
    image: session?.user?.image ?? null,
  };

  return (
    <RecipeStoreProvider>
      <FavoritesProvider>
        <GroceryStoreProvider>
          <MealPlanStoreProvider>
            <RecipeActionsProvider>
              <AppShell user={user}>{children}</AppShell>
            </RecipeActionsProvider>
          </MealPlanStoreProvider>
        </GroceryStoreProvider>
      </FavoritesProvider>
    </RecipeStoreProvider>
  );
}
