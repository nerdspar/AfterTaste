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
  LinkIcon,
  ListPlusIcon,
  LoaderIcon,
  TimerIcon,
} from 'lucide-react';
import {
  parseClock,
  formatClock,
  formatClock12,
  findClashes,
  ovenLanes,
  groupByDay,
  timelineWindow,
  barGeometry,
  packRows,
  layBackFrom,
  dayOptions,
  type ScheduledTask,
} from '@/lib/party-schedule';
import type { PartyTaskView, PartyDishView, PartyGuestView } from '@/lib/party-types';
import {
  useCookTimers,
  type KitchenTimer,
} from '@/components/aftertaste/CookTimersProvider';
import { formatDurationLabel } from '@/lib/step-timers';
import { cn } from '@/lib/utils';

interface Props {
  tasks: PartyTaskView[];
  dishes: PartyDishView[];
  guests: PartyGuestView[];
  serveTime: string;
  partyDate: string;
  partyId: string;
  partyTitle: string;
  onAdd: (input: { label: string; dayOffset: number; at: string | null; dishId: string | null }) => void;
  onUpdate: (taskId: string, patch: Partial<PartyTaskView>) => void;
  onDelete: (taskId: string) => void;
  /** Pull a dish's cookable steps in from its recipe. */
  onSeed: (dishId: string) => Promise<{ added: number; alreadyThere: number }>;
}

const RESOURCES = [
  { value: 'none', label: 'Hands' },
  { value: 'oven', label: 'Oven' },
  { value: 'burner', label: 'Burner' },
  { value: 'mixer', label: 'Mixer' },
];

/** Seconds left as a clock: "4:05", or "1:02:30" once there is an hour on it. */
function formatClockFromSeconds(total: number): string {
  const t = Math.max(0, Math.floor(total));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
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
  tasks, dishes, guests, serveTime, partyDate, partyId, partyTitle,
  onAdd, onUpdate, onDelete, onSeed,
}: Props) {
  const { timers, start, remaining } = useCookTimers();
  const [draft, setDraft] = useState('');
  const [draftDay, setDraftDay] = useState(0);
  const [draftAt, setDraftAt] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  // Which oven block the cook is reading. A short bar cannot hold its own
  // label, so the detail goes under the chart where there is room for it.
  const [focusedBar, setFocusedBar] = useState<string | null>(null);
  const [seeding, setSeeding] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  const scheduled = toScheduled(tasks, dishes);
  const clashes = findClashes(scheduled);
  const serveMin = parseClock(serveTime) ?? 18 * 60;
  const dayOf = scheduled.filter((t) => t.dayOffset === 0);
  const lanes = ovenLanes(dayOf);
  const window = timelineWindow(dayOf.filter((t) => t.resource === 'oven'), serveMin);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  // A fortnight of lead time, plus any day already in use — the data has the
  // final say on how early someone started.
  const days = dayOptions(partyDate, tasks.map((t) => t.dayOffset));
  const dayLabel = (offset: number) =>
    days.find((d) => d.dayOffset === offset)?.label ?? `${Math.abs(offset)} days before`;
  const focused = focusedBar ? scheduled.find((t) => t.id === focusedBar) : null;

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
  // Only a dish with a recipe has steps to take, and only one we are cooking.
  const seedable = dishes.filter((d) => d.recipeId && !d.broughtById);

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
                at {formatClock12(c.atMin)}.
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
                      Move the later one to {formatClock12(c.suggestMin)}
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
              <span>{formatClock12(window.startMin, true)}</span>
              <span className="font-medium text-gray-500 dark:text-gray-400">
                serving {formatClock12(serveMin)}
              </span>
              <span>{formatClock12(window.endMin, true)}</span>
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
                        const active = focusedBar === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            // A fifteen-minute bar is too narrow to hold its
                            // own name, so it has to be askable: tap on a
                            // phone, hover at a desk. Always sets rather than
                            // toggles — with a mouse, hover has already
                            // focused it by the time the click lands, and a
                            // toggle would cancel what the hover just did.
                            onClick={() => setFocusedBar(t.id)}
                            onMouseEnter={() => setFocusedBar(t.id)}
                            onFocus={() => setFocusedBar(t.id)}
                            aria-label={`${t.label}, ${formatClock12(t.startMin as number)}${
                              t.ovenTempF != null ? `, ${t.ovenTempF} degrees` : ''
                            }`}
                            style={{ left: `${geo.leftPct}%`, width: `${geo.widthPct}%` }}
                            className={cn(
                              'absolute inset-y-0 flex items-center overflow-hidden rounded-md px-1.5 text-left text-[10px] font-medium text-white',
                              active
                                ? 'bg-primary-700 ring-2 ring-gray-900 dark:ring-gray-100'
                                : 'bg-primary-500',
                            )}
                          >
                            <span className="truncate">{t.dishName ?? t.label}</span>
                          </button>
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

            {/* The readout keeps the last block read, rather than emptying
                as soon as the pointer moves — you are reading it, not
                hovering over it. */}
            <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-800">
              {focused ? (
                <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">{focused.label}</span>
                  {focused.dishName && (
                    <span className="text-gray-400">{focused.dishName}</span>
                  )}
                  <span className="tabular-nums text-gray-500 dark:text-gray-400">
                    {formatClock12(focused.startMin as number)}–
                    {formatClock12((focused.startMin as number) + focused.durationMin)}
                  </span>
                  {focused.ovenTempF != null && (
                    <span className="text-primary-600 dark:text-primary-400">
                      {focused.ovenTempF}°
                    </span>
                  )}
                  <span className="text-gray-400">{focused.durationMin}m</span>
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  Tap a block to see what it is.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {seedable.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-1.5">
            {seedable.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={seeding === d.id}
                onClick={async () => {
                  setSeeding(d.id);
                  setSeeded(null);
                  try {
                    const { added, alreadyThere } = await onSeed(d.id);
                    setSeeded(
                      added > 0
                        ? `Added ${added} ${added === 1 ? 'step' : 'steps'} from ${d.name}`
                        : alreadyThere > 0
                          ? `${d.name}'s steps are already in the run of show`
                          : `${d.name} has no steps that need a slot`,
                    );
                  } catch {
                    setSeeded('Could not read that recipe');
                  } finally {
                    setSeeding(null);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-full border border-primary-200 px-2.5 py-1 text-[11px] text-primary-700 hover:bg-primary-50 disabled:opacity-40 dark:border-primary-500/40 dark:text-primary-300 dark:hover:bg-primary-500/10"
                title={`Take the timed and oven steps from ${d.name}'s recipe`}
              >
                {seeding === d.id ? (
                  <LoaderIcon className="h-3 w-3 animate-spin" />
                ) : (
                  <ListPlusIcon className="h-3 w-3" />
                )}
                Steps from {d.name}
              </button>
            ))}
          </div>
          {seeded && (
            <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">{seeded}</p>
          )}
        </div>
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

      {/* Adding sits above the day, not under twenty-five steps of it. */}
      <div className="mb-1 flex flex-wrap gap-2">
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
          {days.map((d) => (
            <option key={d.dayOffset} value={d.dayOffset}>{d.label}</option>
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
                    days={days}
                    timer={timers.find((t) => t.sourceId === task.id && !t.done) ?? null}
                    secondsLeft={(t) => remaining(t)}
                    onStartTimer={() =>
                      start({
                        name: task.label,
                        label: formatDurationLabel(task.durationMin * 60),
                        seconds: task.durationMin * 60,
                        recipeId: partyId,
                        recipeTitle: partyTitle,
                        // Back to the run of show, not to a recipe page.
                        href: `/parties/${partyId}`,
                        sourceId: task.id,
                      })
                    }
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

    </div>
  );
}

function TaskRow({
  task, dishName, guests, days, timer, secondsLeft, onStartTimer,
  expanded, onExpand, onUpdate, onDelete,
}: {
  task: PartyTaskView;
  dishName?: string;
  guests: PartyGuestView[];
  days: { dayOffset: number; label: string }[];
  timer: KitchenTimer | null;
  secondsLeft: (t: KitchenTimer) => number;
  onStartTimer: () => void;
  expanded: boolean;
  onExpand: () => void;
  onUpdate: (patch: Partial<PartyTaskView>) => void;
  onDelete: () => void;
}) {
  return (
    <li className="border-b border-gray-100 last:border-0 dark:border-gray-800">
      {/* The label gets its own line and the time sits under it. On a phone a
          single row left "Brine the tur…" next to a time field taking a third
          of the width, and the label is the part you are reading. */}
      <div className="flex items-start gap-2.5 px-3 py-2">
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

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onExpand}
            className="block w-full text-left"
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
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <input
              type="time"
              value={task.at ?? ''}
              onChange={(e) => onUpdate({ at: e.target.value || null })}
              aria-label={`Time for ${task.label}`}
              className={cn(
                // Mobile browsers force 16px on a time input whatever the class
                // says, and "06:00 PM" at 16px needs 72px of text plus padding.
                // Measured, not guessed — this has been clipped twice.
                'min-h-[1.75rem] w-[124px] flex-none py-1 rounded-md border bg-transparent px-1.5 text-xs tabular-nums',
                task.at
                  ? 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                  : 'border-dashed border-gray-300 text-gray-400 dark:border-gray-600',
              )}
            />
            <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-gray-400">
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
            {task.fromList && (
              <span
                className="inline-flex items-center gap-0.5 rounded px-1 text-[10px] text-primary-700 dark:text-primary-300"
                title={`Also on the ${task.fromList === 'prep' ? 'prep' : 'to-do'} list — ticking either ticks both`}
              >
                <LinkIcon className="h-2.5 w-2.5" />
                {task.fromList === 'prep' ? 'prep' : 'to-do'}
              </span>
            )}
            </span>
          </div>
        </div>

        {task.durationMin > 0 && !task.done && (
          timer ? (
            <span
              className="flex-none rounded-md bg-primary-500/10 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-primary-700 dark:text-primary-300"
              title={`${task.label} — running`}
            >
              {formatClockFromSeconds(secondsLeft(timer))}
            </span>
          ) : (
            <button
              type="button"
              onClick={onStartTimer}
              aria-label={`Start a ${task.durationMin} minute timer for ${task.label}`}
              title={`Start a ${task.durationMin} min timer`}
              className="flex-none rounded p-1 text-gray-300 hover:text-primary-600 dark:text-gray-600 dark:hover:text-primary-400"
            >
              <TimerIcon className="h-3.5 w-3.5" />
            </button>
          )
        )}
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
              className="min-h-[1.75rem] w-14 py-1 rounded-md border border-gray-200 bg-white px-1.5 text-right text-xs tabular-nums dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            min
          </label>

          <select
            value={task.dayOffset}
            onChange={(e) => onUpdate({ dayOffset: Number(e.target.value) })}
            aria-label="Day"
            className="min-h-[1.75rem] py-1 rounded-md border border-gray-200 bg-white px-1.5 pr-6 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {days.map((d) => (
              <option key={d.dayOffset} value={d.dayOffset}>{d.label}</option>
            ))}
          </select>

          <select
            value={task.resource}
            onChange={(e) => onUpdate({ resource: e.target.value })}
            aria-label="Uses"
            className="min-h-[1.75rem] py-1 rounded-md border border-gray-200 bg-white px-1.5 pr-6 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
                className="min-h-[1.75rem] w-16 py-1 rounded-md border border-gray-200 bg-white px-1.5 text-right text-xs tabular-nums dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
              className="min-h-[1.75rem] py-1 rounded-md border border-gray-200 bg-white px-1.5 pr-6 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
