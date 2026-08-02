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
  type DashboardColumn,
  type DashboardSectionMeta,
} from '@/lib/dashboard-sections';
import { useUserPrefs } from './UserPrefsProvider';

export function DashboardCustomizer() {
  const { prefs, set } = useUserPrefs();
  // Visible sections in order; fall back to the full default set.
  const shownIds =
    prefs.dashboardSections.length > 0
      ? prefs.dashboardSections.filter((id) => DASHBOARD_SECTION_BY_ID[id])
      : DEFAULT_DASHBOARD_SECTIONS;

  const hidden = DASHBOARD_SECTIONS.filter((s) => !shownIds.includes(s.id));

  // Move a section up/down, swapping only with its nearest neighbor in the SAME
  // column — the two dashboard columns are laid out independently.
  const move = (id: string, dir: -1 | 1) => {
    const col = DASHBOARD_SECTION_BY_ID[id].column;
    const flat = [...shownIds];
    const i = flat.indexOf(id);
    let j = i + dir;
    while (j >= 0 && j < flat.length && DASHBOARD_SECTION_BY_ID[flat[j]]?.column !== col) {
      j += dir;
    }
    if (j < 0 || j >= flat.length) return;
    [flat[i], flat[j]] = [flat[j], flat[i]];
    set({ dashboardSections: flat });
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
  const groupHead =
    'mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 first:mt-0';

  // Sections in a given column, in the user's saved order.
  const columnSections = (col: DashboardColumn): DashboardSectionMeta[] =>
    shownIds
      .map((id) => DASHBOARD_SECTION_BY_ID[id])
      .filter((s): s is DashboardSectionMeta => !!s && s.column === col);

  const renderShown = (sections: DashboardSectionMeta[]) => (
    <div className="space-y-2">
      {sections.map((s, i) => (
        <div key={s.id} className={rowCls}>
          <span className="flex-1">
            <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              {s.label}
            </span>
            <span className="block text-xs text-gray-400 dark:text-gray-500">
              {s.hint}
            </span>
          </span>
          <button
            type="button"
            className={ctrl}
            onClick={() => move(s.id, -1)}
            disabled={i === 0}
            aria-label={`Move ${s.label} up`}
          >
            <ChevronUpIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={ctrl}
            onClick={() => move(s.id, 1)}
            disabled={i === sections.length - 1}
            aria-label={`Move ${s.label} down`}
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(ctrl, 'hover:text-rose-500')}
            onClick={() => hide(s.id)}
            disabled={shownIds.length <= 1}
            aria-label={`Hide ${s.label}`}
          >
            <EyeOffIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );

  const main = columnSections('main');
  const rail = columnSections('rail');

  return (
    <div className="px-4 py-4">
      <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        Dashboard sections
      </p>
      <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
        Reorder or hide the sections on your home screen. On desktop the two
        groups sit side by side; on mobile they stack.
      </p>

      {main.length > 0 && (
        <>
          <p className={groupHead}>Main column</p>
          {renderShown(main)}
        </>
      )}

      {rail.length > 0 && (
        <>
          <p className={groupHead}>Side panel</p>
          {renderShown(rail)}
        </>
      )}

      {hidden.length > 0 && (
        <>
          <p className={groupHead}>Hidden</p>
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
