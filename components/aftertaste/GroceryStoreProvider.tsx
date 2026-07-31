'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';
import { groceryItems, type GroceryItem } from '@/data/sample/recipes';

const STORAGE_KEY = 'aftertaste-grocery';

export interface NewGroceryItem {
  name: string;
  quantity?: string;
  category?: string;
  recipeId?: string;
  recipeTitle?: string;
}

function getDefaultGrocery(): GroceryItem[] {
  return groceryItems;
}

function loadGrocery(): GroceryItem[] {
  if (typeof window === 'undefined') return getDefaultGrocery();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as GroceryItem[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return getDefaultGrocery();
}

function saveGrocery(items: GroceryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

let groceryList: GroceryItem[] = loadGrocery();
let listeners: Array<() => void> = [];
let idCounter = 0;

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): GroceryItem[] {
  return groceryList;
}

// Must be a stable module-level constant — returning a fresh value here causes
// an infinite render loop with useSyncExternalStore.
const serverSnapshot = getDefaultGrocery();
function getServerSnapshot(): GroceryItem[] {
  return serverSnapshot;
}

function nextId(): string {
  idCounter += 1;
  return `g-${Date.now()}-${idCounter}`;
}

function toggleItem(id: string) {
  groceryList = groceryList.map((item) =>
    item.id === id ? { ...item, checked: !item.checked } : item,
  );
  saveGrocery(groceryList);
  emitChange();
}

function removeItem(id: string) {
  groceryList = groceryList.filter((item) => item.id !== id);
  saveGrocery(groceryList);
  emitChange();
}

// Adds items that aren't already on the list (case-insensitive by name) and
// returns how many were actually added.
function addItems(inputs: NewGroceryItem[]): number {
  const existing = new Set(
    groceryList.map((item) => item.name.trim().toLowerCase()),
  );
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
  groceryList = [...groceryList, ...toAdd];
  saveGrocery(groceryList);
  emitChange();
  return toAdd.length;
}

function addItem(input: NewGroceryItem): number {
  return addItems([input]);
}

// Replace the whole ordered list — used by drag-and-drop, which computes the
// new order (and any changed categories) and commits it in one shot.
function reorderItems(next: GroceryItem[]) {
  groceryList = next;
  saveGrocery(groceryList);
  emitChange();
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
  children,
}: {
  children: React.ReactNode;
}) {
  const items = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
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
