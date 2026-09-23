#!/usr/bin/env node
// Regression check for the timers found inside instruction text.
//
// The risk here is false positives. Instruction prose is full of numbers —
// "350°F", "8 oz", "3 cloves", "serves 4" — and a timer that starts for the
// wrong reason is worse than no timer, so the ignored cases matter as much as
// the found ones.
//
// Pure and offline. Usage: node scripts/check-step-timers.mjs

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, renameSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

function build() {
  const out = mkdtempSync(join(tmpdir(), 'aftertaste-timers-'));
  try {
    execFileSync(
      'npx',
      ['tsc', 'lib/step-timers.ts', '--outDir', out, '--module', 'esnext',
       '--target', 'es2022', '--moduleResolution', 'bundler', '--skipLibCheck'],
      { cwd: repo, stdio: 'pipe' },
    );
  } catch {
    // tsc still emits.
  }
  for (const f of readdirSync(out)) {
    if (f.endsWith('.js')) renameSync(join(out, f), join(out, f.replace(/\.js$/, '.mjs')));
  }
  return { entry: join(out, 'step-timers.mjs'), cleanup: () => rmSync(out, { recursive: true, force: true }) };
}

const { entry, cleanup } = build();
let findDurations, formatClock, formatDurationLabel;
try {
  ({ findDurations, formatClock, formatDurationLabel } = await import(pathToFileURL(entry).href));
} finally {
  cleanup();
}

let failed = 0;
const found = (text, want, why) => {
  const got = findDurations(text).map((d) => `${d.text}=${d.seconds}s`).join(', ') || 'none';
  if (got === want) {
    console.log(`  ok  ${text}`);
    return;
  }
  failed++;
  console.log(`\nFAIL  ${text}`);
  console.log(`      expected ${want}, got ${got}`);
  if (why) console.log(`      ${why}\n`);
};
const fmt = (fn, input, want) => {
  const got = fn(input);
  if (got === want) {
    console.log(`  ok  ${String(input).padEnd(6)} -> ${got}`);
    return;
  }
  failed++;
  console.log(`FAIL  ${input} -> expected "${want}", got "${got}"`);
};

console.log('Durations found');
found('Simmer for 20 minutes.', '20 minutes=1200s');
found('Bake 25 min until golden.', '25 min=1500s');
found('Rest 1 hour before slicing.', '1 hour=3600s');
found('Blanch for 90 seconds.', '90 seconds=90s');
found('Cook 1 1/2 hours.', '1 1/2 hours=5400s', 'mixed number');
found('Chill 1/2 hour.', '1/2 hour=1800s', 'bare fraction');
found('Simmer 20-25 minutes.', '20-25 minutes=1200s', 'a range takes the LOW end — check early, add time if needed');
found('Roast 40 to 45 mins.', '40 to 45 mins=2400s', 'worded range');
found('Fry 2 minutes per side, then rest 5 minutes.', '2 minutes=120s, 5 minutes=300s', 'two timers in one step');

console.log('\nCorrectly ignored');
found('Preheat the oven to 350°F.', 'none', 'a temperature is not a duration');
found('Bake at 180°C.', 'none');
found('Add 8 oz of pasta.', 'none');
found('Use 3 cloves of garlic.', 'none');
found('Stir in 2 cups of stock.', 'none');
found('Serves 4 people.', 'none');

console.log('\nClock formatting');
fmt(formatClock, 1500, '25:00');
fmt(formatClock, 90, '1:30');
fmt(formatClock, 3600, '1:00:00');
fmt(formatClock, 5, '0:05');
fmt(formatClock, 0, '0:00');

console.log('\nButton labels');
fmt(formatDurationLabel, 1200, '20 min');
fmt(formatDurationLabel, 3600, '1 hr');
fmt(formatDurationLabel, 5400, '1.5 hr');
fmt(formatDurationLabel, 30, '30 sec');

console.log(`\n${failed === 0 ? 'all timer cases ok' : `${failed} FAILED`}`);
process.exit(failed ? 1 : 0);
