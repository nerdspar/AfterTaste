import { cn } from '@/lib/utils';
import { StarIcon, StarHalfIcon } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function RatingStars({
  rating,
  count,
  size = 'sm',
  className,
}: RatingStarsProps) {
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const filled = Math.floor(rating);
  const hasHalf = rating - filled >= 0.25 && rating - filled < 0.75;
  const roundUp = rating - filled >= 0.75;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => {
          const isFilled = i < filled || (roundUp && i === filled);
          const isHalf = hasHalf && i === filled;

          if (isHalf) {
            return (
              <div key={i} className="relative">
                <StarIcon
                  className={cn(
                    starSize,
                    'fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600',
                  )}
                />
                <StarHalfIcon
                  className={cn(
                    starSize,
                    'absolute inset-0 fill-amber-400 text-amber-400',
                  )}
                />
              </div>
            );
          }

          return (
            <StarIcon
              key={i}
              className={cn(
                starSize,
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600',
              )}
            />
          );
        })}
      </div>
      <span className="text-xs tabular-nums text-gray-600 dark:text-gray-400">
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          ({count})
        </span>
      )}
    </div>
  );
}
