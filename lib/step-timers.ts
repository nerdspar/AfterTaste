// Finding the timers hiding inside instruction text.
//
// "Simmer for 20 minutes" already contains a timer; the cook just has to
// notice it, pick up their phone, and set one. This pulls those phrases out so
// the step itself becomes tappable.
//
// Parsing prose is guesswork, so the rule is: only match something
// unambiguously a duration. A number next to minutes/hours/seconds is one. A
// number next to anything else — 350 degrees, 8 oz, 2 cloves — is not, and a
// timer that starts for the wrong reason is worse than no timer at all.

/** A duration phrase located inside a piece of text. */
export interface StepDuration {
  /** Character offsets of the phrase, so the text can be split around it. */
  start: number;
  end: number;
  /** The phrase exactly as written, e.g. "20 minutes". */
  text: string;
  /** How long to run for, in seconds. */
  seconds: number;
}

const UNIT_SECONDS: Record<string, number> = {
  second: 1, seconds: 1, sec: 1, secs: 1,
  minute: 60, minutes: 60, min: 60, mins: 60,
  hour: 3600, hours: 3600, hr: 3600, hrs: 3600,
};

// A quantity (mixed number, fraction, or decimal), optionally a range, then a
// time unit. The range alternatives cover "20-25", "20 to 25", "20–25".
const DURATION_RE = new RegExp(
  String.raw`\b(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)` +
    String.raw`(?:\s*(?:-|–|—|to)\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?))?` +
    String.raw`\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b`,
  'gi',
);

function parseNumber(raw: string): number | null {
  const s = raw.trim();
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Every duration in a piece of instruction text, in the order they appear.
 *
 * A range takes the LOW end: "simmer 20-25 minutes" sets 20. Checking early and
 * adding time is how cooking works, and a timer that goes off after the food
 * has burnt has not helped anyone.
 */
export function findDurations(text: string): StepDuration[] {
  if (!text) return [];
  const out: StepDuration[] = [];
  DURATION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DURATION_RE.exec(text)) !== null) {
    const low = parseNumber(m[1]);
    const unit = UNIT_SECONDS[m[3].toLowerCase()];
    if (low === null || !unit) continue;
    const seconds = Math.round(low * unit);
    // Nothing useful to count below a second, and nothing anyone sets a phone
    // timer for above a day.
    if (seconds < 1 || seconds > 86_400) continue;
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0], seconds });
  }
  return out;
}

/** "25:00", or "1:05:00" once there's an hour on the clock. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Short label for the button that starts it, e.g. "25 min". */
export function formatDurationLabel(totalSeconds: number): string {
  if (totalSeconds >= 3600) {
    const h = totalSeconds / 3600;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} hr`;
  }
  if (totalSeconds >= 60) return `${Math.round(totalSeconds / 60)} min`;
  return `${totalSeconds} sec`;
}
