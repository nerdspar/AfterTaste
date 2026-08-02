'use client';

import { useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORIES, SOURCES } from '@/lib/recipe-options';

/** What a bulk edit can change. Undefined fields are left untouched. */
export interface BulkPatch {
  category?: string;
  source?: string;
}

const selectCls = cn(
  'h-8 px-2 rounded-lg text-xs',
  'border border-gray-200 bg-white text-gray-700',
  'dark:border-gray-700 dark:bg-slate-900 dark:text-gray-200',
  'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
);

/**
 * Wraps a recipe card/list item to make it tap-to-select. The card underneath
 * is click-disabled and a full-cover button captures the tap, so selection mode
 * never navigates into a recipe.
 */
export function SelectableRecipe({
  selected,
  onToggle,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          'rounded-2xl transition',
          selected &&
            'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-[#0B1220]',
        )}
      >
        <div className="pointer-events-none select-none">{children}</div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={selected ? 'Deselect recipe' : 'Select recipe'}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
      />
      <span
        className={cn(
          'pointer-events-none absolute left-3 top-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm transition',
          selected
            ? 'border-primary-500 bg-primary-500 text-white'
            : 'border-white bg-white/70 text-transparent dark:border-gray-200/70',
        )}
      >
        <CheckIcon className="h-4 w-4" />
      </span>
    </div>
  );
}

/** The action bar shown above the list while selection mode is active. */
export function BulkEditBar({
  count,
  total,
  onSelectAll,
  onClear,
  onCancel,
  onApply,
}: {
  count: number;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
  onCancel: () => void;
  onApply: (patch: BulkPatch) => void;
}) {
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const canApply = count > 0 && (category !== '' || source !== '');

  const apply = () => {
    if (!canApply) return;
    onApply({ category: category || undefined, source: source || undefined });
    setCategory('');
    setSource('');
  };

  return (
    <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/70 p-3 dark:border-primary-500/30 dark:bg-primary-500/10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {count} selected
        </span>
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs font-medium text-primary-700 hover:underline dark:text-primary-300"
        >
          Select all ({total})
        </button>
        {count > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-gray-500 hover:underline dark:text-gray-400"
          >
            Clear
          </button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            aria-label="Set category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectCls}
          >
            <option value="">Category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label="Set source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={selectCls}
          >
            <option value="">Source…</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={apply}
            disabled={!canApply}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold transition-colors',
              canApply
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
            )}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 rounded-lg text-xs font-medium text-gray-600 hover:bg-white/60 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Done
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Tap recipes to select, then set a category and/or source for all of them
        at once.
      </p>
    </div>
  );
}
