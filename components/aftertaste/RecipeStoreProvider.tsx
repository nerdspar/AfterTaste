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
  // Intentionally not swallowed: a failed write (e.g. storage quota exceeded by
  // a large step video) must surface so callers can tell the user instead of
  // silently losing the recipe.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
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

const serverSnapshot = dedupeById(getDefaultRecipes());
function getServerSnapshot(): Recipe[] {
  return serverSnapshot;
}

function addRecipe(recipe: Recipe) {
  const next = [recipe, ...recipeList];
  saveRecipes(next); // may throw (quota) — only commit in-memory on success
  recipeList = next;
  emitChange();
}

// Bulk add (e.g. Crouton import); skips ids/titles already present. Returns the
// number actually added. May throw (quota) — commit in-memory only on success.
function addRecipes(newRecipes: Recipe[]): number {
  const ids = new Set(recipeList.map((r) => r.id));
  const titles = new Set(recipeList.map((r) => r.title.trim().toLowerCase()));
  const toAdd: Recipe[] = [];
  for (const r of newRecipes) {
    const key = r.title.trim().toLowerCase();
    if (ids.has(r.id) || titles.has(key)) continue;
    ids.add(r.id);
    titles.add(key);
    toAdd.push(r);
  }
  if (toAdd.length === 0) return 0;
  const next = [...toAdd, ...recipeList];
  saveRecipes(next);
  recipeList = next;
  emitChange();
  return toAdd.length;
}

function updateRecipe(id: string, updates: Partial<Recipe>) {
  const next = recipeList.map((r) =>
    r.id === id ? { ...r, ...updates } : r,
  );
  saveRecipes(next); // may throw (quota) — only commit in-memory on success
  recipeList = next;
  emitChange();
}

function deleteRecipe(id: string) {
  const next = recipeList.filter((r) => r.id !== id);
  // Deleting frees storage, so a persistence hiccup shouldn't block removal.
  try {
    saveRecipes(next);
  } catch {}
  recipeList = next;
  emitChange();
}

interface RecipeStoreContextValue {
  recipes: Recipe[];
  getRecipe: (id: string) => Recipe | undefined;
  addRecipe: (recipe: Recipe) => void;
  addRecipes: (recipes: Recipe[]) => number;
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
    getServerSnapshot,
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
        addRecipes,
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
