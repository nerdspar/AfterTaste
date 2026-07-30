'use client';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import {
  recommendedRecipes,
  recentlyViewedRecipes,
  recentlyAddedRecipes,
} from '@/data/sample/recipes';

const STORAGE_KEY = 'aftertaste-favorites';

function getDefaultFavorites(): Set<string> {
  const all = [...recommendedRecipes, ...recentlyViewedRecipes, ...recentlyAddedRecipes];
  return new Set(all.filter((r) => r.isFavorite).map((r) => r.id));
}

function loadFavorites(): Set<string> {
  if (typeof window === 'undefined') return getDefaultFavorites();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored) as string[]);
  } catch {}
  return getDefaultFavorites();
}

function saveFavorites(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

let favoritesSet: Set<string> = loadFavorites();
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
  saveFavorites(next);
  emitChange();
}

interface FavoritesContextValue {
  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, () => getDefaultFavorites());

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
