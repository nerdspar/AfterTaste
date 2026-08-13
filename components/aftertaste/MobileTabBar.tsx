'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_BY_ID } from './nav-items';
import { useUserPrefs } from './UserPrefsProvider';
import { MoreSheet } from './MoreSheet';
import { ImportRecipeModal } from './ImportRecipeModal';

export function MobileTabBar() {
  const pathname = usePathname();
  const { prefs } = useUserPrefs();
  const configIds = prefs.tabs;
  const nutritionOn = prefs.nutrition;
  const [moreOpen, setMoreOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const tabs = configIds
    .map((id) => NAV_BY_ID[id])
    .filter((d) => d && (!d.requiresNutrition || nutritionOn));

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');
  const onOverflowPage = !tabs.some((d) => isActive(d.href));

  const tabCls = (active: boolean) =>
    cn(
      'flex flex-1 flex-col items-center justify-center gap-[3px] text-[10px] font-medium transition-colors',
      active
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-gray-400 dark:text-gray-500',
    );

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 md:hidden',
          'border-t border-gray-200/70 dark:border-white/10',
          'bg-white/75 backdrop-blur-xl dark:bg-slate-900/55',
          // A fixed gap below the content band, in place of the full
          // home-indicator safe area (which made the bar sit too tall).
          'pb-4',
        )}
      >
        {/* Fixed 56px content band (iOS tab bars are ~49pt), items centered. */}
        <div className="flex h-14">
          {tabs.map((d) => {
            const active = isActive(d.href);
            return (
              <Link
                key={d.id}
                href={d.href}
                className={tabCls(active)}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => {
                  // Tapping the tab you're already on returns to its root: a
                  // sub-route or filtered view navigates back (Link handles
                  // that); at the exact root, scroll to the top.
                  if (
                    active &&
                    window.location.pathname === d.href &&
                    window.location.search === ''
                  ) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                <d.Icon className="h-6 w-6" />
                <span>{d.short}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={tabCls(onOverflowPage)}
          >
            <MoreHorizontalIcon className="h-6 w-6" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <MoreSheet
          barIds={configIds}
          onClose={() => setMoreOpen(false)}
          onImport={() => {
            setMoreOpen(false);
            setImportOpen(true);
          }}
        />
      )}

      <ImportRecipeModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}
