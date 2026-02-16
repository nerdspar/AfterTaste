'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { categories } from '@/data/sample/recipes';

export function CategoryTiles() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={cat.slug === 'favorites' ? '/recipes?tab=Favorites' : `/recipes?tab=${cat.label}`}
          className={cn(
            'flex flex-col items-center justify-center flex-shrink-0',
            'w-[120px] h-16 rounded-2xl',
            'border border-gray-200 bg-white',
            'dark:border-gray-700/40 dark:bg-slate-900',
            'hover:border-primary-300 hover:-translate-y-0.5',
            'dark:hover:border-primary-500/40',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30',
          )}
        >
          <span className="text-xl mb-0.5">{cat.icon}</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {cat.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
