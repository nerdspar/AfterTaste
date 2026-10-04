// The repo's behavioural guards, run under the one command the playbook (and
// the Stop hook, and CI) calls.
//
// These started life as standalone node scripts because the repo had no test
// runner. They still work that way — each is runnable on its own, which is
// genuinely useful when iterating on the estimator — but `npm test` has to be
// the single gate, so it runs them too.

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = join(__dirname, '..');

const CHECKS = [
  ['check-estimator', 'ingredient → food-record matching, and line sizing'],
  ['check-units', 'imperial ↔ metric, including oven temperatures'],
  ['check-quiet-hours', 'when a delayed notification may fire, across DST'],
  ['check-step-timers', 'durations found in instruction text'],
  ['check-notification-click', 'what happens when a push notification is tapped'],
] as const;

describe('behavioural checks', () => {
  for (const [script, what] of CHECKS) {
    it(`${script}: ${what}`, () => {
      try {
        execFileSync('node', [`scripts/${script}.mjs`], {
          cwd: repo,
          stdio: 'pipe',
          encoding: 'utf8',
        });
      } catch (err) {
        const e = err as { stdout?: string; stderr?: string };
        // Surface the script's own report; it names the case that regressed.
        throw new Error(`${script} failed:\n${e.stdout ?? ''}${e.stderr ?? ''}`);
      }
      expect(true).toBe(true);
    });
  }
});
