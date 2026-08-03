'use client';

import {
  ChevronUpIcon,
  ChevronDownIcon,
  EyeOffIcon,
  PlusIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DASHBOARD_SECTIONS,
  DASHBOARD_SECTION_BY_ID,
  DEFAULT_DASHBOARD_SECTIONS,
} from '@/lib/dashboard-sections';
import { useUserPrefs } from './UserPrefsProvider';

export function DashboardCustomizer() {
  const { prefs, set } = useUserPrefs();
  // Visible sections in order (this IS the mobile order); fall back to default.
  const shownIds =
    prefs.dashboardSections.length > 0
      ? prefs.dashboardSections.filter((id) => DASHBOARD_SECTION_BY_ID[id])
      : DEFAULT_DASHBOARD_SECTIONS;

  const shown = shownIds.map((id) => DASHBOARD_SECTION_BY_ID[id]);
  const hidden = DASHBOARD_SECTIONS.filter((s) => !shownIds.includes(s.id));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= shownIds.length) return;
    const next = [...shownIds];
    [next[i], next[j]] = [next[j], next[i]];
    set({ dashboardSections: next });
  };
  const hide = (id: string) => {
    if (shownIds.length <= 1) return; // keep at least one section
    set({ dashboardSections: shownIds.filter((x) => x !== id) });
  };
  const show = (id: string) => set({ dashboardSections: [...shownIds, id] });

  const rowCls =
    'flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700/60 dark:bg-slate-800/50';
  const ctrl =
    'rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700';

  return (
    <div className="px-4 py-4">
      <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        Dashboard sections
      </p>
      <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
        This is the order on mobile. On desktop, sections tagged{' '}
        <span className="font-medium text-gray-500 dark:text-gray-400">
          Side panel
        </span>{' '}
        move to the right column, keeping their order.
      </p>

      <div className="space-y-2">
        {shown.map((s, i) => (
          <div key={s.id} className={rowCls}>
            <span className="flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {s.label}
                </span>
                {s.column === 'rail' && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                    Side panel
                  </span>
                )}
              </span>
              <span className="block text-xs text-gray-400 dark:text-gray-500">
                {s.hint}
              </span>
            </span>
            <button
              type="button"
              className={ctrl}
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Move ${s.label} up`}
            >
              <ChevronUpIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={ctrl}
              onClick={() => move(i, 1)}
              disabled={i === shown.length - 1}
              aria-label={`Move ${s.label} down`}
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(ctrl, 'hover:text-rose-500')}
              onClick={() => hide(s.id)}
              disabled={shown.length <= 1}
              aria-label={`Hide ${s.label}`}
            >
              <EyeOffIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {hidden.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Hidden
          </p>
          <div className="space-y-2">
            {hidden.map((s) => (
              <div key={s.id} className={cn(rowCls, 'opacity-90')}>
                <span className="flex-1">
                  <span className="block text-sm text-gray-600 dark:text-gray-300">
                    {s.label}
                  </span>
                  <span className="block text-xs text-gray-400 dark:text-gray-500">
                    {s.hint}
                  </span>
                </span>
                <button
                  type="button"
                  className={cn(ctrl, 'hover:text-primary-600')}
                  onClick={() => show(s.id)}
                  aria-label={`Show ${s.label}`}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
