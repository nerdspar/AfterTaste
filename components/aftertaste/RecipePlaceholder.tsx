'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Fallback art for recipes without a photo: the AfterTaste "Split" tile. The
 * tile background follows light/dark mode; the split disc stays fixed. Fills
 * its (relatively positioned) container.
 */
export function RecipePlaceholder({ className }: { className?: string }) {
  const discId = `at-ph-${useId().replace(/:/g, '')}`;

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-[#f0d9cd] dark:bg-[#0B1220]',
        className,
      )}
    >
      <svg
        viewBox="0 0 608 608"
        className="w-2/5 max-w-[40%] min-w-[40px] aspect-square"
        role="img"
        aria-label="AfterTaste"
      >
        <defs>
          <clipPath id={discId}>
            <circle cx="304" cy="304" r="304" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${discId})`}>
          <rect x="0" y="0" width="608" height="608" fill="#b3502c" />
          <rect
            x="-1408"
            y="-1408"
            width="1662.7"
            height="3400"
            fill="#e5a184"
            transform="rotate(58 304 304)"
          />
        </g>
      </svg>
    </div>
  );
}
