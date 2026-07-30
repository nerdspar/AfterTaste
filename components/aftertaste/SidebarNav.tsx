'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboardIcon,
  BookOpenIcon,
  ShoppingCartIcon,
  CalendarIcon,
  BarChart3Icon,
  LineChartIcon,
  LogOutIcon,
  PlusIcon,
  UtensilsCrossedIcon,
} from 'lucide-react';
import { Button } from './Button';

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
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Scoring', href: '/scoring', icon: BarChart3Icon },
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

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Brand */}
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-4 pt-5 pb-6">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
          <UtensilsCrossedIcon className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-gray-50">
          <span className="text-primary-500">After</span>Taste
        </span>
      </Link>

      {/* Create Recipe CTA */}
      <div className="px-4 mb-5">
        <Link href="/recipes/new" onClick={onNavigate}>
          <Button variant="primary" size="lg" fullWidth className="gap-2" type="button">
            <PlusIcon className="w-4 h-4" />
            Create Recipe
          </Button>
        </Link>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

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
        <button className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60 transition-colors w-full">
          <LogOutIcon className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500" />
          Log out
        </button>
      </div>
    </div>
  );
}
