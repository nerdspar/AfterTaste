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
  XIcon,
  CheckCheckIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';
import { useMealPlan, parsePlanEntry } from './MealPlanStoreProvider';
import { useRecipeStore } from './RecipeStoreProvider';
import { useGroceryStore } from './GroceryStoreProvider';
import { isRated } from '@/lib/analytics';
import { usePref, PREF_NOTIFICATIONS } from '@/lib/prefs';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
const DISMISSED_KEY = 'aftertaste-dismissed-activity';

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Notif =
  | {
      key: string;
      kind: 'meal';
      meal: string;
      label: string;
      href: string | null;
      note: boolean;
    }
  | { key: string; kind: 'grocery'; count: number }
  | { key: string; kind: 'unrated'; count: number };

export function ActivityCenter() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const { plan } = useMealPlan();
  const { recipes, getRecipe } = useRecipeStore();
  const { items } = useGroceryStore();
  const notificationsOn = usePref(PREF_NOTIFICATIONS, true);

  // Load dismissed keys once on the client.
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore
    }
  }, []);

  // Persist, pruning to today's meal keys + the stable reminder keys so the
  // store can't grow without bound.
  function persist(next: Set<string>) {
    try {
      const today = todayStr();
      const keep = [...next].filter(
        (k) => k === 'g' || k === 'u' || k.startsWith(`m:${today}:`),
      );
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(keep));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const groceryLeft = items.filter((i) => !i.checked).length;
  const unrated = recipes.filter((r) => !isRated(r)).length;

  // A dismissed reminder should come back the next time it becomes relevant, so
  // clear its dismissal once the underlying count returns to zero.
  useEffect(() => {
    setDismissed((prev) => {
      if (
        (groceryLeft === 0 && prev.has('g')) ||
        (unrated === 0 && prev.has('u'))
      ) {
        const next = new Set(prev);
        if (groceryLeft === 0) next.delete('g');
        if (unrated === 0) next.delete('u');
        persist(next);
        return next;
      }
      return prev;
    });
  }, [groceryLeft, unrated]);

  const today = todayStr();
  const notifs: Notif[] = mounted
    ? [
        ...MEAL_TYPES.flatMap((meal): Notif[] =>
          (plan[`${today}_${meal}`] ?? [])
            .map((value): Notif | null => {
              const entry = parsePlanEntry(value);
              if (!entry) return null;
              if (entry.type === 'note')
                return {
                  key: `m:${today}:${meal}:note:${entry.text}`,
                  kind: 'meal',
                  meal,
                  label: entry.text,
                  href: null,
                  note: true,
                };
              const recipe = getRecipe(entry.recipeId);
              return recipe
                ? {
                    key: `m:${today}:${meal}:${recipe.id}`,
                    kind: 'meal',
                    meal,
                    label: recipe.title,
                    href: `/recipes/${recipe.id}`,
                    note: false,
                  }
                : null;
            })
            .filter((n): n is Notif => n !== null),
        ),
        ...(groceryLeft > 0
          ? [{ key: 'g', kind: 'grocery', count: groceryLeft } as Notif]
          : []),
        ...(unrated > 0
          ? [{ key: 'u', kind: 'unrated', count: unrated } as Notif]
          : []),
      ]
    : [];

  const visible = notifs.filter((n) => !dismissed.has(n.key));
  const meals = visible.filter((n) => n.kind === 'meal');
  const reminders = visible.filter((n) => n.kind !== 'meal');
  const count = mounted && notificationsOn ? visible.length : 0;

  function dismiss(key: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      persist(next);
      return next;
    });
  }

  function markAllRead() {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const n of visible) next.add(n.key);
      persist(next);
      return next;
    });
  }

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
            'fixed left-2 right-2 top-16 w-auto',
            'sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72',
            'z-50 rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
            'dark:border-gray-700 dark:bg-slate-900',
            'animate-in fade-in slide-in-from-top-1 duration-150',
          )}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Activity
            </p>
            {notificationsOn && count > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <CheckCheckIcon className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
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
              {meals.length > 0 && (
                <ActivityGroup label="Today's meals">
                  {meals.map((m) => {
                    if (m.kind !== 'meal') return null;
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
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            {m.meal}
                          </span>
                          <span className="block text-sm text-gray-900 dark:text-gray-100 truncate">
                            {m.label}
                          </span>
                        </span>
                      </>
                    );
                    return (
                      <NotifRow key={m.key} onDismiss={() => dismiss(m.key)}>
                        {m.href ? (
                          <Link
                            href={m.href}
                            onClick={() => setOpen(false)}
                            className="flex min-w-0 flex-1 items-center gap-2.5"
                          >
                            {inner}
                          </Link>
                        ) : (
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            {inner}
                          </div>
                        )}
                      </NotifRow>
                    );
                  })}
                </ActivityGroup>
              )}

              {reminders.length > 0 && (
                <ActivityGroup label="Reminders">
                  {reminders.map((r) => {
                    if (r.kind === 'grocery') {
                      return (
                        <NotifRow key={r.key} onDismiss={() => dismiss(r.key)}>
                          <Link
                            href="/grocery-list"
                            onClick={() => setOpen(false)}
                            className="flex min-w-0 flex-1 items-center gap-2.5"
                          >
                            <span className="w-7 h-7 rounded-lg bg-secondary-500/10 text-secondary-500 flex items-center justify-center flex-shrink-0">
                              <ShoppingCartIcon className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {r.count} grocery {r.count === 1 ? 'item' : 'items'}{' '}
                              left
                            </span>
                          </Link>
                        </NotifRow>
                      );
                    }
                    return (
                      <NotifRow key={r.key} onDismiss={() => dismiss(r.key)}>
                        <Link
                          href="/recipes"
                          onClick={() => setOpen(false)}
                          className="flex min-w-0 flex-1 items-center gap-2.5"
                        >
                          <span className="w-7 h-7 rounded-lg bg-amber-400/15 text-amber-500 flex items-center justify-center flex-shrink-0">
                            <StarIcon className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {r.count} {r.count === 1 ? 'recipe' : 'recipes'} to
                            rate
                          </span>
                        </Link>
                      </NotifRow>
                    );
                  })}
                </ActivityGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotifRow({
  children,
  onDismiss,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div className="group flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
      {children}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 rounded p-1 text-gray-300 hover:bg-gray-200 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
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
