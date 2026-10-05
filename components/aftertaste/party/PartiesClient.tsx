'use client';

// Every party you've planned, and the two ways to start a new one.
//
// Cloning is the top of the list rather than buried, because repeating last
// year is the normal case: the Apple note this replaces was duplicated and
// re-dated every November.

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PartyPopperIcon,
  PlusIcon,
  CopyIcon,
  LoaderIcon,
  Trash2Icon,
} from 'lucide-react';
import { createParty, cloneParty, deleteParty } from '@/app/(app)/party-actions';
import { parseClock, formatClock12 } from '@/lib/party-schedule';
import type { PartySummary } from '@/lib/party-types';
import { cn } from '@/lib/utils';

const inputCls = cn(
  'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm',
  'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
  'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
);

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** The serve time as people say it; the column stores 24-hour. */
function serveLabel(serveTime: string): string {
  const min = parseClock(serveTime);
  return min === null ? serveTime : formatClock12(min);
}

/** Same day and month, next year — the usual intent when repeating a party. */
function nextYear(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  return `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function PartiesClient({ parties }: { parties: PartySummary[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cloneOf, setCloneOf] = useState<PartySummary | null>(null);
  // Deleting takes the menu, the lists and the whole run of show with it, so
  // it asks first — and asks in the row, naming what goes.
  const [confirming, setConfirming] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    try {
      const id = await createParty({ title, date });
      router.push(`/parties/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (party: PartySummary) => {
    setBusy(true);
    try {
      await deleteParty(party.id);
      setConfirming(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const clone = async () => {
    if (!cloneOf) return;
    setBusy(true);
    try {
      const id = await cloneParty({ sourceId: cloneOf.id, title, date });
      router.push(`/parties/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Parties</h1>
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setCloneOf(null);
              setTitle('');
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-500 px-3 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4" />
            New party
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700/40 dark:bg-slate-900">
          <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {cloneOf ? `Repeat ${cloneOf.title}` : 'New party'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">Name</span>
              <input
                className={inputCls}
                value={title}
                autoFocus
                placeholder={cloneOf ? `${cloneOf.title.replace(/\d{4}/, '')}${new Date(date).getFullYear()}` : 'Friendsgiving'}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">Date</span>
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          {cloneOf && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Brings the menu, guests, lists and the run of show with its timings.
              Nothing arrives ticked off, and last year&apos;s notes come across as prompts.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={cloneOf ? clone : create}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-500 px-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {busy && <LoaderIcon className="h-3.5 w-3.5 animate-spin" />}
              {cloneOf ? 'Create the copy' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setCloneOf(null); }}
              className="h-9 rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {parties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <PartyPopperIcon className="mx-auto mb-3 h-7 w-7 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No parties yet. A party holds its menu, its shopping, and the run of show for the day.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {parties.map((p) => (
            <Fragment key={p.id}>
              <li className="flex items-center gap-2">
              <Link
                href={`/parties/${p.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 transition-colors hover:border-primary-300 dark:border-gray-700/40 dark:bg-slate-900 dark:hover:border-primary-500/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                    {p.title}
                  </span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                    {prettyDate(p.date)} · {serveLabel(p.serveTime)} ·{' '}
                    {p.dishCount} dish{p.dishCount === 1 ? '' : 'es'}
                    {p.guestCount > 0 &&
                      ` · ${p.guestCount} guest${p.guestCount === 1 ? '' : 's'}`}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                aria-label={`Repeat ${p.title}`}
                title="Repeat this party on a new date"
                onClick={() => {
                  setCloneOf(p);
                  setCreating(true);
                  setTitle(p.title.replace(/\b(20\d{2})\b/, (y) => String(Number(y) + 1)));
                  setDate(nextYear(p.date));
                }}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <CopyIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${p.title}`}
                title="Delete this party"
                onClick={() => setConfirming(confirming === p.id ? null : p.id)}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:hover:bg-red-500/10"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
              </li>
              {confirming === p.id && (
                <li className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs dark:border-red-500/40 dark:bg-red-500/10">
                  <p className="text-red-900 dark:text-red-200">
                    Delete <span className="font-semibold">{p.title}</span>? Its menu,
                    lists, notes and run of show go with it. This cannot be undone.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(p)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {busy && <LoaderIcon className="h-3 w-3 animate-spin" />}
                      Delete it
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="h-8 rounded-lg px-2.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Keep it
                    </button>
                  </div>
                </li>
              )}
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
