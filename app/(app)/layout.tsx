import { AppShell } from '@/components/aftertaste/AppShell';
import { FavoritesProvider } from '@/components/aftertaste/FavoritesProvider';
import { RecipeStoreProvider } from '@/components/aftertaste/RecipeStoreProvider';
import { GroceryStoreProvider } from '@/components/aftertaste/GroceryStoreProvider';
import { MealPlanStoreProvider } from '@/components/aftertaste/MealPlanStoreProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RecipeStoreProvider>
      <FavoritesProvider>
        <GroceryStoreProvider>
          <MealPlanStoreProvider>
            <AppShell>{children}</AppShell>
          </MealPlanStoreProvider>
        </GroceryStoreProvider>
      </FavoritesProvider>
    </RecipeStoreProvider>
  );
}
