'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecipeStore } from './RecipeStoreProvider';
import { searchRecipes, matchSnippet } from '@/lib/recipe-search';

const MAX_RESULTS = 8;

const WHERE_LABEL: Record<string, string> = {
  ingredient: 'Ingredient',
  step: 'Step',
  tag: 'Tag',
  section: 'Section',
  notes: 'Notes',
  description: 'Description',
  cuisine: 'Cuisine',
  source: 'Source',
  chef: 'Chef',
};

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { recipes } = useRecipeStore();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placeholder, setPlaceholder] = useState('Search recipes...');
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Live results (client-side; the whole collection is already in the store).
  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 1) return [];
    return searchRecipes(recipes, q).slice(0, MAX_RESULTS);
  }, [query, recipes]);
  const total = useMemo(() => {
    const q = query.trim();
    return q ? searchRecipes(recipes, q).length : 0;
  }, [query, recipes]);

  const showDropdown = open && query.trim().length > 0;

  // Responsive placeholder (narrow header on small phones).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const update = () =>
      setPlaceholder(el.clientWidth < 190 ? 'Search' : 'Search recipes...');
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Reset when navigating away.
  useEffect(() => {
    setQuery('');
    setOpen(false);
  }, [pathname]);

  useEffect(() => setActive(0), [query]);

  const go = (id: string) => {
    setOpen(false);
    setQuery('');
    router.push(`/recipes/${id}`);
  };
  const seeAll = () => {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/recipes?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length, a + 1)); // last index = "See all"
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active < results.length) go(results[active].id);
      else seeAll();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0 max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          seeAll();
        }}
        className="relative"
      >
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="global-search-results"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full h-10 pl-9 pr-4 rounded-full text-sm',
            'bg-gray-100 dark:bg-gray-800/60',
            'border border-transparent focus:border-secondary-500/40',
            'text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-secondary-500/20',
            'transition-colors',
          )}
        />
      </form>

      {showDropdown && (
        <div
          id="global-search-results"
          role="listbox"
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden',
            'rounded-2xl border border-gray-200 bg-white shadow-xl',
            'dark:border-gray-700/60 dark:bg-slate-900',
          )}
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              No recipes match “{query.trim()}”.
            </p>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto py-1.5">
              {results.map((r, i) => {
                const snip = matchSnippet(r, query);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active === i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left',
                        active === i && 'bg-gray-100 dark:bg-gray-800/60',
                      )}
                    >
                      <span className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                        {r.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {r.title}
                        </span>
                        {snip ? (
                          <span className="block truncate text-xs text-gray-400 dark:text-gray-500">
                            <span className="font-medium text-gray-500 dark:text-gray-400">
                              {WHERE_LABEL[snip.where] ?? snip.where}:
                            </span>{' '}
                            {snip.text}
                          </span>
                        ) : (
                          <span className="block truncate text-xs text-gray-400 dark:text-gray-500">
                            {r.category}
                            {r.cuisine ? ` · ${r.cuisine}` : ''}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {total > 0 && (
            <button
              type="button"
              role="option"
              aria-selected={active === results.length}
              onMouseEnter={() => setActive(results.length)}
              onClick={seeAll}
              className={cn(
                'flex w-full items-center justify-between border-t border-gray-100 px-4 py-2.5 text-left text-xs font-medium dark:border-gray-800',
                active === results.length
                  ? 'bg-gray-100 dark:bg-gray-800/60'
                  : '',
              )}
            >
              <span className="text-primary-600 dark:text-primary-400">
                See all {total} result{total === 1 ? '' : 's'}
              </span>
              <span className="text-gray-400">Enter ↵</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
