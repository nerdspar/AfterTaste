'use client';

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from 'react';
import {
  recommendedRecipes,
  recentlyViewedRecipes,
  recentlyAddedRecipes,
  type Recipe,
} from '@/data/sample/recipes';

const STORAGE_KEY = 'aftertaste-recipes';

function getDefaultRecipes(): Recipe[] {
  return [...recommendedRecipes, ...recentlyViewedRecipes, ...recentlyAddedRecipes];
}

function dedupeById(recipes: Recipe[]): Recipe[] {
  const seen = new Set<string>();
  return recipes.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

function loadRecipes(): Recipe[] {
  if (typeof window === 'undefined') return dedupeById(getDefaultRecipes());
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Recipe[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return dedupeById(getDefaultRecipes());
}

function saveRecipes(recipes: Recipe[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch {}
}

let recipeList: Recipe[] = loadRecipes();
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

function getSnapshot(): Recipe[] {
  return recipeList;
}

function addRecipe(recipe: Recipe) {
  recipeList = [recipe, ...recipeList];
  saveRecipes(recipeList);
  emitChange();
}

function updateRecipe(id: string, updates: Partial<Recipe>) {
  recipeList = recipeList.map((r) =>
    r.id === id ? { ...r, ...updates } : r,
  );
  saveRecipes(recipeList);
  emitChange();
}

function deleteRecipe(id: string) {
  recipeList = recipeList.filter((r) => r.id !== id);
  saveRecipes(recipeList);
  emitChange();
}

interface RecipeStoreContextValue {
  recipes: Recipe[];
  getRecipe: (id: string) => Recipe | undefined;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
}

const RecipeStoreContext = createContext<RecipeStoreContextValue | null>(null);

export function RecipeStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const recipes = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => dedupeById(getDefaultRecipes()),
  );

  const getRecipeById = useCallback(
    (id: string) => recipes.find((r) => r.id === id),
    [recipes],
  );

  return (
    <RecipeStoreContext.Provider
      value={{
        recipes,
        getRecipe: getRecipeById,
        addRecipe,
        updateRecipe,
        deleteRecipe,
      }}
    >
      {children}
    </RecipeStoreContext.Provider>
  );
}

export function useRecipeStore() {
  const ctx = useContext(RecipeStoreContext);
  if (!ctx)
    throw new Error('useRecipeStore must be used within RecipeStoreProvider');
  return ctx;
}
