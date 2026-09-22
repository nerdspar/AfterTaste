// Deciding when a queued notification is actually allowed to buzz.
//
// A nudge queued at 7pm with a three-hour delay comes due at 10pm, which is a
// bad time to be asked about dinner. Quiet hours hold it until the morning.
//
// Everything here is judged in the user's own timezone. The server runs in
// whatever zone the NAS is set to, and "9pm" has to mean the cook's evening.

/** Wall-clock parts of an instant, as seen in a particular timezone. */
interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function partsIn(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const got: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') got[p.type] = p.value;
  }
  return {
    year: Number(got.year),
    month: Number(got.month),
    day: Number(got.day),
    // Intl gives "24" for midnight under hour12:false in some environments.
    hour: Number(got.hour) % 24,
    minute: Number(got.minute),
  };
}

/**
 * The instant at which the given wall-clock time occurs in a timezone.
 *
 * Done in two passes: guess that the wall time is UTC, see what that instant
 * actually reads as in the zone, and subtract the difference. This is the
 * usual approach and is exact except inside a DST spring-forward gap, where it
 * lands an hour out — acceptable for a "did you cook this?" reminder.
 */
function instantOf(p: Parts, timeZone: string): Date {
  const guess = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const seen = partsIn(new Date(guess), timeZone);
  const seenAsUtc = Date.UTC(
    seen.year,
    seen.month - 1,
    seen.day,
    seen.hour,
    seen.minute,
  );
  return new Date(guess - (seenAsUtc - guess));
}

/** True when `hour` falls inside the quiet window, which may wrap midnight. */
export function isQuietHour(hour: number, from: number, to: number): boolean {
  if (from === to) return false; // no quiet hours
  // 21 → 8 wraps midnight; 1 → 6 does not.
  return from > to ? hour >= from || hour < to : hour >= from && hour < to;
}

/**
 * When a notification due at `due` should actually be sent.
 *
 * Returns `due` untouched outside quiet hours; otherwise the moment quiet
 * hours end — later the same morning if it is already past midnight, the next
 * morning if the evening has only just begun.
 *
 * An unknown timezone means we cannot tell whether it is night where the cook
 * is, so the notification goes out as scheduled rather than being held for a
 * morning that might be the middle of their afternoon.
 */
export function nextSendableTime(
  due: Date,
  from: number,
  to: number,
  timeZone: string | null | undefined,
): Date {
  if (!timeZone || from === to) return due;
  let local: Parts;
  try {
    local = partsIn(due, timeZone);
  } catch {
    return due; // bad zone string — don't hold the notification hostage
  }
  if (!isQuietHour(local.hour, from, to)) return due;

  // Quiet hours end at `to` o'clock. If we're in the evening stretch of a
  // window that wraps midnight, that is tomorrow morning; if we're already
  // past midnight, it is later today.
  const wrapped = from > to;
  const intoTomorrow = wrapped && local.hour >= from;
  const target: Parts = {
    ...local,
    day: local.day + (intoTomorrow ? 1 : 0),
    hour: to,
    minute: 0,
  };
  // Date.UTC normalises an overflowing day (Sep 31 → Oct 1), so month-ends
  // need no special handling here.
  return instantOf(target, timeZone);
}
