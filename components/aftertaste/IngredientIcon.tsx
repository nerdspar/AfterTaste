import { cn } from '@/lib/utils';
import {
  getIngredientEmoji,
  getIngredientMonogram,
} from '@/lib/ingredient-icon';

interface IngredientIconProps {
  name: string;
  className?: string;
}

/**
 * A small round icon for an ingredient, derived from its name: a matched emoji,
 * or a color-hashed monogram fallback. Tuned for ~28px; size via `className`.
 */
export function IngredientIcon({ name, className }: IngredientIconProps) {
  const emoji = getIngredientEmoji(name);

  if (emoji) {
    return (
      <span
        aria-hidden
        className={cn(
          'flex items-center justify-center rounded-full select-none',
          'bg-gray-100 text-[15px] leading-none dark:bg-gray-800',
          className,
        )}
      >
        {emoji}
      </span>
    );
  }

  const { letter, colorClass } = getIngredientMonogram(name);
  return (
    <span
      aria-hidden
      className={cn(
        'flex items-center justify-center rounded-full select-none',
        'text-[11px] font-bold leading-none',
        colorClass,
        className,
      )}
    >
      {letter}
    </span>
  );
}
