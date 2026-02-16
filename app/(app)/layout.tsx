import { AppShell } from '@/components/aftertaste/AppShell';
import { FavoritesProvider } from '@/components/aftertaste/FavoritesProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FavoritesProvider>
      <AppShell>{children}</AppShell>
    </FavoritesProvider>
  );
}
