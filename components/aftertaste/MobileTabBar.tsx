'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_BY_ID } from './nav-items';
import { useTabConfig } from '@/lib/tab-config';
import { usePref, PREF_NUTRITION } from '@/lib/prefs';
import { MoreSheet } from './MoreSheet';

export function MobileTabBar() {
  const pathname = usePathname();
  const configIds = useTabConfig();
  const nutritionOn = usePref(PREF_NUTRITION, false);
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = configIds
    .map((id) => NAV_BY_ID[id])
    .filter((d) => d && (!d.requiresNutrition || nutritionOn));

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');
  const onOverflowPage = !tabs.some((d) => isActive(d.href));

  const tabCls = (active: boolean) =>
    cn(
      'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
      active
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-gray-400 dark:text-gray-500',
    );

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 flex md:hidden',
          'border-t border-gray-200/70 dark:border-white/10',
          'bg-white/75 backdrop-blur-xl dark:bg-slate-900/55',
          'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        {tabs.map((d) => {
          const active = isActive(d.href);
          return (
            <Link
              key={d.id}
              href={d.href}
              className={tabCls(active)}
              aria-current={active ? 'page' : undefined}
            >
              <d.Icon className="h-[22px] w-[22px]" />
              <span>{d.short}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={tabCls(onOverflowPage)}
        >
          <MoreHorizontalIcon className="h-[22px] w-[22px]" />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <MoreSheet barIds={configIds} onClose={() => setMoreOpen(false)} />
      )}
    </>
  );
}
