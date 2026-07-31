'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { Recipe } from '@/data/sample/recipes';
import {
  createRecipeAction,
  createRecipesAction,
  updateRecipeAction,
  deleteRecipeAction,
} from '@/app/(app)/data-actions';

function reportError(op: string, err: unknown) {
  console.error(`[recipes] ${op} failed`, err);
}

interface RecipeStoreContextValue {
  recipes: Recipe[];
  getRecipe: (id: string) => Recipe | undefined;
  addRecipe: (recipe: Recipe) => void;
  addRecipes: (recipes: Recipe[]) => number;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  /** Replace the whole list (used by realtime sync). */
  replaceRecipes: (recipes: Recipe[]) => void;
}

const RecipeStoreContext = createContext<RecipeStoreContextValue | null>(null);

export function RecipeStoreProvider({
  initialRecipes,
  children,
}: {
  initialRecipes: Recipe[];
  children: React.ReactNode;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);

  const getRecipe = useCallback(
    (id: string) => recipes.find((r) => r.id === id),
    [recipes],
  );

  const addRecipe = useCallback((recipe: Recipe) => {
    setRecipes((prev) => [recipe, ...prev]);
    createRecipeAction(recipe).catch((err) => {
      reportError('addRecipe', err);
      setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    });
  }, []);

  // Bulk add (e.g. Crouton import); skips ids/titles already present. Returns
  // the number actually added — computed against the current snapshot so the
  // count is available synchronously.
  const addRecipes = useCallback(
    (newRecipes: Recipe[]): number => {
      const ids = new Set(recipes.map((r) => r.id));
      const titles = new Set(recipes.map((r) => r.title.trim().toLowerCase()));
      const toAdd: Recipe[] = [];
      for (const r of newRecipes) {
        const key = r.title.trim().toLowerCase();
        if (ids.has(r.id) || titles.has(key)) continue;
        ids.add(r.id);
        titles.add(key);
        toAdd.push(r);
      }
      if (toAdd.length === 0) return 0;
      setRecipes((prev) => [...toAdd, ...prev]);
      createRecipesAction(toAdd).catch((err) => {
        reportError('addRecipes', err);
        const addedIds = new Set(toAdd.map((r) => r.id));
        setRecipes((prev) => prev.filter((r) => !addedIds.has(r.id)));
      });
      return toAdd.length;
    },
    [recipes],
  );

  const updateRecipe = useCallback(
    (id: string, updates: Partial<Recipe>) => {
      const prevRecipe = recipes.find((r) => r.id === id);
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
      updateRecipeAction(id, updates).catch((err) => {
        reportError('updateRecipe', err);
        if (prevRecipe) {
          setRecipes((prev) => prev.map((r) => (r.id === id ? prevRecipe : r)));
        }
      });
    },
    [recipes],
  );

  const deleteRecipe = useCallback(
    (id: string) => {
      const removed = recipes.find((r) => r.id === id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      deleteRecipeAction(id).catch((err) => {
        reportError('deleteRecipe', err);
        if (removed) setRecipes((prev) => [removed, ...prev]);
      });
    },
    [recipes],
  );

  const replaceRecipes = useCallback((next: Recipe[]) => setRecipes(next), []);

  return (
    <RecipeStoreContext.Provider
      value={{
        recipes,
        getRecipe,
        addRecipe,
        addRecipes,
        updateRecipe,
        deleteRecipe,
        replaceRecipes,
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
