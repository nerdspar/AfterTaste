'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  BellIcon,
  UtensilsCrossedIcon,
  ShoppingCartIcon,
  StarIcon,
  StickyNoteIcon,
  SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';
import { useMealPlan, parsePlanEntry } from './MealPlanStoreProvider';
import { useRecipeStore } from './RecipeStoreProvider';
import { useGroceryStore } from './GroceryStoreProvider';
import { isRated } from '@/lib/analytics';
import { usePref, PREF_NOTIFICATIONS } from '@/lib/prefs';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

function todayKey(meal: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}_${meal}`;
}

interface MealLine {
  meal: string;
  label: string;
  href: string | null;
  note: boolean;
}

export function ActivityCenter() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { plan } = useMealPlan();
  const { recipes, getRecipe } = useRecipeStore();
  const { items } = useGroceryStore();
  const notificationsOn = usePref(PREF_NOTIFICATIONS, true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const todaysMeals: MealLine[] = mounted
    ? MEAL_TYPES.flatMap((meal): MealLine[] =>
        (plan[todayKey(meal)] ?? [])
          .map((value): MealLine | null => {
            const entry = parsePlanEntry(value);
            if (!entry) return null;
            if (entry.type === 'note')
              return { meal, label: entry.text, href: null, note: true };
            const recipe = getRecipe(entry.recipeId);
            return recipe
              ? {
                  meal,
                  label: recipe.title,
                  href: `/recipes/${recipe.id}`,
                  note: false,
                }
              : null;
          })
          .filter((m): m is MealLine => m !== null),
      )
    : [];

  const groceryLeft = items.filter((i) => !i.checked).length;
  const unrated = recipes.filter((r) => !isRated(r)).length;

  const count =
    mounted && notificationsOn
      ? todaysMeals.length + (groceryLeft > 0 ? 1 : 0) + (unrated > 0 ? 1 : 0)
      : 0;

  return (
    <div className="relative" ref={ref}>
      <IconButton aria-label="Activity" onClick={() => setOpen((o) => !o)}>
        <BellIcon className="w-[18px] h-[18px]" />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
            {count}
          </span>
        )}
      </IconButton>

      {open && (
        <div
          className={cn(
            // Mobile: fixed, spanning the width minus margins so it never
            // runs off-screen. Desktop: anchored under the bell.
            'fixed left-2 right-2 top-16 w-auto',
            'sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72',
            'z-50 rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
            'dark:border-gray-700 dark:bg-slate-900',
            'animate-in fade-in slide-in-from-top-1 duration-150',
          )}
        >
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Activity
            </p>
          </div>

          {!notificationsOn ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Activity is turned off.
              </p>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400"
              >
                <SettingsIcon className="w-3.5 h-3.5" /> Turn on in Settings
              </Link>
            </div>
          ) : count === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                You&apos;re all caught up 🎉
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto py-1">
              {todaysMeals.length > 0 && (
                <ActivityGroup label="Today's meals">
                  {todaysMeals.map((m, i) => {
                    const inner = (
                      <>
                        <span
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                            m.note
                              ? 'bg-amber-100 text-amber-500 dark:bg-amber-500/20'
                              : 'bg-primary-500/10 text-primary-500',
                          )}
                        >
                          {m.note ? (
                            <StickyNoteIcon className="w-3.5 h-3.5" />
                          ) : (
                            <UtensilsCrossedIcon className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            {m.meal}
                          </span>
                          <span className="block text-sm text-gray-900 dark:text-gray-100 truncate">
                            {m.label}
                          </span>
                        </span>
                      </>
                    );
                    return m.href ? (
                      <Link
                        key={`${m.meal}-${i}`}
                        href={m.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div
                        key={`${m.meal}-${i}`}
                        className="flex items-center gap-2.5 px-3 py-1.5"
                      >
                        {inner}
                      </div>
                    );
                  })}
                </ActivityGroup>
              )}

              {(groceryLeft > 0 || unrated > 0) && (
                <ActivityGroup label="Reminders">
                  {groceryLeft > 0 && (
                    <Link
                      href="/grocery-list"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-secondary-500/10 text-secondary-500 flex items-center justify-center flex-shrink-0">
                        <ShoppingCartIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {groceryLeft} grocery{' '}
                        {groceryLeft === 1 ? 'item' : 'items'} left
                      </span>
                    </Link>
                  )}
                  {unrated > 0 && (
                    <Link
                      href="/recipes"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-amber-400/15 text-amber-500 flex items-center justify-center flex-shrink-0">
                        <StarIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {unrated} {unrated === 1 ? 'recipe' : 'recipes'} to rate
                      </span>
                    </Link>
                  )}
                </ActivityGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      {children}
    </div>
  );
}
