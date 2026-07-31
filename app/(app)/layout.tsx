import { AppShell } from '@/components/aftertaste/AppShell';
import { FavoritesProvider } from '@/components/aftertaste/FavoritesProvider';
import { RecipeStoreProvider } from '@/components/aftertaste/RecipeStoreProvider';
import { GroceryStoreProvider } from '@/components/aftertaste/GroceryStoreProvider';
import { MealPlanStoreProvider } from '@/components/aftertaste/MealPlanStoreProvider';
import { RecipeActionsProvider } from '@/components/aftertaste/RecipeActionsProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RecipeStoreProvider>
      <FavoritesProvider>
        <GroceryStoreProvider>
          <MealPlanStoreProvider>
            <RecipeActionsProvider>
              <AppShell>{children}</AppShell>
            </RecipeActionsProvider>
          </MealPlanStoreProvider>
        </GroceryStoreProvider>
      </FavoritesProvider>
    </RecipeStoreProvider>
  );
}
