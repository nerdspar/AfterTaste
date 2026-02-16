import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      {actionLabel && (
        <button
          onClick={onAction}
          className="text-xs font-medium text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
