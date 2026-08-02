'use client';

import Link from 'next/link';
import {
  XIcon,
  PlusIcon,
  DownloadIcon,
  SlidersHorizontalIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_DESTS } from './nav-items';
import { usePref, PREF_NUTRITION } from '@/lib/prefs';

export function MoreSheet({
  barIds,
  onClose,
}: {
  barIds: string[];
  onClose: () => void;
}) {
  const nutritionOn = usePref(PREF_NUTRITION, false);

  // Everything not already pinned to the bar (respecting the nutrition gate).
  const overflow = NAV_DESTS.filter(
    (d) => !barIds.includes(d.id) && (!d.requiresNutrition || nutritionOn),
  );

  const rowCls =
    'flex items-center gap-3 px-4 py-3 text-sm text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800/60';
  const iconWrap =
    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            More
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {overflow.length > 0 && (
          <div className="py-1">
            <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Go to
            </p>
            {overflow.map((d) => (
              <Link
                key={d.id}
                href={d.href}
                onClick={onClose}
                className={rowCls}
              >
                <span className={iconWrap}>
                  <d.Icon className="h-4 w-4" />
                </span>
                <span className="flex-1">{d.label}</span>
                <ChevronRightIcon className="h-4 w-4 text-gray-300 dark:text-gray-600" />
              </Link>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 py-1 dark:border-gray-800">
          <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Add
          </p>
          <Link href="/recipes/new" onClick={onClose} className={rowCls}>
            <span className={cn(iconWrap, 'bg-primary-500/10 text-primary-500')}>
              <PlusIcon className="h-4 w-4" />
            </span>
            <span className="flex-1">Create recipe</span>
          </Link>
          <Link href="/import" onClick={onClose} className={rowCls}>
            <span className={iconWrap}>
              <DownloadIcon className="h-4 w-4" />
            </span>
            <span className="flex-1">Import recipe</span>
          </Link>
          <Link
            href="/settings#tabs"
            onClick={onClose}
            className={cn(rowCls, 'border-t border-gray-100 dark:border-gray-800')}
          >
            <span className={iconWrap}>
              <SlidersHorizontalIcon className="h-4 w-4" />
            </span>
            <span className="flex-1">Customize tabs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
