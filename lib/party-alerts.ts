// Deciding which run-of-show steps should buzz a phone.
//
// Derived from the steps themselves on every tick rather than queued when a
// step is written. A party schedule is edited constantly right up to the day —
// times move by fifteen minutes four times in an afternoon — and a queue would
// hold whatever was true when the row was created. The step row is the
// schedule, so the step row is what the alarm reads.
//
// The rule is narrow on purpose. A party plan contains a lot of writing that is
// not an instruction to do something at a moment: shopping, "order the pie",
// jobs with no time yet. Those must never buzz, because an alert that fires
// for things you did not ask about gets the whole feature turned off.

export interface AlertableTask {
  id: string;
  label: string;
  /** Minutes from midnight; null when it has no time yet. */
  startMin: number | null;
  dayOffset: number;
  done: boolean;
  passive: boolean;
  /** Already alerted — cleared whenever the time moves. */
  alerted: boolean;
  dishName?: string | null;
}

/**
 * How late an alert may still be worth sending.
 *
 * The server can be down, or asleep. "Turkey in the oven" an hour after the
 * fact is not a reminder, it is an accusation, and it also implies the whole
 * schedule has drifted — which is a thing to look at, not to be buzzed about.
 */
export const MAX_LATE_MIN = 30;

/**
 * The steps that should alert right now.
 *
 * `leadMin` is how much warning the cook asked for; the alert fires once the
 * clock reaches the step's time minus that. Passive steps are included — a
 * dough that needs taking out of the fridge is exactly the thing that gets
 * forgotten, and the fact that it needs no attention afterwards is why.
 */
export function dueAlerts(
  tasks: AlertableTask[],
  nowMin: number,
  leadMin: number,
): AlertableTask[] {
  const lead = Math.max(0, leadMin);

  return tasks
    .filter((t) => {
      // Only the day itself, only work with a time, only work still to do.
      if (t.dayOffset !== 0) return false;
      if (t.startMin === null) return false;
      if (t.done || t.alerted) return false;

      const fireAt = t.startMin - lead;
      if (nowMin < fireAt) return false;
      // Too far past to be a reminder.
      return nowMin - fireAt <= MAX_LATE_MIN;
    })
    .sort((a, b) => (a.startMin as number) - (b.startMin as number));
}

/** What the notification should say. */
export function alertText(
  task: AlertableTask,
  nowMin: number,
  partyTitle: string,
): { title: string; body: string } {
  const start = task.startMin as number;
  const minutesAway = start - nowMin;

  // "In 10 minutes" while there is still warning; "now" once there is not.
  // Rounding up avoids the alert that says "in 0 minutes".
  const when =
    minutesAway >= 1
      ? `in ${Math.ceil(minutesAway)} min`
      : minutesAway <= -2
        ? `${Math.abs(Math.floor(minutesAway))} min ago`
        : 'now';

  const what = task.dishName ? `${task.label} — ${task.dishName}` : task.label;
  return {
    title: `${what}, ${when}`,
    body: partyTitle,
  };
}

/**
 * Whether a change to a step should re-arm its alert.
 *
 * Moving a step is the case this exists for: a step alerted at its old time
 * and then pushed an hour later has to be able to alert again, or the move
 * silently costs you the reminder.
 */
export function shouldRearm(patch: { at?: string | null; dayOffset?: number }): boolean {
  return patch.at !== undefined || patch.dayOffset !== undefined;
}
