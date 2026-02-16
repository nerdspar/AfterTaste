'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpDownIcon, CheckIcon } from 'lucide-react';
import type { SortOption } from '@/lib/recipe-filters';

interface SortDropdownProps {
  options: SortOption[];
  value: SortOption | null;
  onChange: (sort: SortOption | null) => void;
}

export function SortDropdown({ options, value, onChange }: SortDropdownProps) {
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium',
          'border transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30',
          value
            ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-500/10 dark:border-primary-500/40 dark:text-primary-300'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-slate-900 dark:border-gray-700/40 dark:text-gray-400 dark:hover:border-gray-600',
        )}
      >
        <ArrowUpDownIcon className="w-3.5 h-3.5" />
        {value ? value.label : 'Sort'}
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full right-0 z-50 mt-1 min-w-[220px] max-h-72 overflow-y-auto',
            'rounded-xl border border-gray-200 bg-white shadow-lg',
            'dark:border-gray-700/40 dark:bg-slate-900',
            'p-1.5',
          )}
        >
          {/* Clear sort */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors mb-1"
            >
              Clear sort
            </button>
          )}

          {options.map((opt) => {
            const isActive =
              value?.field === opt.field &&
              value?.direction === opt.direction;
            return (
              <button
                key={`${opt.field}-${opt.direction}`}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs text-left',
                  'transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60',
                )}
              >
                {opt.label}
                {isActive && <CheckIcon className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
