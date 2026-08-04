'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon } from 'lucide-react';
import { ActivityCenter } from './ActivityCenter';
import { AccountMenu } from './AccountMenu';
import { GlobalSearch } from './GlobalSearch';

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
  const pathname = usePathname();
  const back = parentPath(pathname);

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

      {/* Search — live typeahead across the whole recipe */}
      <GlobalSearch />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <ActivityCenter />
        <AccountMenu />
      </div>
    </header>
  );
}
