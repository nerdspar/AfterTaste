// Viewport units, per app-playbook/pwa-chrome.md: "Shell is 100dvh, never 100vh."
//
// This is not style policing. `vh` on iOS resolves against the LARGEST viewport
// — toolbars retracted, keyboard absent — so a sheet sized in `vh` keeps its
// full height when the keyboard opens, and its lower part (including the
// bottom of a scrolling list) ends up behind the keyboard. The symptom is a
// list that scrolls to the bottom and then will not come back up, which is
// exactly how this was reported from a phone.
//
// `dvh` tracks the viewport that is actually visible, so the sheet shrinks to
// fit and its scroller stays reachable.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = join(__dirname, '..');
const ROOTS = ['app', 'components'];
const EXTENSIONS = ['.tsx', '.ts', '.css'];

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (EXTENSIONS.some((e) => entry.endsWith(e))) found.push(full);
  }
  return found;
}

/** `85vh`, `100vh`, `h-[70vh]` — but not `85dvh`, `svh` or `lvh`. */
const STATIC_VH = /(?<![a-z])(\d+(?:\.\d+)?)vh\b/g;

describe('viewport units (app-playbook/pwa-chrome.md)', () => {
  it('uses dvh rather than vh, so sheets shrink when the keyboard opens', () => {
    const offenders: string[] = [];

    for (const root of ROOTS) {
      for (const file of sourceFiles(join(repo, root))) {
        const text = readFileSync(file, 'utf8');
        text.split('\n').forEach((line, i) => {
          STATIC_VH.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = STATIC_VH.exec(line)) !== null) {
            // `dvh`/`svh`/`lvh` end in "vh" too; the lookbehind above only
            // excludes a single letter, so drop those explicitly.
            const before = line.slice(Math.max(0, m.index - 1), m.index);
            if (/[dsl]/.test(before)) continue;
            offenders.push(
              `${relative(repo, file)}:${i + 1}  ${m[0]}  →  ${m[1]}dvh`,
            );
          }
        });
      }
    }

    expect(
      offenders,
      `Use dvh, not vh — see app-playbook/pwa-chrome.md.\n` +
        `A sheet sized in vh keeps its full height when the iOS keyboard opens, ` +
        `pushing its scrolling list off-screen so it cannot be scrolled back up.\n\n` +
        offenders.join('\n'),
    ).toEqual([]);
  });
});
