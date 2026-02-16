'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, XIcon, SlidersHorizontalIcon } from 'lucide-react';
import type { FilterConfig, ActiveFilters } from '@/lib/recipe-filters';

// ---------------------------------------------------------------------------
// FilterDropdown – a single multi-select dropdown for one filter category
// ---------------------------------------------------------------------------

interface FilterDropdownProps {
  config: FilterConfig;
  selected: string[];
  onChange: (key: string, values: string[]) => void;
}

function FilterDropdown({ config, selected, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSelection = selected.length > 0;

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(config.key, next);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium',
          'border transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30',
          hasSelection
            ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-500/10 dark:border-primary-500/40 dark:text-primary-300'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-slate-900 dark:border-gray-700/40 dark:text-gray-400 dark:hover:border-gray-600',
        )}
      >
        {config.label}
        {hasSelection && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] font-bold">
            {selected.length}
          </span>
        )}
        <ChevronDownIcon
          className={cn(
            'w-3.5 h-3.5 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full left-0 z-50 mt-1 min-w-[180px] max-h-64 overflow-y-auto',
            'rounded-xl border border-gray-200 bg-white shadow-lg',
            'dark:border-gray-700/40 dark:bg-slate-900',
            'p-1.5',
          )}
        >
          {config.options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={cn(
                  'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-left',
                  'transition-colors',
                  isSelected
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60',
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isSelected
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-gray-300 dark:border-gray-600',
                  )}
                >
                  {isSelected && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterBar – renders all filter dropdowns + active filter pills
// ---------------------------------------------------------------------------

interface FilterBarProps {
  configs: FilterConfig[];
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
}

export function FilterBar({ configs, filters, onChange }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...configs].sort((a, b) => a.order - b.order);

  const totalActive = Object.values(filters).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  function handleFilterChange(key: string, values: string[]) {
    const next = { ...filters, [key]: values };
    if (values.length === 0) delete next[key];
    onChange(next);
  }

  function removeFilter(key: string, value: string) {
    const current = filters[key] ?? [];
    const next = current.filter((v) => v !== value);
    handleFilterChange(key, next);
  }

  function clearAll() {
    onChange({});
  }

  // Find label for a filter value
  function getOptionLabel(key: string, value: string): string {
    const config = configs.find((c) => c.key === key);
    const opt = config?.options.find((o) => o.value === value);
    return opt?.label ?? value;
  }

  function getFilterLabel(key: string): string {
    return configs.find((c) => c.key === key)?.label ?? key;
  }

  return (
    <div className="space-y-2">
      {/* Toggle + dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium',
            'border transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30',
            totalActive > 0
              ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-500/10 dark:border-primary-500/40 dark:text-primary-300'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-slate-900 dark:border-gray-700/40 dark:text-gray-400 dark:hover:border-gray-600',
          )}
        >
          <SlidersHorizontalIcon className="w-3.5 h-3.5" />
          Filters
          {totalActive > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] font-bold">
              {totalActive}
            </span>
          )}
        </button>

        {expanded &&
          sorted.map((config) => (
            <FilterDropdown
              key={config.key}
              config={config}
              selected={filters[config.key] ?? []}
              onChange={handleFilterChange}
            />
          ))}

        {totalActive > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-1"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {totalActive > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(filters).map(([key, values]) =>
            values.map((value) => (
              <span
                key={`${key}-${value}`}
                className={cn(
                  'inline-flex items-center gap-1 h-6 pl-2.5 pr-1.5 rounded-full text-[11px] font-medium',
                  'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300',
                  'border border-primary-200 dark:border-primary-500/30',
                )}
              >
                <span className="text-gray-400 dark:text-gray-500 mr-0.5">
                  {getFilterLabel(key)}:
                </span>
                {getOptionLabel(key, value)}
                <button
                  type="button"
                  onClick={() => removeFilter(key, value)}
                  className="ml-0.5 rounded-full hover:bg-primary-200/60 dark:hover:bg-primary-500/20 p-0.5 transition-colors"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            )),
          )}
        </div>
      )}
    </div>
  );
}
