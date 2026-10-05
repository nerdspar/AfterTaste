'use client';

// The run of show, and the oven.
//
// The hard part of a party is not the cooking, it is that six dishes want one
// oven at six temperatures and everything has to land at the same time. So
// this screen does two things: lists the day in order, and draws what the oven
// is doing, because the oven is where the plan actually breaks.
//
// It suggests and never moves. Every time in a party plan was put there by a
// person for a reason — the turkey rests while the sides go in, the bread
// proves while you shower — and an app that quietly reshuffles them is an app
// you stop trusting with the one day of the year you cannot redo.

import { useState } from 'react';
import {
  PlusIcon,
  Trash2Icon,
  AlertTriangleIcon,
  FlameIcon,
  CheckIcon,
  HourglassIcon,
  WandSparklesIcon,
} from 'lucide-react';
import {
  parseClock,
  formatClock,
  findClashes,
  ovenLanes,
  groupByDay,
  timelineWindow,
  barGeometry,
  packRows,
  layBackFrom,
  type ScheduledTask,
} from '@/lib/party-schedule';
import type { PartyTaskView, PartyDishView, PartyGuestView } from '@/lib/party-types';
import { cn } from '@/lib/utils';

interface Props {
  tasks: PartyTaskView[];
  dishes: PartyDishView[];
  guests: PartyGuestView[];
  serveTime: string;
  onAdd: (input: { label: string; dayOffset: number; at: string | null; dishId: string | null }) => void;
  onUpdate: (taskId: string, patch: Partial<PartyTaskView>) => void;
  onDelete: (taskId: string) => void;
}

const RESOURCES = [
  { value: 'none', label: 'Hands' },
  { value: 'oven', label: 'Oven' },
  { value: 'burner', label: 'Burner' },
  { value: 'mixer', label: 'Mixer' },
];

const DAY_OFFSETS = [
  { value: -2, label: 'Two days before' },
  { value: -1, label: 'The day before' },
  { value: 0, label: 'Party day' },
];

function dayLabel(offset: number): string {
  const known = DAY_OFFSETS.find((d) => d.value === offset);
  if (known) return known.label;
  return offset < 0 ? `${Math.abs(offset)} days before` : `${offset} days after`;
}

/** The view rows as the scheduling maths needs to see them. */
function toScheduled(tasks: PartyTaskView[], dishes: PartyDishView[]): ScheduledTask[] {
  const nameOf = (id: string | null) =>
    id ? dishes.find((d) => d.id === id)?.name : undefined;
  return tasks.map((t) => ({
    id: t.id,
    label: t.label,
    dayOffset: t.dayOffset,
    startMin: parseClock(t.at),
    durationMin: t.durationMin,
    passive: t.passive,
    resource: t.resource,
    ovenTempF: t.ovenTempF,
    dishName: nameOf(t.dishId),
  }));
}

export function PartySchedule({
  tasks, dishes, guests, serveTime, onAdd, onUpdate, onDelete,
}: Props) {
  const [draft, setDraft] = useState('');
  const [draftDay, setDraftDay] = useState(0);
  const [draftAt, setDraftAt] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const scheduled = toScheduled(tasks, dishes);
  const clashes = findClashes(scheduled);
  const serveMin = parseClock(serveTime) ?? 18 * 60;
  const dayOf = scheduled.filter((t) => t.dayOffset === 0);
  const lanes = ovenLanes(dayOf);
  const window = timelineWindow(dayOf.filter((t) => t.resource === 'oven'), serveMin);
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const submit = () => {
    const label = draft.trim();
    if (!label) return;
    onAdd({ label, dayOffset: draftDay, at: draftAt || null, dishId: null });
    setDraft('');
    setDraftAt('');
  };

  /**
   * Lay a dish's tasks back from the serve time, in the order they are listed.
   * Offered per dish rather than globally: working back is only meaningful for
   * a chain of steps that ends on the table.
   */
  const workBack = (dishId: string) => {
    const chain = tasks
      .filter((t) => t.dishId === dishId && t.dayOffset === 0)
      .sort((a, b) => a.position - b.position);
    if (chain.length === 0) return;
    const placed = layBackFrom(serveMin, chain);
    for (const t of chain) {
      const at = placed.get(t.id);
      if (at != null) onUpdate(t.id, { at: formatClock(at) });
    }
  };

  // Only offered where there is a chain to lay back. A dish with one task has
  // nothing to work back from — that is just setting a time.
  const chainedDishes = dishes.filter(
    (d) => tasks.filter((t) => t.dishId === d.id && t.dayOffset === 0).length > 1,
  );

  return (
    <div className="space-y-5">
      {clashes.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangleIcon className="h-4 w-4" />
            {clashes.length === 1 ? 'One collision' : `${clashes.length} collisions`}
          </p>
          <ul className="space-y-1.5">
            {clashes.map((c, i) => (
              <li key={`${c.a.id}-${c.b.id}-${i}`} className="text-xs text-amber-900/90 dark:text-amber-200/90">
                <span className="font-medium">{c.a.label}</span> and{' '}
                <span className="font-medium">{c.b.label}</span>{' '}
                {c.reason === 'temperature'
                  ? `want the oven at ${c.a.ovenTempF ?? '?'}° and ${c.b.ovenTempF ?? '?'}°`
                  : `both want the ${c.resource}`}{' '}
                at {formatClock(c.atMin)}.
                {c.suggestMin != null && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => {
                        // Suggested, then applied by hand — the app never
                        // moves a time on its own.
                        const later = (c.a.startMin ?? 0) >= (c.b.startMin ?? 0) ? c.a : c.b;
                        onUpdate(later.id, { at: formatClock(c.suggestMin as number) });
                      }}
                      className="font-semibold underline decoration-dotted underline-offset-2"
                    >
                      Move the later one to {formatClock(c.suggestMin)}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {lanes.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            <FlameIcon className="h-3.5 w-3.5" />
            The oven, party day
          </h3>
          <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700/40">
            <div className="mb-1.5 flex justify-between text-[10px] tabular-nums text-gray-400">
              <span>{formatClock(window.startMin)}</span>
              <span className="font-medium text-gray-500 dark:text-gray-400">
                serving {formatClock(serveMin)}
              </span>
              <span>{formatClock(window.endMin)}</span>
            </div>
            <div className="space-y-1.5">
              {lanes.map((lane) =>
                // Concurrent trays at one temperature get their own row, or
                // they draw on top of each other and say nothing.
                packRows(lane.tasks).map((row, rowIndex) => (
                  <div key={`${lane.tempF}-${rowIndex}`} className="flex items-center gap-2">
                    <span className="w-11 flex-none text-right text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                      {rowIndex === 0 ? (lane.tempF != null ? `${lane.tempF}°` : '—') : ''}
                    </span>
                    <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                      {row.map((t) => {
                        const geo = barGeometry(t, window);
                        if (!geo) return null;
                        return (
                          <span
                            key={t.id}
                            title={`${t.label} — ${formatClock(t.startMin as number)}`}
                            style={{ left: `${geo.leftPct}%`, width: `${geo.widthPct}%` }}
                            className="absolute inset-y-0 flex items-center overflow-hidden rounded-md bg-primary-500 px-1.5 text-[10px] font-medium text-white"
                          >
                            <span className="truncate">{t.dishName ?? t.label}</span>
                          </span>
                        );
                      })}
                      {/* The serve time, so you can see the work converge on it. */}
                      <span
                        aria-hidden
                        style={{
                          left: `${((serveMin - window.startMin) / (window.endMin - window.startMin)) * 100}%`,
                        }}
                        className="absolute inset-y-0 w-px bg-gray-900/40 dark:bg-gray-100/40"
                      />
                    </div>
                  </div>
                )),
              )}
            </div>
          </div>
        </section>
      )}

      {chainedDishes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chainedDishes.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => workBack(d.id)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              title={`Place ${d.name}'s steps so the last one lands at ${serveTime}`}
            >
              <WandSparklesIcon className="h-3 w-3" />
              Work {d.name} back from serving
            </button>
          ))}
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
          Nothing scheduled. &ldquo;Dough out of the fridge at 3&rdquo;, &ldquo;turkey in at 1&rdquo;.
        </p>
      ) : (
        groupByDay(scheduled).map((day) => (
          <section key={day.dayOffset}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {dayLabel(day.dayOffset)}
            </h3>
            <ul className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700/40">
              {[...day.timed, ...day.untimed].map((s) => {
                const task = byId.get(s.id);
                if (!task) return null;
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    dishName={s.dishName}
                    guests={guests}
                    expanded={open === task.id}
                    onExpand={() => setOpen(open === task.id ? null : task.id)}
                    onUpdate={(patch) => onUpdate(task.id, patch)}
                    onDelete={() => onDelete(task.id)}
                  />
                );
              })}
            </ul>
          </section>
        ))
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Add to the run of show…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <input
          type="time"
          value={draftAt}
          onChange={(e) => setDraftAt(e.target.value)}
          aria-label="Time"
          className="h-10 flex-none rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <select
          value={draftDay}
          onChange={(e) => setDraftDay(Number(e.target.value))}
          aria-label="Day"
          className="h-10 flex-none rounded-lg border border-gray-200 bg-white px-2 pr-7 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          {DAY_OFFSETS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={submit}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary-500 text-white hover:bg-primary-700"
          aria-label="Add task"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TaskRow({
  task, dishName, guests, expanded, onExpand, onUpdate, onDelete,
}: {
  task: PartyTaskView;
  dishName?: string;
  guests: PartyGuestView[];
  expanded: boolean;
  onExpand: () => void;
  onUpdate: (patch: Partial<PartyTaskView>) => void;
  onDelete: () => void;
}) {
  return (
    <li className="border-b border-gray-100 last:border-0 dark:border-gray-800">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <button
          type="button"
          onClick={() => onUpdate({ done: !task.done })}
          aria-pressed={task.done}
          aria-label={task.done ? `Untick ${task.label}` : `Tick ${task.label}`}
          className={cn(
            'flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-colors',
            task.done
              ? 'border-primary-500 bg-primary-500 text-white'
              : 'border-gray-300 hover:border-gray-400 dark:border-gray-600',
          )}
        >
          {task.done && <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>

        <input
          type="time"
          value={task.at ?? ''}
          onChange={(e) => onUpdate({ at: e.target.value || null })}
          aria-label={`Time for ${task.label}`}
          className={cn(
            'h-7 w-[104px] flex-none rounded-md border bg-transparent px-1.5 text-xs tabular-nums',
            task.at
              ? 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
              : 'border-dashed border-gray-300 text-gray-400 dark:border-gray-600',
          )}
        />

        <button
          type="button"
          onClick={onExpand}
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          <span
            className={cn(
              'block truncate text-sm',
              task.done ? 'text-gray-400 line-through dark:text-gray-600' : 'text-gray-900 dark:text-gray-100',
            )}
          >
            {task.label}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            {dishName && <span className="truncate">{dishName}</span>}
            {task.durationMin > 0 && <span>{task.durationMin}m</span>}
            {task.resource === 'oven' && task.ovenTempF != null && (
              <span className="text-primary-600 dark:text-primary-400">{task.ovenTempF}°</span>
            )}
            {task.passive && (
              <span className="inline-flex items-center gap-0.5">
                <HourglassIcon className="h-2.5 w-2.5" />
                hands off
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${task.label}`}
          className="flex-none rounded p-1 text-gray-300 hover:text-red-500 dark:text-gray-600"
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30">
          <label className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            takes
            <input
              type="number"
              min={0}
              value={task.durationMin}
              onChange={(e) => onUpdate({ durationMin: Number(e.target.value) })}
              className="h-7 w-14 rounded-md border border-gray-200 bg-white px-1.5 text-right text-xs tabular-nums dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            min
          </label>

          <select
            value={task.resource}
            onChange={(e) => onUpdate({ resource: e.target.value })}
            aria-label="Uses"
            className="h-7 rounded-md border border-gray-200 bg-white px-1.5 pr-6 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {RESOURCES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          {task.resource === 'oven' && (
            <label className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              at
              <input
                type="number"
                min={0}
                value={task.ovenTempF ?? ''}
                placeholder="°F"
                onChange={(e) =>
                  onUpdate({ ovenTempF: e.target.value === '' ? null : Number(e.target.value) })
                }
                className="h-7 w-16 rounded-md border border-gray-200 bg-white px-1.5 text-right text-xs tabular-nums dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
          )}

          <label
            className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"
            title="Proving, resting, thawing — takes time but not the oven and not you"
          >
            <input
              type="checkbox"
              checked={task.passive}
              onChange={(e) => onUpdate({ passive: e.target.checked })}
              className="h-3.5 w-3.5 rounded"
            />
            hands off
          </label>

          {guests.length > 0 && (
            <select
              value={task.assigneeId ?? ''}
              onChange={(e) => onUpdate({ assigneeId: e.target.value || null })}
              aria-label="Who"
              className="h-7 rounded-md border border-gray-200 bg-white px-1.5 pr-6 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">anyone</option>
              {guests.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </li>
  );
}
