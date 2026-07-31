'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SearchIcon, SettingsIcon, MenuIcon } from 'lucide-react';
import { ThemeSwitch } from './ThemeSwitch';
import { IconButton } from './IconButton';
import { ActivityCenter } from './ActivityCenter';
import { AccountMenu, type AccountUser } from './AccountMenu';

interface HeaderBarProps {
  onMenuToggle?: () => void;
  className?: string;
  user: AccountUser;
}

export function HeaderBar({ onMenuToggle, className, user }: HeaderBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // Fall back to a shorter placeholder when the box is too narrow to fit the
  // full one (small phones), so it never truncates to "Search rec".
  const [placeholder, setPlaceholder] = useState('Search recipes...');

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const update = () => {
      // ~190px is the point below which "Search recipes..." starts to clip.
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
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Open menu"
      >
        <MenuIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Search — min-w-0 lets the field shrink instead of pushing the header
          wider than the viewport on small phones. */}
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

        <Link href="/settings">
          <IconButton aria-label="Settings">
            <SettingsIcon className="w-[18px] h-[18px]" />
          </IconButton>
        </Link>

        <div className="ml-1">
          <ThemeSwitch />
        </div>

        <AccountMenu user={user} />
      </div>
    </header>
  );
}
