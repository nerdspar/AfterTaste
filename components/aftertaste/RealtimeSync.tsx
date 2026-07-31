'use client';

import { useEffect } from 'react';
import { useRecipeStore } from './RecipeStoreProvider';
import { useFavorites } from './FavoritesProvider';
import { useGroceryStore } from './GroceryStoreProvider';
import { useMealPlan } from './MealPlanStoreProvider';
import { useCurrentUser } from './CurrentUserProvider';

// Subscribes to the household's SSE stream and applies other members' changes
// live by refetching the affected slice. Renders nothing.
export function RealtimeSync() {
  const { id: myId } = useCurrentUser();
  const { replaceRecipes } = useRecipeStore();
  const { replaceFavorites } = useFavorites();
  const { replaceItems } = useGroceryStore();
  const { replacePlan } = useMealPlan();

  useEffect(() => {
    const es = new EventSource('/api/events');

    es.onmessage = async (e) => {
      let msg: { scope?: string; actor?: string };
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      const { scope, actor } = msg;
      if (!scope || scope === 'connected') return;
      if (actor === myId) return; // skip our own changes

      try {
        const res = await fetch(`/api/state?scope=${scope}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (scope === 'recipes') {
          if (data.recipes) replaceRecipes(data.recipes);
          if (data.favorites) replaceFavorites(data.favorites);
        } else if (scope === 'favorites') {
          if (data.favorites) replaceFavorites(data.favorites);
        } else if (scope === 'grocery') {
          if (data.grocery) replaceItems(data.grocery);
        } else if (scope === 'mealplan') {
          if (data.plan) replacePlan(data.plan);
        }
      } catch {
        /* transient — the next event or a reload will resync */
      }
    };

    // EventSource auto-reconnects on connection drop.
    return () => es.close();
  }, [myId, replaceRecipes, replaceFavorites, replaceItems, replacePlan]);

  return null;
}
