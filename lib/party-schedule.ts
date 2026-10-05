// Laying a party's tasks out in time, and spotting where the oven is
// double-booked.
//
// Deliberately not a solver. It lays tasks back from the serve time, finds
// overlaps on a resource, and reports them with the nearest gap that would fit.
// It never moves anything on its own: the schedule in a party note is full of
// placements the cook made for reasons the app has no idea about, and silently
// shuffling them is how an assistant loses trust.
//
// Two rules do most of the work:
//   - A passive task (dough proving, a turkey thawing) occupies the clock but
//     no resource and no hands, so it never causes a clash.
//   - The oven is only in conflict when two tasks overlap AND want different
//     temperatures. Two trays at 350° together is a normal Saturday.

export interface ScheduledTask {
  id: string;
  label: string;
  /** 0 = the day of, -1 = the day before. */
  dayOffset: number;
  /** Minutes from midnight, or null when it has no time yet. */
  startMin: number | null;
  durationMin: number;
  passive: boolean;
  /** oven | burner | mixer | none */
  resource: string;
  ovenTempF?: number | null;
  dishName?: string;
}

export interface Clash {
  /** The two tasks that collide. */
  a: ScheduledTask;
  b: ScheduledTask;
  resource: string;
  /** Minutes from midnight where the overlap starts, and how long it runs. */
  atMin: number;
  overlapMin: number;
  /** Why: two temperatures in one oven, or one tool wanted twice. */
  reason: 'temperature' | 'capacity';
  /** The earliest start that would clear it, or null if nothing fits that day. */
  suggestMin: number | null;
}

/** "17:30" → 1050. Returns null for anything unparseable. */
export function parseClock(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 1050 → "17:30". Wraps within the day. */
export function formatClock(total: number): string {
  const t = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

const endOf = (t: ScheduledTask) => (t.startMin ?? 0) + t.durationMin;

/**
 * Place a dish's tasks so the last one finishes at the serve time.
 *
 * Given the chain of things a dish needs — take the dough out, bake it, reheat
 * it — the only time the cook actually knows is when it should be on the table.
 * Everything else is that, minus the work, in order.
 */
export function layBackFrom(
  serveMin: number,
  tasks: { id: string; durationMin: number }[],
): Map<string, number> {
  const out = new Map<string, number>();
  let cursor = serveMin;
  for (let i = tasks.length - 1; i >= 0; i -= 1) {
    cursor -= tasks[i].durationMin;
    out.set(tasks[i].id, cursor);
  }
  return out;
}

/** Do two tasks occupy the same resource at the same time? */
function overlaps(a: ScheduledTask, b: ScheduledTask): number {
  if (a.dayOffset !== b.dayOffset) return 0;
  const start = Math.max(a.startMin ?? 0, b.startMin ?? 0);
  const end = Math.min(endOf(a), endOf(b));
  return Math.max(0, end - start);
}

/**
 * The earliest start on the same day at which `task` would not collide with
 * any of `others`. Searched in five-minute steps, because nobody schedules a
 * turkey to the minute.
 */
function nextFreeStart(task: ScheduledTask, others: ScheduledTask[]): number | null {
  const busy = others
    .filter((o) => o.dayOffset === task.dayOffset)
    .map((o) => [o.startMin ?? 0, endOf(o)] as const)
    .sort((x, y) => x[0] - y[0]);

  for (let start = task.startMin ?? 0; start + task.durationMin <= 24 * 60; start += 5) {
    const clear = busy.every(([s, e]) => start + task.durationMin <= s || start >= e);
    if (clear) return start;
  }
  return null;
}

/**
 * Every place two tasks want the same thing at once.
 *
 * Returns one entry per colliding pair, earliest first, each carrying a
 * suggested time rather than applying it.
 */
export function findClashes(tasks: ScheduledTask[]): Clash[] {
  const live = tasks.filter(
    (t) => !t.passive && t.resource !== 'none' && t.startMin !== null && t.durationMin > 0,
  );
  const clashes: Clash[] = [];

  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = live[i];
      const b = live[j];
      if (a.resource !== b.resource) continue;
      const overlap = overlaps(a, b);
      if (overlap <= 0) continue;

      // Two trays in the oven at the same temperature is just a busy oven.
      if (a.resource === 'oven') {
        const sameTemp =
          a.ovenTempF != null && b.ovenTempF != null && a.ovenTempF === b.ovenTempF;
        if (sameTemp) continue;
      }

      const later = (a.startMin ?? 0) >= (b.startMin ?? 0) ? a : b;
      const other = later === a ? b : a;
      clashes.push({
        a,
        b,
        resource: a.resource,
        atMin: Math.max(a.startMin ?? 0, b.startMin ?? 0),
        overlapMin: overlap,
        reason: a.resource === 'oven' ? 'temperature' : 'capacity',
        suggestMin: nextFreeStart(later, [other]),
      });
    }
  }

  return clashes.sort((x, y) => x.atMin - y.atMin);
}

/** One oven lane per temperature, for drawing the timeline. */
export function ovenLanes(
  tasks: ScheduledTask[],
): { tempF: number | null; tasks: ScheduledTask[] }[] {
  const lanes = new Map<number | null, ScheduledTask[]>();
  for (const t of tasks) {
    if (t.resource !== 'oven' || t.passive || t.startMin === null) continue;
    const key = t.ovenTempF ?? null;
    const list = lanes.get(key);
    if (list) list.push(t);
    else lanes.set(key, [t]);
  }
  return [...lanes.entries()]
    .map(([tempF, list]) => ({
      tempF,
      tasks: list.sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0)),
    }))
    .sort((a, b) => (a.tempF ?? 0) - (b.tempF ?? 0));
}

/**
 * The run of show, split into the days it actually spans.
 *
 * The note has a Friday page and a Saturday page, and that is the right shape:
 * cooking ahead is a different mode from the day itself. Tasks with no time
 * yet are kept apart rather than sorted to midnight, because "sometime
 * Thursday" is a real state a plan sits in for weeks.
 */
export function groupByDay(
  tasks: ScheduledTask[],
): { dayOffset: number; timed: ScheduledTask[]; untimed: ScheduledTask[] }[] {
  const days = new Map<number, ScheduledTask[]>();
  for (const t of tasks) {
    const list = days.get(t.dayOffset);
    if (list) list.push(t);
    else days.set(t.dayOffset, [t]);
  }

  return [...days.entries()]
    .map(([dayOffset, list]) => ({
      dayOffset,
      timed: list
        .filter((t) => t.startMin !== null)
        .sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0) || a.label.localeCompare(b.label)),
      untimed: list.filter((t) => t.startMin === null),
    }))
    .sort((a, b) => a.dayOffset - b.dayOffset);
}

/**
 * The span a timeline should draw, rounded out to whole hours.
 *
 * Always runs to the serve time: the point of the picture is how the work
 * converges on dinner, and a chart that stops before it is the wrong chart.
 */
export function timelineWindow(
  tasks: ScheduledTask[],
  serveMin: number,
): { startMin: number; endMin: number } {
  const starts = tasks
    .filter((t) => t.startMin !== null)
    .map((t) => t.startMin as number);
  const ends = tasks.filter((t) => t.startMin !== null).map(endOf);

  const earliest = starts.length > 0 ? Math.min(...starts) : serveMin - 120;
  const latest = Math.max(serveMin, ...(ends.length > 0 ? ends : [serveMin]));

  const floorHour = Math.floor(earliest / 60) * 60;
  const ceilHour = Math.ceil(latest / 60) * 60;
  return {
    startMin: Math.max(0, floorHour),
    // Always at least two hours wide, or the bars have nothing to sit in.
    endMin: Math.min(24 * 60, Math.max(ceilHour, floorHour + 120)),
  };
}

/** Where a task sits in a window, as percentages, for drawing one bar. */
export function barGeometry(
  task: ScheduledTask,
  window: { startMin: number; endMin: number },
): { leftPct: number; widthPct: number } | null {
  if (task.startMin === null) return null;
  const span = window.endMin - window.startMin;
  if (span <= 0) return null;
  const left = ((task.startMin - window.startMin) / span) * 100;
  // A zero-length task still has to be visible, or a reminder vanishes.
  const width = Math.max((task.durationMin / span) * 100, 1.5);
  return {
    leftPct: Math.max(0, Math.min(100, left)),
    widthPct: Math.max(0, Math.min(100 - Math.max(0, left), width)),
  };
}

/**
 * Pack tasks into rows so that no row has two at once.
 *
 * Within one oven temperature, concurrency is normal — three trays at 375° is
 * a working Saturday, not a clash. But drawn on one line they land on top of
 * each other and the picture becomes mush, which defeats the point of having
 * a picture. So overlapping bars get their own row.
 */
export function packRows(tasks: ScheduledTask[]): ScheduledTask[][] {
  const sorted = [...tasks]
    .filter((t) => t.startMin !== null)
    .sort((a, b) => (a.startMin as number) - (b.startMin as number));

  const rows: ScheduledTask[][] = [];
  for (const task of sorted) {
    const row = rows.find((r) => {
      const last = r[r.length - 1];
      return (last.startMin as number) + last.durationMin <= (task.startMin as number);
    });
    if (row) row.push(task);
    else rows.push([task]);
  }
  return rows;
}

export interface DayOption {
  dayOffset: number;
  /** "Party day", "The day before", "Thu 19 Nov — 2 days before". */
  label: string;
  short: string;
}

/** Shift a local YYYY-MM-DD by whole days, staying in local time. */
export function shiftDate(iso: string, days: number): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d + days);
}

function relative(offset: number): string {
  if (offset === 0) return 'Party day';
  if (offset === -1) return 'The day before';
  if (offset > 0) return `${offset} ${offset === 1 ? 'day' : 'days'} after`;
  return `${Math.abs(offset)} days before`;
}

/**
 * The days a party plan can reach back to.
 *
 * A fortnight, because the real answer is "whenever you start" — stock gets
 * ordered, a turkey gets bought, cranberry sauce gets made a week out — and a
 * planner that stops at the day before quietly tells you those are not part of
 * the plan. Any day already in use is kept even if it falls outside the
 * window, since the data has the final say on how early someone started.
 */
export function dayOptions(partyDate: string, used: number[] = [], back = 14): DayOption[] {
  const offsets = new Set<number>(used);
  for (let i = -back; i <= 0; i += 1) offsets.add(i);

  return [...offsets]
    .sort((a, b) => a - b)
    .map((dayOffset) => {
      const date = shiftDate(partyDate, dayOffset);
      const when = relative(dayOffset);
      const stamp = date
        ? date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
        : null;
      return {
        dayOffset,
        // The weekday is what people actually plan against — "the Thursday"
        // means more than "minus two".
        label: stamp && dayOffset !== 0 ? `${stamp} — ${when.toLowerCase()}` : when,
        short: stamp ?? when,
      };
    });
}
