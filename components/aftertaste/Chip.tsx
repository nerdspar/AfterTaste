'use client';

import { cn } from '@/lib/utils';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Chip({ label, selected = false, onClick, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center h-7 px-3 rounded-full text-xs font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30 focus-visible:ring-offset-2',
        selected
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
        className,
      )}
    >
      {label}
    </button>
  );
}
