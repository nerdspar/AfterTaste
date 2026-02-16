import { cn } from '@/lib/utils';
import { ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 text-xs', className)}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && (
              <ChevronRightIcon className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-gray-500 dark:text-gray-400 hover:text-secondary-500 dark:hover:text-secondary-400 transition-colors truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'truncate',
                  isLast
                    ? 'text-gray-400 dark:text-gray-500 max-w-[200px]'
                    : 'text-gray-500 dark:text-gray-400',
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
