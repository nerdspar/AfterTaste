'use client';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import {
  recommendedRecipes,
  recentlyViewedRecipes,
  recentlyAddedRecipes,
} from '@/data/sample/recipes';

const STORAGE_KEY = 'aftertaste-favorites';

function getInitialFavorites(): Set<string> {
  const all = [...recommendedRecipes, ...recentlyViewedRecipes, ...recentlyAddedRecipes];
  return new Set(all.filter((r) => r.isFavorite).map((r) => r.id));
}

let favoritesSet: Set<string> = getInitialFavorites();
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): Set<string> {
  return favoritesSet;
}

function toggleFavorite(id: string) {
  const next = new Set(favoritesSet);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  favoritesSet = next;
  emitChange();
}

interface FavoritesContextValue {
  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, () => getInitialFavorites());

  const isFavorite = useCallback(
    (id: string) => favorites.has(id),
    [favorites],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
