'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * AfterTaste "Split" mark. Rendered as inline SVG so it follows the theme
 * accent: the tile and the two halves of the split disc use primary color
 * shades, so the logo recolors live when the accent changes in Settings.
 */
export function Logo({ className }: { className?: string }) {
  // Unique clip id per instance (colons from useId aren't url()-fragment safe).
  const discId = `at-disc-${useId().replace(/:/g, '')}`;

  return (
    <svg
      viewBox="0 0 1024 1024"
      className={cn('block', className)}
      role="img"
      aria-label="AfterTaste"
    >
      <defs>
        <clipPath id={discId}>
          <circle cx="512" cy="512" r="304" />
        </clipPath>
      </defs>

      {/* Rounded tile — light accent tint in light mode, page background in
          dark mode so it blends into the dark UI. */}
      <rect
        x="0"
        y="0"
        width="1024"
        height="1024"
        rx="232"
        ry="232"
        className="fill-primary-100 dark:fill-[#0B1220]"
      />

      {/* Split disc — dark base with a lighter diagonal half */}
      <g clipPath={`url(#${discId})`}>
        <rect
          x="208"
          y="208"
          width="608"
          height="608"
          className="fill-primary-700"
        />
        <rect
          x="-1200"
          y="-1200"
          width="1662.7"
          height="3400"
          transform="rotate(58 512 512)"
          className="fill-primary-300"
        />
      </g>
    </svg>
  );
}
