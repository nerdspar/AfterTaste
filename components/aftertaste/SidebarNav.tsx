'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import {
  LayoutDashboardIcon,
  BookOpenIcon,
  ShoppingCartIcon,
  CalendarIcon,
  LineChartIcon,
  LogOutIcon,
  PlusIcon,
  ChevronDownIcon,
  GlobeIcon,
  FileTextIcon,
  UploadIcon,
  UtensilsIcon,
} from 'lucide-react';
import { ImportRecipeModal } from './ImportRecipeModal';
import { logout } from '@/app/(auth)/actions';
import { usePref, PREF_NUTRITION } from '@/lib/prefs';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Main Menu',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboardIcon },
      { label: 'My Recipes', href: '/recipes', icon: BookOpenIcon },
      { label: 'Grocery List', href: '/grocery-list', icon: ShoppingCartIcon },
      { label: 'Meal Planner', href: '/meal-planner', icon: CalendarIcon },
      { label: 'Insights', href: '/insights', icon: LineChartIcon },
    ],
  },
];

interface SidebarNavProps {
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({ onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();
  const nutritionOn = usePref(PREF_NUTRITION, false);
  // Food Log only appears once nutrition tracking is enabled (Settings).
  const groups: NavGroup[] = navGroups.map((g) =>
    g.title === 'Main Menu' && nutritionOn
      ? {
          ...g,
          items: [
            ...g.items,
            { label: 'Food Log', href: '/food-log', icon: UtensilsIcon },
          ],
        }
      : g,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [importModal, setImportModal] = useState<'url' | 'text' | 'file' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const importOptions = [
    { label: 'Import from URL', icon: GlobeIcon, key: 'url' as const },
    { label: 'Import from Text', icon: FileTextIcon, key: 'text' as const },
    { label: 'Import from File', icon: UploadIcon, key: 'file' as const },
  ];

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Brand */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-4 pt-5 pb-6"
      >
        <Logo className="w-8 h-8" />
        <span className="text-lg font-bold text-gray-900 dark:text-gray-50">
          <span className="text-primary-500">After</span>Taste
        </span>
      </Link>

      {/* Create Recipe CTA - split button */}
      <div className="px-4 mb-5 relative" ref={dropdownRef}>
        <div className="flex">
          <Link
            href="/recipes/new"
            onClick={onNavigate}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-11 px-5 text-sm font-medium',
              'bg-primary-500 text-white hover:bg-primary-600',
              'rounded-l-xl transition-colors',
            )}
          >
            <PlusIcon className="w-4 h-4" />
            Create Recipe
          </Link>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className={cn(
              'flex items-center justify-center w-10 h-11',
              'bg-primary-500 text-white hover:bg-primary-600',
              'rounded-r-xl border-l border-primary-400/40',
              'transition-colors',
            )}
            aria-label="Import recipe options"
          >
            <ChevronDownIcon
              className={cn(
                'w-4 h-4 transition-transform',
                dropdownOpen && 'rotate-180',
              )}
            />
          </button>
        </div>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            className={cn(
              'absolute left-4 right-4 top-full mt-1 z-30',
              'rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
              'dark:border-gray-700 dark:bg-slate-900',
            )}
          >
            {importOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setImportModal(opt.key);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700',
                  'hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
                  'transition-colors',
                )}
              >
                <opt.icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-5">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    pathname.startsWith(item.href + '/'));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium',
                      'transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30',
                      isActive
                        ? 'bg-primary-100/80 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60',
                    )}
                  >
                    <item.icon
                      className={cn(
                        'w-[18px] h-[18px] flex-shrink-0',
                        isActive
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-400 dark:text-gray-500',
                      )}
                    />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto h-5 px-1.5 rounded-full bg-secondary-100 text-secondary-600 dark:bg-secondary-500/20 dark:text-secondary-300 text-[11px] font-medium flex items-center">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60 transition-colors w-full"
          >
            <LogOutIcon className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500" />
            Log out
          </button>
        </form>
      </div>

      {/* Import modal */}
      <ImportRecipeModal
        open={importModal !== null}
        onClose={() => setImportModal(null)}
        initialTab={importModal ?? undefined}
      />
    </div>
  );
}
