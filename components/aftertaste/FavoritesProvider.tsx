'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { setFavoriteAction } from '@/app/(app)/data-actions';

function reportError(op: string, err: unknown) {
  console.error(`[favorites] ${op} failed`, err);
}

interface FavoritesContextValue {
  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  /** Replace the whole set (used by realtime sync). */
  replaceFavorites: (ids: string[]) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({
  initialFavorites,
  children,
}: {
  initialFavorites: string[];
  children: React.ReactNode;
}) {
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(initialFavorites),
  );

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const toggleFavorite = useCallback(
    (id: string) => {
      const willFavorite = !favorites.has(id);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (willFavorite) next.add(id);
        else next.delete(id);
        return next;
      });
      setFavoriteAction(id, willFavorite).catch((err) => {
        reportError('toggleFavorite', err);
        setFavorites((prev) => {
          const next = new Set(prev);
          if (willFavorite) next.delete(id);
          else next.add(id);
          return next;
        });
      });
    },
    [favorites],
  );

  const replaceFavorites = useCallback(
    (ids: string[]) => setFavorites(new Set(ids)),
    [],
  );

  return (
    <FavoritesContext.Provider
      value={{ favorites, isFavorite, toggleFavorite, replaceFavorites }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
