import { AppShell } from '@/components/aftertaste/AppShell';
import { FavoritesProvider } from '@/components/aftertaste/FavoritesProvider';
import { RecipeStoreProvider } from '@/components/aftertaste/RecipeStoreProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RecipeStoreProvider>
      <FavoritesProvider>
        <AppShell>{children}</AppShell>
      </FavoritesProvider>
    </RecipeStoreProvider>
  );
}
