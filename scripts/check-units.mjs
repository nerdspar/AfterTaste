#!/usr/bin/env node
// Regression check for imperial <-> metric conversion.
//
// Two things make this worth pinning. Oven temperatures are the one conversion
// that ruins dinner when it drifts, and unit matching is order-sensitive: "fl
// oz" has to be recognised before "oz", or a fluid ounce of milk silently
// becomes an ounce of weight.
//
// Pure and offline. Usage: node scripts/check-units.mjs

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, renameSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

function build() {
  const out = mkdtempSync(join(tmpdir(), 'aftertaste-units-'));
  try {
    execFileSync(
      'npx',
      ['tsc', 'lib/units.ts', 'lib/quantity.ts', '--outDir', out, '--module', 'esnext',
       '--target', 'es2022', '--moduleResolution', 'bundler', '--skipLibCheck'],
      { cwd: repo, stdio: 'pipe' },
    );
  } catch {
    // tsc reports the "@/" alias and still emits.
  }
  for (const f of readdirSync(out)) {
    if (f.endsWith('.js')) renameSync(join(out, f), join(out, f.replace(/\.js$/, '.mjs')));
  }
  const entry = join(out, 'units.mjs');
  writeFileSync(entry, readFileSync(entry, 'utf8').replace("'@/lib/quantity'", "'./quantity.mjs'"));
  return { entry, cleanup: () => rmSync(out, { recursive: true, force: true }) };
}

const { entry, cleanup } = build();
let convertQuantity, convertTemperatures;
try {
  ({ convertQuantity, convertTemperatures } = await import(pathToFileURL(entry).href));
} finally {
  cleanup();
}

let failed = 0;
const run = (label, fn, input, to, want, why) => {
  const got = fn(input, to);
  if (got === want) {
    console.log(`  ok  ${input.padEnd(30)} -> ${got}`);
    return;
  }
  failed++;
  console.log(`\nFAIL  ${label}: ${input}`);
  console.log(`      expected "${want}", got "${got}"`);
  if (why) console.log(`      ${why}\n`);
};
const q = (...a) => run('quantity', convertQuantity, ...a);
const t = (...a) => run('temperature', convertTemperatures, ...a);

console.log('Imperial -> metric');
q('1 cup', 'metric', '240 ml', 'the figure every recipe rounds a cup to');
q('1/2 cup', 'metric', '120 ml');
q('1 1/2 cups', 'metric', '350 ml', 'mixed number');
q('½ cup', 'metric', '120 ml', 'unicode fraction');
q('2 tbsp', 'metric', '30 ml');
q('1/4 tsp', 'metric', '1 ml');
q('8 oz', 'metric', '230 g');
q('1 lb', 'metric', '450 g');
q('3 lb', 'metric', '1.36 kg', 'over a kilo reads in kg');
q('1 fl oz', 'metric', '30 ml', 'fl oz must match before oz, or this is a weight');
q('1 quart', 'metric', '950 ml');

console.log('\nLeft alone');
q('3 cloves', 'metric', '3 cloves', 'not a unit we convert');
q('1 pinch', 'metric', '1 pinch');
q('to taste', 'metric', 'to taste');
q('2 large eggs', 'metric', '2 large eggs');
q('250 g', 'metric', '250 g', 'already metric');

console.log('\nMetric -> imperial');
q('240 ml', 'imperial', '1 cup', 'snapped to a fraction, not 1.01 cup');
q('500 ml', 'imperial', '2⅛ cups');
q('15 ml', 'imperial', '1 tbsp');
q('250 g', 'imperial', '8¾ oz');
q('1 kg', 'imperial', '2¼ lb');
q('1 L', 'imperial', '4¼ cups');

console.log('\nOven temperatures');
t('Bake at 350°F for 25 minutes.', 'metric', 'Bake at 175°C for 25 minutes.');
t('Heat oven to 425 F.', 'metric', 'Heat oven to 220°C.');
t('Preheat to 400 degrees F', 'metric', 'Preheat to 205°C');
t('Bake at 180°C', 'imperial', 'Bake at 355°F');
t('Bake at 350°F', 'imperial', 'Bake at 350°F', 'already imperial');
t('Simmer for 350 minutes', 'metric', 'Simmer for 350 minutes', 'a number is not a temperature');
t('Rest at 350°', 'metric', 'Rest at 350°', 'a bare degree sign is ambiguous — leave it');

console.log(`\n${failed === 0 ? 'all' : `${failed} of the`} unit cases ${failed === 0 ? 'ok' : 'FAILED'}`);
process.exit(failed ? 1 : 0);
