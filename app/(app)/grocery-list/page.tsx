'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/aftertaste/Card';
import { cn } from '@/lib/utils';
import { useGroceryStore } from '@/components/aftertaste/GroceryStoreProvider';
import { shareOrCopy } from '@/lib/share';
import type { GroceryItem } from '@/data/sample/recipes';
import { PlusIcon, TrashIcon, CheckIcon, Share2Icon } from 'lucide-react';

export default function GroceryListPage() {
  const { items, addItem: addGroceryItem, toggleItem, removeItem } =
    useGroceryStore();
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newCategory, setNewCategory] = useState('Fruits & Vegetables');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const addItem = () => {
    if (!newName.trim()) return;
    addGroceryItem({
      name: newName,
      quantity: newQty,
      category: newCategory,
    });
    setNewName('');
    setNewQty('');
  };

  const checkedCount = items.filter((i) => i.checked).length;

  const categoryGroups = items.reduce<Record<string, GroceryItem[]>>(
    (acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    },
    {},
  );

  const allCategories = [
    'Fruits & Vegetables',
    'Dairy & Eggs',
    'Grains & Cereals',
    'Protein',
    'Spices & Seasonings',
    'Pantry Essentials',
  ];

  // Build a readable, grouped plain-text version of the list for export/share.
  const buildListText = () => {
    const lines: string[] = ['Grocery List', ''];
    for (const cat of allCategories) {
      const catItems = items.filter((i) => i.category === cat);
      if (catItems.length === 0) continue;
      lines.push(cat);
      for (const item of catItems) {
        const qty = item.quantity ? ` — ${item.quantity}` : '';
        lines.push(`${item.checked ? '✓' : '•'} ${item.name}${qty}`);
      }
      lines.push('');
    }
    return lines.join('\n').trim();
  };

  const shareList = async () => {
    if (items.length === 0) {
      setToast('Your list is empty');
      return;
    }
    const result = await shareOrCopy({
      title: 'Grocery List',
      text: buildListText(),
    });
    if (result === 'copied') setToast('List copied to clipboard');
    else if (result === 'error') setToast('Could not export list');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Grocery List
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main list */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4 gap-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Shopping List
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                  {checkedCount}/{items.length} done
                </span>
                <button
                  type="button"
                  onClick={shareList}
                  disabled={items.length === 0}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors',
                    'border border-gray-200 text-gray-600 hover:bg-gray-50',
                    'dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
                    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                  )}
                >
                  <Share2Icon className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{
                  width: items.length
                    ? `${(checkedCount / items.length) * 100}%`
                    : '0%',
                }}
              />
            </div>

            {/* Items */}
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 h-11 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                >
                  {/* Whole row toggles the item (single tap on mobile) */}
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="flex flex-1 items-center gap-3 h-full min-w-0 text-left"
                  >
                    <span
                      className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        item.checked
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-gray-300 dark:border-gray-600',
                      )}
                    >
                      {item.checked && (
                        <CheckIcon className="w-3 h-3 text-white" />
                      )}
                    </span>

                    <span
                      className={cn(
                        'text-sm flex-1 min-w-0 truncate transition-colors',
                        item.checked
                          ? 'line-through text-gray-400 dark:text-gray-500'
                          : 'text-gray-900 dark:text-gray-100 font-medium',
                      )}
                    >
                      {item.name}
                    </span>

                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
                      {item.quantity}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="flex-shrink-0 p-1 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    <TrashIcon className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            {items.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                Your grocery list is empty. Add items below.
              </p>
            )}
          </Card>

          {/* Add item form */}
          <Card>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
              Add Item
            </h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Item name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                className={cn(
                  'flex-1 min-w-[140px] h-9 px-3 rounded-lg text-sm',
                  'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
                )}
              />
              <input
                type="text"
                placeholder="Qty"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                className={cn(
                  'w-20 h-9 px-3 rounded-lg text-sm',
                  'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
                )}
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className={cn(
                  'h-9 px-2 rounded-lg text-sm',
                  'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
                )}
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addItem}
                className="h-9 px-4 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-1.5"
              >
                <PlusIcon className="w-4 h-4" />
                Add
              </button>
            </div>
          </Card>
        </div>

        {/* Categories sidebar */}
        <div className="space-y-3">
          {allCategories.map((cat) => {
            const catItems = categoryGroups[cat] ?? [];
            const done = catItems.filter((i) => i.checked).length;
            return (
              <Card key={cat}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {cat}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                    {done}/{catItems.length}
                  </span>
                </div>
                {catItems.length > 0 ? (
                  <div className="space-y-1">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full flex-shrink-0',
                            item.checked
                              ? 'bg-primary-500'
                              : 'bg-gray-300 dark:bg-gray-600',
                          )}
                        />
                        <span
                          className={cn(
                            item.checked
                              ? 'line-through text-gray-400 dark:text-gray-500'
                              : 'text-gray-600 dark:text-gray-400',
                          )}
                        >
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 dark:text-gray-600">
                    No items
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
}
