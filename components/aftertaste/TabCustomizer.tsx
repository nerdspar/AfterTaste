'use client';

import {
  ChevronUpIcon,
  ChevronDownIcon,
  XIcon,
  PlusIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_DESTS, NAV_BY_ID } from './nav-items';
import { useTabConfig, setTabConfig, MAX_TABS } from '@/lib/tab-config';
import { usePref, PREF_NUTRITION } from '@/lib/prefs';

export function TabCustomizer() {
  const ids = useTabConfig();
  const nutritionOn = usePref(PREF_NUTRITION, false);

  const chosen = ids.map((id) => NAV_BY_ID[id]).filter(Boolean);
  const available = NAV_DESTS.filter(
    (d) => !ids.includes(d.id) && (!d.requiresNutrition || nutritionOn),
  );

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    setTabConfig(next);
  };
  const remove = (id: string) => setTabConfig(ids.filter((x) => x !== id));
  const add = (id: string) => {
    if (ids.length >= MAX_TABS) return;
    setTabConfig([...ids, id]);
  };

  const rowCls =
    'flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700/60 dark:bg-slate-800/50';
  const iconWrap =
    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500';
  const ctrl =
    'rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700';

  return (
    <div className="px-4 py-4">
      <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        Bottom tabs
      </p>
      <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
        Pick up to {MAX_TABS} tabs and order them. More always fills the last
        slot and holds the rest.
      </p>

      <div className="space-y-2">
        {chosen.map((d, i) => (
          <div key={d.id} className={rowCls}>
            <span className={iconWrap}>
              <d.Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              {d.label}
            </span>
            <button
              type="button"
              className={ctrl}
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Move ${d.label} up`}
            >
              <ChevronUpIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={ctrl}
              onClick={() => move(i, 1)}
              disabled={i === chosen.length - 1}
              aria-label={`Move ${d.label} down`}
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(ctrl, 'hover:text-rose-500')}
              onClick={() => remove(d.id)}
              disabled={chosen.length <= 1}
              aria-label={`Remove ${d.label}`}
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {available.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {ids.length >= MAX_TABS ? 'In the More menu' : 'Add a tab'}
          </p>
          <div className="space-y-2">
            {available.map((d) => (
              <div key={d.id} className={cn(rowCls, 'opacity-90')}>
                <span
                  className={cn(
                    iconWrap,
                    'bg-gray-100 text-gray-400 dark:bg-gray-800',
                  )}
                >
                  <d.Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                  {d.label}
                </span>
                <button
                  type="button"
                  className={cn(ctrl, 'hover:text-primary-600')}
                  onClick={() => add(d.id)}
                  disabled={ids.length >= MAX_TABS}
                  aria-label={`Add ${d.label}`}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {ids.length >= MAX_TABS && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Remove a tab above to add another.
            </p>
          )}
        </>
      )}
    </div>
  );
}
