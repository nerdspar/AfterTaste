'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SearchIcon, ChevronLeftIcon } from 'lucide-react';
import { ActivityCenter } from './ActivityCenter';
import { AccountMenu } from './AccountMenu';

interface HeaderBarProps {
  className?: string;
}

// The logical parent of a drill-down screen, so "back" goes somewhere sensible
// regardless of how tangled the history got (e.g. after save). Top-level pages
// return null — you switch those from the bottom bar, not a back button.
function parentPath(p: string): string | null {
  if (/^\/recipes\/[^/]+\/edit$/.test(p)) return p.replace(/\/edit$/, '');
  if (p === '/recipes/new') return '/recipes';
  if (/^\/recipes\/[^/]+$/.test(p)) return '/recipes';
  return null;
}

export function HeaderBar({ className }: HeaderBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [placeholder, setPlaceholder] = useState('Search recipes...');

  const back = parentPath(pathname);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const update = () => {
      setPlaceholder(el.clientWidth < 190 ? 'Search' : 'Search recipes...');
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/recipes?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <header
      className={cn(
        'flex items-center gap-4 h-16 md:h-[72px] px-4 md:px-5',
        className,
      )}
    >
      {/* Mobile back button (only on drill-down screens) */}
      {back && (
        <Link
          href={back}
          aria-label="Back"
          className="md:hidden -ml-2 rounded-xl p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </Link>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="relative flex-1 min-w-0 max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <ActivityCenter />
        <AccountMenu />
      </div>
    </header>
  );
}
