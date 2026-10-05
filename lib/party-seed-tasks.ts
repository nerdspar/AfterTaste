// Turning a recipe's steps into places on the day.
//
// A recipe has a dozen steps and most of them do not belong on a schedule.
// "Chop the onion" takes as long as it takes and happens whenever you get to
// it; "bake for 45 minutes at 375" is a commitment that collides with other
// commitments. Only the second kind goes in the run of show.
//
// So a step earns a slot by having something a timeline can reason about: a
// duration, a piece of equipment, or a wait. Everything else is left in the
// recipe where it belongs. Seeding every step instead would produce forty rows
// nobody reads, which is the same as producing none.

import { findDurations } from '@/lib/step-timers';
import type { Instruction } from '@/data/sample/recipes';

export interface SeededTask {
  label: string;
  durationMin: number;
  passive: boolean;
  /** oven | burner | mixer | none */
  resource: string;
  ovenTempF: number | null;
  instance: number;
}

/** Words that mean the oven is occupied, not just warm. */
const OVEN = /\b(bake|baked|baking|roast|roasted|roasting|broil|oven)\b/i;
const BURNER = /\b(simmer|boil|saut[ée]|sear|fry|frying|poach|reduce|steam)\b/i;
const MIXER = /\b(mixer|stand mixer|whip|knead on)\b/i;

/**
 * Time that passes without you: proving, chilling, resting, marinating.
 * These matter most on a schedule — they are the reason something has to start
 * early — and they are exactly what gets forgotten when planning backwards.
 */
const PASSIVE = /\b(rest|resting|chill|chilled|chilling|cool|cooling|prove|proof|proving|rise|rising|marinate|marinating|thaw|thawing|soak|soaking|refrigerat|overnight)\b/i;

/** "at 375°F", "to 400 degrees", "oven to 180C" — Fahrenheit only. */
const OVEN_TEMP = /\b(\d{3})\s*(?:°\s*)?(?:f\b|degrees\b|fahrenheit\b)?/i;

function ovenTempFrom(text: string): number | null {
  if (!OVEN.test(text)) return null;
  const m = text.match(OVEN_TEMP);
  if (!m) return null;
  const n = Number(m[1]);
  // A sane oven range, so "bake 350 cookies" and years do not become settings.
  return n >= 150 && n <= 550 ? n : null;
}

function resourceFor(text: string): string {
  if (OVEN.test(text)) return 'oven';
  if (BURNER.test(text)) return 'burner';
  if (MIXER.test(text)) return 'mixer';
  return 'none';
}

/** The longest duration in a step, in whole minutes. */
function minutesIn(text: string): number {
  const found = findDurations(text);
  if (found.length === 0) return 0;
  const longest = Math.max(...found.map((d) => d.seconds));
  return Math.round(longest / 60);
}

/**
 * A short name for the step, preferring its title.
 *
 * The body is prose and makes a terrible row label — a run of show is read at
 * a glance, standing up, with your hands full.
 */
function labelFor(instruction: Instruction): string {
  const title = instruction.title?.trim();
  if (title) return title;
  const body = (instruction.body ?? '').trim();
  const firstSentence = body.split(/(?<=[.!?])\s/)[0] ?? body;
  return firstSentence.length > 60 ? `${firstSentence.slice(0, 57)}…` : firstSentence;
}

export interface SeedOptions {
  /** Two turkeys are two runs through the oven, each with its own steps. */
  instances?: number;
  /** Scales the durations, the same way the quantities scale. */
  multiplier?: number;
}

/**
 * The steps of a recipe that deserve a place on the day.
 *
 * Returns nothing for a recipe of pure knife work, which is the right answer:
 * that dish needs shopping and a pair of hands, not a slot.
 */
export function seedTasksFromSteps(
  instructions: Instruction[],
  options: SeedOptions = {},
): SeededTask[] {
  const instances = Math.max(1, Math.floor(options.instances ?? 1));
  const out: SeededTask[] = [];

  for (let instance = 1; instance <= instances; instance += 1) {
    for (const instruction of instructions) {
      // Section headers are signposts in the recipe, not work.
      if (instruction.section !== undefined) continue;

      const text = `${instruction.title ?? ''} ${instruction.body ?? ''}`;
      const durationMin = minutesIn(text);
      const resource = resourceFor(text);
      const passive = PASSIVE.test(text);

      // The earning rule: a timeline can only reason about time and equipment.
      if (durationMin === 0 && resource === 'none' && !passive) continue;

      out.push({
        label: labelFor(instruction),
        durationMin,
        passive,
        // Resting does not hold the oven, whatever the step says around it.
        resource: passive ? 'none' : resource,
        ovenTempF: passive ? null : ovenTempFrom(text),
        instance,
      });
    }
  }

  return out;
}
