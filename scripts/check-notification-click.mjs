#!/usr/bin/env node
// Regression check for what happens when a push notification is tapped.
//
// This broke in the field and gave no clue that it had: the app came to the
// front and then did nothing, because client.navigate() failed inside an
// installed iOS PWA and the handler swallowed the error. Silent, and
// untestable on a laptop — so the worker is loaded here into a stubbed
// ServiceWorkerGlobalScope and the click is simulated against it.
//
// Usage: node scripts/check-notification-click.mjs [path-to-sw.js]
// The optional path is for checking a worker other than the current one, e.g.
// confirming an older copy really does fail the case it shipped broken.

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const swPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : join(repo, 'public/sw.js');
const source = readFileSync(swPath, 'utf8');
const ORIGIN = 'https://aftertaste.test';
const TARGET = '/recipes/abc123?rate=1';

/** Load sw.js into a fake worker scope and hand back its click handler. */
function loadWorker(clients) {
  const listeners = {};
  const self = {
    addEventListener: (type, fn) => {
      (listeners[type] ||= []).push(fn);
    },
    clients,
    registration: { showNotification: async () => {} },
    location: { origin: ORIGIN },
    skipWaiting: () => {},
  };
  const ctx = {
    self,
    caches: {
      keys: async () => [],
      open: async () => ({ put: async () => {} }),
      match: async () => null,
      delete: async () => {},
    },
    fetch: async () => ({ ok: false }),
    Response: { error: () => ({}) },
    URL,
    MessageChannel,
    setTimeout,
    clearTimeout,
    console,
  };
  createContext(ctx);
  runInContext(source, ctx);
  return listeners.notificationclick?.[0];
}

/** Fire a notificationclick and wait for the handler to finish. */
async function click(handler) {
  let work = Promise.resolve();
  let closed = false;
  handler({
    notification: {
      data: { url: TARGET },
      close: () => {
        closed = true;
      },
    },
    waitUntil: (p) => {
      work = p;
    },
  });
  await work;
  return { closed };
}

/** A window the worker can find, with its behaviour configurable. */
function makeClient({ answers, navigateThrows }) {
  const calls = { focus: 0, navigate: [], messages: [] };
  return {
    calls,
    client: {
      url: `${ORIGIN}/dashboard`,
      focus: async () => {
        calls.focus += 1;
      },
      navigate: async (url) => {
        calls.navigate.push(url);
        if (navigateThrows) throw new Error('navigate not supported here');
      },
      postMessage: (msg, transfer) => {
        calls.messages.push(msg);
        // A live page replies on the port the worker sent.
        if (answers) transfer?.[0]?.postMessage({ ok: true });
      },
    },
  };
}

let failed = 0;
const check = (name, ok, detail) => {
  if (ok) {
    console.log(`  ok  ${name}`);
    return;
  }
  failed++;
  console.log(`\nFAIL  ${name}`);
  if (detail) console.log(`      ${detail}\n`);
};

// --- 1. A live page routes itself, and nothing heavier is attempted ---------
{
  const opened = [];
  const { client, calls } = makeClient({ answers: true });
  const handler = loadWorker({
    matchAll: async () => [client],
    openWindow: async (u) => opened.push(u),
  });
  const { closed } = await click(handler);
  check('a live page is asked to route, and does', calls.messages.length === 1);
  check('  ...and is focused first', calls.focus === 1);
  check(
    '  ...so no hard navigate is attempted',
    calls.navigate.length === 0,
    `navigate was called with ${JSON.stringify(calls.navigate)}`,
  );
  check('  ...and no second window is opened', opened.length === 0);
  check('  ...and the notification is dismissed', closed);
  check(
    '  ...and it is sent the ratings deep link',
    calls.messages[0]?.url === TARGET,
    `got ${JSON.stringify(calls.messages[0])}`,
  );
}

// --- 2. A page too old to listen still gets there ---------------------------
{
  const opened = [];
  const { client, calls } = makeClient({ answers: false });
  const handler = loadWorker({
    matchAll: async () => [client],
    openWindow: async (u) => opened.push(u),
  });
  await click(handler);
  check(
    'a silent page falls back to a hard navigate',
    calls.navigate[0] === TARGET,
    `navigate calls: ${JSON.stringify(calls.navigate)}`,
  );
  check('  ...and still opens no second window', opened.length === 0);
}

// --- 3. navigate() failing is the actual iOS bug — must not be swallowed ----
{
  const opened = [];
  const { client, calls } = makeClient({ answers: false, navigateThrows: true });
  const handler = loadWorker({
    matchAll: async () => [client],
    openWindow: async (u) => opened.push(u),
  });
  await click(handler);
  check(
    'a failing navigate falls through to opening a window',
    opened[0] === TARGET,
    `this is the case that silently did nothing before. opened: ${JSON.stringify(opened)}`,
  );
  check('  ...having tried navigate first', calls.navigate.length === 1);
}

// --- 4. Nothing open at all -------------------------------------------------
{
  const opened = [];
  const handler = loadWorker({
    matchAll: async () => [],
    openWindow: async (u) => opened.push(u),
  });
  await click(handler);
  check('with no window open, one is opened at the target', opened[0] === TARGET);
}

// --- 5. A window on another origin is not mistaken for ours -----------------
{
  const opened = [];
  const foreign = {
    url: 'https://example.com/',
    focus: async () => {},
    navigate: async () => {},
    postMessage: () => {},
  };
  const handler = loadWorker({
    matchAll: async () => [foreign],
    openWindow: async (u) => opened.push(u),
  });
  await click(handler);
  check('a foreign window is ignored and ours is opened', opened[0] === TARGET);
}

console.log(`\n${failed === 0 ? 'all notification-click cases ok' : `${failed} FAILED`}`);
process.exit(failed ? 1 : 0);
