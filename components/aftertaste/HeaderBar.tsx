'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SearchIcon,
  BellIcon,
  SettingsIcon,
  ChevronDownIcon,
  MenuIcon,
} from 'lucide-react';
import { ThemeSwitch } from './ThemeSwitch';
import { IconButton } from './IconButton';
import { Avatar } from './Avatar';

interface HeaderBarProps {
  onMenuToggle?: () => void;
  className?: string;
}

export function HeaderBar({ onMenuToggle, className }: HeaderBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

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

      {/* Search */}
      <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search recipes..."
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
        <IconButton aria-label="Notifications">
          <BellIcon className="w-[18px] h-[18px]" />
        </IconButton>

        <IconButton aria-label="Settings">
          <SettingsIcon className="w-[18px] h-[18px]" />
        </IconButton>

        <div className="ml-1">
          <ThemeSwitch />
        </div>

        {/* User pill */}
        <button className="flex items-center gap-2 h-9 pl-1 pr-2.5 ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Avatar
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face"
            alt="John Doe"
            size="sm"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
            John D.
          </span>
          <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
