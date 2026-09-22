#!/usr/bin/env node
// Regression check for when a delayed notification is allowed to buzz.
//
// This is date arithmetic across timezones and daylight saving, which is where
// quiet bugs live: an off-by-one-hour here means waking someone at 7am, and
// nothing in the UI would ever show it. The cases below pin the awkward edges —
// midnight wrap, month end, and both DST transitions.
//
// Pure and offline: no database, no network, same answer every time.
//
// Usage: node scripts/check-quiet-hours.mjs

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, renameSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

function buildQuietHours() {
  const out = mkdtempSync(join(tmpdir(), 'aftertaste-quiet-'));
  try {
    execFileSync(
      'npx',
      ['tsc', 'lib/quiet-hours.ts', '--outDir', out, '--module', 'esnext',
       '--target', 'es2022', '--moduleResolution', 'bundler', '--skipLibCheck'],
      { cwd: repo, stdio: 'pipe' },
    );
  } catch {
    // tsc still emits; a genuinely broken build surfaces as a failed import.
  }
  for (const f of readdirSync(out)) {
    if (f.endsWith('.js')) renameSync(join(out, f), join(out, f.replace(/\.js$/, '.mjs')));
  }
  return { entry: join(out, 'quiet-hours.mjs'), cleanup: () => rmSync(out, { recursive: true, force: true }) };
}

const TZ = 'America/New_York';
const localTime = (d) =>
  d.toLocaleString('en-US', { timeZone: TZ, hour12: false, month: 'short',
                              day: '2-digit', hour: '2-digit', minute: '2-digit' });

// Each `due` carries an explicit UTC offset, so it is an unambiguous wall time
// in New York. Quiet hours are 9pm to 8am.
const CASES = [
  { due: '2026-09-22T18:00:00-04:00', want: 'Sep 22, 18:00', why: 'afternoon — send as scheduled' },
  { due: '2026-09-22T20:59:00-04:00', want: 'Sep 22, 20:59', why: 'one minute before quiet starts' },
  { due: '2026-09-22T21:00:00-04:00', want: 'Sep 23, 08:00', why: '9pm sharp is already quiet' },
  { due: '2026-09-22T23:30:00-04:00', want: 'Sep 23, 08:00', why: 'late evening waits for morning' },
  { due: '2026-09-23T00:30:00-04:00', want: 'Sep 23, 08:00', why: 'past midnight waits for the SAME morning, not the next one' },
  { due: '2026-09-23T07:59:00-04:00', want: 'Sep 23, 08:00', why: 'one minute before quiet ends' },
  { due: '2026-09-23T08:00:00-04:00', want: 'Sep 23, 08:00', why: '8am sharp is allowed' },
  { due: '2026-09-30T22:00:00-04:00', want: 'Oct 01, 08:00', why: 'rolls into the next month' },
  { due: '2026-11-01T01:00:00-04:00', want: 'Nov 01, 08:00', why: 'the night the clocks go back' },
  { due: '2026-03-08T01:30:00-05:00', want: 'Mar 08, 08:00', why: 'the night the clocks go forward' },
];

const { entry, cleanup } = buildQuietHours();
let nextSendableTime, isQuietHour;
try {
  ({ nextSendableTime, isQuietHour } = await import(pathToFileURL(entry).href));
} finally {
  cleanup();
}

let failed = 0;
for (const { due, want, why } of CASES) {
  const got = localTime(nextSendableTime(new Date(due), 21, 8, TZ));
  if (got === want) {
    console.log(`  ok  ${due}  ->  ${got}`);
    continue;
  }
  failed++;
  console.log(`\nFAIL  due ${due}`);
  console.log(`      expected ${want}, got ${got}`);
  console.log(`      ${why}\n`);
}

// Holding a notification is only ever right when we know it is night where the
// cook is. Without that, send it.
const passthrough = [
  ['unknown timezone', nextSendableTime(new Date('2026-09-23T03:30:00Z'), 21, 8, null)],
  ['unparseable timezone', nextSendableTime(new Date('2026-09-23T03:30:00Z'), 21, 8, 'Not/AZone')],
  ['quiet hours turned off', nextSendableTime(new Date('2026-09-23T03:30:00Z'), 8, 8, TZ)],
];
for (const [name, got] of passthrough) {
  const ok = got.toISOString() === '2026-09-23T03:30:00.000Z';
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok ' : 'FAIL'}  ${name} sends as scheduled`);
}

// A cook in Sydney must not be silenced by a New York evening.
const sydney = nextSendableTime(new Date('2026-09-23T03:30:00Z'), 21, 8, 'Australia/Sydney');
const sydneyOk = sydney.toISOString() === '2026-09-23T03:30:00.000Z';
if (!sydneyOk) failed++;
console.log(`  ${sydneyOk ? 'ok ' : 'FAIL'}  quiet hours follow the user, not the server`);

// The window wraps midnight (21->8) or does not (1->6); both must be right.
const wrap = [20, 21, 23, 0, 7, 8].map((h) => isQuietHour(h, 21, 8));
const noWrap = [0, 1, 5, 6].map((h) => isQuietHour(h, 1, 6));
const wrapOk = JSON.stringify(wrap) === JSON.stringify([false, true, true, true, true, false]);
const noWrapOk = JSON.stringify(noWrap) === JSON.stringify([false, true, true, false]);
if (!wrapOk) failed++;
if (!noWrapOk) failed++;
console.log(`  ${wrapOk ? 'ok ' : 'FAIL'}  a window that wraps midnight`);
console.log(`  ${noWrapOk ? 'ok ' : 'FAIL'}  a window that does not`);

const total = CASES.length + passthrough.length + 3;
console.log(`\n${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
