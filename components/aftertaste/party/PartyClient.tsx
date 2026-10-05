'use client';

// The party screen. Holds the party in local state, seeded from the server,
// and applies each change optimistically before the action confirms it —
// the same pattern the recipe, grocery and meal-plan stores use.

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, UsersIcon, PlusIcon, XIcon } from 'lucide-react';
import {
  updateParty, addDish, updateDish, deleteDish, addGuest, deleteGuest,
} from '@/app/(app)/party-actions';
import type { PartyView, PartyDishView, DishStatus } from '@/lib/party-types';
import { PartyMenu } from './PartyMenu';
import { cn } from '@/lib/utils';

type Tab = 'menu' | 'lists' | 'schedule';

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export function PartyClient({ initial }: { initial: PartyView }) {
  const [party, setParty] = useState(initial);
  const [tab, setTab] = useState<Tab>('menu');
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [guestDraft, setGuestDraft] = useState('');
  const [, startTransition] = useTransition();

  // Optimistic helpers: change local state now, let the server catch up. A
  // failed write logs rather than reverting — these are small edits and a
  // silent snap-back mid-typing is worse than a stale row until reload.
  const run = (fn: () => Promise<unknown>) => {
    startTransition(() => {
      fn().catch((err) => console.error('[party] write failed', err));
    });
  };

  const onAddDish = (
    course: string, name: string, recipeId: string | null, status: DishStatus,
  ) => {
    const temp: PartyDishView = {
      id: `tmp-${Date.now()}`, course, position: party.dishes.length,
      recipeId, name, multiplier: 1, instances: 1, equipment: null,
      status, broughtById: null,
    };
    setParty((p) => ({ ...p, dishes: [...p.dishes, temp] }));
    run(async () => {
      await addDish(party.id, { course, name, recipeId, status });
      // Reload so the real id replaces the temporary one.
      window.location.reload();
    });
  };

  const onUpdateDish = (dishId: string, patch: Partial<PartyDishView>) => {
    setParty((p) => ({
      ...p,
      dishes: p.dishes.map((d) => (d.id === dishId ? { ...d, ...patch } : d)),
    }));
    run(() => updateDish(party.id, dishId, patch));
  };

  const onDeleteDish = (dishId: string) => {
    setParty((p) => ({ ...p, dishes: p.dishes.filter((d) => d.id !== dishId) }));
    run(() => deleteDish(party.id, dishId));
  };

  const onAddGuest = () => {
    const name = guestDraft.trim();
    if (!name) return;
    setGuestDraft('');
    run(async () => {
      await addGuest(party.id, name);
      window.location.reload();
    });
  };

  const onDeleteGuest = (guestId: string) => {
    setParty((p) => ({
      ...p,
      guests: p.guests.filter((g) => g.id !== guestId),
      // A dish whose cook just left the list comes back to us.
      dishes: p.dishes.map((d) => (d.broughtById === guestId ? { ...d, broughtById: null } : d)),
    }));
    run(() => deleteGuest(party.id, guestId));
  };

  const bringing = (guestId: string) =>
    party.dishes.filter((d) => d.broughtById === guestId).length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/parties"
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Parties
      </Link>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <input
            value={party.title}
            onChange={(e) => {
              const title = e.target.value;
              setParty((p) => ({ ...p, title }));
            }}
            onBlur={() => run(() => updateParty(party.id, { title: party.title }))}
            className="w-full truncate border-0 bg-transparent p-0 text-xl font-bold text-gray-900 focus:outline-none dark:text-gray-100"
            aria-label="Party name"
          />
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <input
              type="date"
              value={party.date}
              onChange={(e) => {
                const date = e.target.value;
                setParty((p) => ({ ...p, date }));
                run(() => updateParty(party.id, { date }));
              }}
              className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-gray-200 dark:hover:border-gray-700"
              aria-label="Party date"
            />
            <span aria-hidden>·</span>
            <label className="flex items-center gap-1">
              <span className="text-xs">serving</span>
              <input
                type="time"
                value={party.serveTime}
                onChange={(e) => {
                  const serveTime = e.target.value;
                  setParty((p) => ({ ...p, serveTime }));
                  run(() => updateParty(party.id, { serveTime }));
                }}
                className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-gray-200 dark:hover:border-gray-700"
                aria-label="Serve time"
              />
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setGuestsOpen((o) => !o)}
          className="inline-flex h-9 flex-none items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <UsersIcon className="h-4 w-4" />
          {party.guests.length}
        </button>
      </div>

      {guestsOpen && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-700/40 dark:bg-slate-900">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Guests</p>
          {party.guests.length === 0 && (
            <p className="mb-2 text-xs text-gray-400">
              Add names and you can tag who&apos;s bringing what.
            </p>
          )}
          <ul className="mb-2 space-y-1">
            {party.guests.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate text-gray-800 dark:text-gray-200">{g.name}</span>
                {bringing(g.id) > 0 && (
                  <span className="text-[11px] text-gray-400">
                    bringing {bringing(g.id)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteGuest(g.id)}
                  aria-label={`Remove ${g.name}`}
                  className="rounded p-1 text-gray-300 hover:text-red-500 dark:text-gray-600"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              value={guestDraft}
              onChange={(e) => setGuestDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onAddGuest(); }}
              placeholder="Name"
              className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={onAddGuest}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white hover:bg-primary-700"
              aria-label="Add guest"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        {(['menu', 'lists', 'schedule'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition-colors',
              tab === t
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'menu' && (
        <PartyMenu
          dishes={party.dishes}
          guests={party.guests}
          onAdd={onAddDish}
          onUpdate={onUpdateDish}
          onDelete={onDeleteDish}
        />
      )}

      {tab !== 'menu' && (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
          {prettyDate(party.date)} — coming next.
        </p>
      )}
    </div>
  );
}
