import { AppShell } from '@/components/aftertaste/AppShell';
import { FavoritesProvider } from '@/components/aftertaste/FavoritesProvider';
import { RecipeStoreProvider } from '@/components/aftertaste/RecipeStoreProvider';
import { GroceryStoreProvider } from '@/components/aftertaste/GroceryStoreProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RecipeStoreProvider>
      <FavoritesProvider>
        <GroceryStoreProvider>
          <AppShell>{children}</AppShell>
        </GroceryStoreProvider>
      </FavoritesProvider>
    </RecipeStoreProvider>
  );
}
