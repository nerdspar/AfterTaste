import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: boolean;
}

export function Card({
  children,
  className,
  padding = true,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white shadow-sm',
        'dark:border-gray-700/40 dark:bg-slate-900',
        'transition-colors',
        padding && 'p-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
