'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/aftertaste/Card';
import { cn } from '@/lib/utils';
import { useGroceryStore } from '@/components/aftertaste/GroceryStoreProvider';
import { shareOrCopy } from '@/lib/share';
import {
  guessGroceryCategory,
  GROCERY_CATEGORIES,
} from '@/lib/grocery-category';
import type { GroceryItem } from '@/data/sample/recipes';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  Share2Icon,
  ListIcon,
  LayoutListIcon,
  GripVerticalIcon,
  BookOpenIcon,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const GROUPED_KEY = 'aftertaste-grocery-grouped';
const SECTIONS: readonly string[] = GROCERY_CATEGORIES;

// Stable, section-ordered view of the list — used for grouped rendering and as
// the drag-and-drop order.
function groupByCategory(items: GroceryItem[]): GroceryItem[] {
  const ordered: GroceryItem[] = [];
  for (const cat of SECTIONS) {
    for (const item of items) if (item.category === cat) ordered.push(item);
  }
  // Anything with an unrecognised category trails at the end, in place.
  for (const item of items) {
    if (!SECTIONS.includes(item.category)) ordered.push(item);
  }
  return ordered;
}

interface RowProps {
  item: GroceryItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

function SortableRow({ item, onToggle, onRemove }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1.5 h-11 pr-1 rounded-lg bg-white dark:bg-slate-900 group',
        'hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors',
        isDragging && 'shadow-lg ring-1 ring-primary-500/30',
      )}
    >
      {/* Drag handle — only this starts a drag, so tapping the row still toggles */}
      <button
        type="button"
        aria-label={`Reorder ${item.name}`}
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-1 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVerticalIcon className="w-4 h-4" />
      </button>

      {/* Whole area toggles the item (single tap) */}
      <button
        type="button"
        onClick={() => onToggle(item.id)}
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
          {item.checked && <CheckIcon className="w-3 h-3 text-white" />}
        </span>
        <span
          className={cn(
            'text-sm min-w-0 truncate transition-colors',
            item.checked
              ? 'line-through text-gray-400 dark:text-gray-500'
              : 'text-gray-900 dark:text-gray-100 font-medium',
          )}
        >
          {item.name}
        </span>
      </button>

      {/* Recipe chip — opens the source recipe without toggling the item */}
      {item.recipeId && (
        <Link
          href={`/recipes/${item.recipeId}`}
          onClick={(e) => e.stopPropagation()}
          title={item.recipeTitle}
          aria-label={`Open recipe ${item.recipeTitle ?? ''}`}
          className={cn(
            'flex items-center gap-1 flex-shrink-0 max-w-[40%] rounded-full px-2 py-0.5',
            'bg-gray-100 text-gray-500 hover:text-primary-600',
            'dark:bg-gray-800 dark:text-gray-400 dark:hover:text-primary-400',
            'text-[11px] transition-colors',
          )}
        >
          <BookOpenIcon className="w-3 h-3 flex-shrink-0" />
          <span className="truncate hidden sm:inline">{item.recipeTitle}</span>
        </Link>
      )}

      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
        {item.quantity}
      </span>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.name}`}
        className="flex-shrink-0 p-1 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
      >
        <TrashIcon className="w-3.5 h-3.5 text-red-400" />
      </button>
    </li>
  );
}

export default function GroceryListPage() {
  const { items, addItem, toggleItem, removeItem, reorderItems } =
    useGroceryStore();
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  // Default to grouped (matches SSR); restore the saved preference on mount.
  const [grouped, setGrouped] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(GROUPED_KEY);
    if (saved === 'flat') setGrouped(false);
    else if (saved === 'grouped') setGrouped(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const setGroupedPref = (next: boolean) => {
    setGrouped(next);
    try {
      localStorage.setItem(GROUPED_KEY, next ? 'grouped' : 'flat');
    } catch {}
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const checkedCount = items.filter((i) => i.checked).length;
  const visualItems = grouped ? groupByCategory(items) : items;

  const presentCategories = [
    ...SECTIONS.filter((c) => visualItems.some((i) => i.category === c)),
    ...[...new Set(visualItems.map((i) => i.category))].filter(
      (c) => !SECTIONS.includes(c),
    ),
  ];

  const add = () => {
    if (!newName.trim()) return;
    addItem({
      name: newName,
      quantity: newQty,
      category: guessGroceryCategory(newName),
    });
    setNewName('');
    setNewQty('');
  };

  const buildListText = () => {
    const lines: string[] = ['Grocery List', ''];
    const cats = [
      ...SECTIONS,
      ...[...new Set(items.map((i) => i.category))].filter(
        (c) => !SECTIONS.includes(c),
      ),
    ];
    for (const cat of cats) {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visualItems.findIndex((i) => i.id === active.id);
    const newIndex = visualItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    let next = arrayMove(visualItems, oldIndex, newIndex);
    if (grouped) {
      // Dropping onto an item in another section moves it into that section.
      const targetCategory = visualItems[newIndex].category;
      next = next.map((i) =>
        i.id === active.id ? { ...i, category: targetCategory } : i,
      );
    }
    reorderItems(next);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Grocery List
      </h1>

      <Card>
        {/* Header: title + view toggle + share */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Shopping List
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
              <button
                type="button"
                aria-label="Group by section"
                aria-pressed={grouped}
                onClick={() => setGroupedPref(true)}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  grouped
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                )}
              >
                <LayoutListIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Single list"
                aria-pressed={!grouped}
                onClick={() => setGroupedPref(false)}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  !grouped
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                )}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={shareList}
              disabled={items.length === 0}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors',
                'border border-gray-200 text-gray-600 hover:bg-gray-50',
                'dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
              )}
            >
              <Share2Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-1.5 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{
                width: items.length
                  ? `${(checkedCount / items.length) * 100}%`
                  : '0%',
              }}
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
            {checkedCount}/{items.length} done
          </span>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            Your grocery list is empty. Add items below.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visualItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {grouped ? (
                <div className="space-y-4">
                  {presentCategories.map((cat) => {
                    const catItems = visualItems.filter(
                      (i) => i.category === cat,
                    );
                    const done = catItems.filter((i) => i.checked).length;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1 px-1">
                          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            {cat}
                          </h3>
                          <span className="text-[11px] text-gray-300 dark:text-gray-600 tabular-nums">
                            {done}/{catItems.length}
                          </span>
                        </div>
                        <ul className="space-y-0.5">
                          {catItems.map((item) => (
                            <SortableRow
                              key={item.id}
                              item={item}
                              onToggle={toggleItem}
                              onRemove={removeItem}
                            />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {visualItems.map((item) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      onToggle={toggleItem}
                      onRemove={removeItem}
                    />
                  ))}
                </ul>
              )}
            </SortableContext>
          </DndContext>
        )}
      </Card>

      {/* Add item */}
      <Card className="mt-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
          Add Item
        </h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Item name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
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
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className={cn(
              'w-20 h-9 px-3 rounded-lg text-sm',
              'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
            )}
          />
          <button
            type="button"
            onClick={add}
            className="h-9 px-4 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            Add
          </button>
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
          New items are filed into a section automatically — drag to move them.
        </p>
      </Card>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
}
