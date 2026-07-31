'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { GroceryItem } from '@/data/sample/recipes';
import {
  addGroceryItemsAction,
  toggleGroceryItemAction,
  removeGroceryItemAction,
  reorderGroceryItemsAction,
} from '@/app/(app)/data-actions';

export interface NewGroceryItem {
  name: string;
  quantity?: string;
  category?: string;
  recipeId?: string;
  recipeTitle?: string;
}

function reportError(op: string, err: unknown) {
  console.error(`[grocery] ${op} failed`, err);
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `g-${Date.now()}-${idCounter}`;
}

interface GroceryStoreContextValue {
  items: GroceryItem[];
  addItem: (input: NewGroceryItem) => number;
  addItems: (inputs: NewGroceryItem[]) => number;
  toggleItem: (id: string) => void;
  removeItem: (id: string) => void;
  reorderItems: (next: GroceryItem[]) => void;
}

const GroceryStoreContext = createContext<GroceryStoreContextValue | null>(null);

export function GroceryStoreProvider({
  initialItems,
  children,
}: {
  initialItems: GroceryItem[];
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<GroceryItem[]>(initialItems);

  // Adds items that aren't already on the list (case-insensitive by name) and
  // returns how many were actually added.
  const addItems = useCallback(
    (inputs: NewGroceryItem[]): number => {
      const existing = new Set(items.map((i) => i.name.trim().toLowerCase()));
      const toAdd: GroceryItem[] = [];
      for (const input of inputs) {
        const name = input.name.trim();
        const key = name.toLowerCase();
        if (!name || existing.has(key)) continue;
        existing.add(key);
        toAdd.push({
          id: nextId(),
          name,
          quantity: (input.quantity ?? '').trim() || '1',
          checked: false,
          category: input.category || 'Pantry Essentials',
          ...(input.recipeId ? { recipeId: input.recipeId } : {}),
          ...(input.recipeTitle ? { recipeTitle: input.recipeTitle } : {}),
        });
      }
      if (toAdd.length === 0) return 0;
      setItems((prev) => [...prev, ...toAdd]);
      addGroceryItemsAction(toAdd).catch((err) => {
        reportError('addItems', err);
        const addedIds = new Set(toAdd.map((i) => i.id));
        setItems((prev) => prev.filter((i) => !addedIds.has(i.id)));
      });
      return toAdd.length;
    },
    [items],
  );

  const addItem = useCallback(
    (input: NewGroceryItem) => addItems([input]),
    [addItems],
  );

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
    toggleGroceryItemAction(id).catch((err) => {
      reportError('toggleItem', err);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item,
        ),
      );
    });
  }, []);

  const removeItem = useCallback(
    (id: string) => {
      const removed = items.find((i) => i.id === id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      removeGroceryItemAction(id).catch((err) => {
        reportError('removeItem', err);
        if (removed) setItems((prev) => [...prev, removed]);
      });
    },
    [items],
  );

  // Replace the whole ordered list — used by drag-and-drop, which computes the
  // new order (and any changed categories) and commits it in one shot.
  const reorderItems = useCallback(
    (next: GroceryItem[]) => {
      const prevItems = items;
      setItems(next);
      reorderGroceryItemsAction(next).catch((err) => {
        reportError('reorderItems', err);
        setItems(prevItems);
      });
    },
    [items],
  );

  return (
    <GroceryStoreContext.Provider
      value={{ items, addItem, addItems, toggleItem, removeItem, reorderItems }}
    >
      {children}
    </GroceryStoreContext.Provider>
  );
}

export function useGroceryStore() {
  const ctx = useContext(GroceryStoreContext);
  if (!ctx)
    throw new Error('useGroceryStore must be used within GroceryStoreProvider');
  return ctx;
}
