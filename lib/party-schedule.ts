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
