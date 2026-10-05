'use client';

// The party screen. Holds the party in local state, seeded from the server,
// and applies each change optimistically before the action confirms it —
// the same pattern the recipe, grocery and meal-plan stores use.

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, UsersIcon, PlusIcon, XIcon } from 'lucide-react';
import {
  updateParty, addDish, updateDish, deleteDish, addGuest, deleteGuest,
  addListItem, updateListItem, deleteListItem, setListItemsDone, clearListDone,
  deriveShopping, addTask, updateTask, deleteTask, scheduleListItem,
} from '@/app/(app)/party-actions';
import type {
  PartyView, PartyDishView, PartyListItemView, PartyTaskView, PartyListName, DishStatus,
} from '@/lib/party-types';
import { PartyMenu } from './PartyMenu';
import { PartyLists } from './PartyLists';
import { PartySchedule } from './PartySchedule';
import { descendantIds } from '@/lib/party-lists';
import { cn } from '@/lib/utils';

type Tab = 'menu' | 'lists' | 'schedule';


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
    const tempId = `tmp-${Date.now()}`;
    const temp: PartyDishView = {
      id: tempId, course, position: party.dishes.length,
      recipeId, name, multiplier: 1, instances: 1, equipment: null,
      status, broughtById: null,
    };
    setParty((p) => ({ ...p, dishes: [...p.dishes, temp] }));
    run(async () => {
      const made = await addDish(party.id, { course, name, recipeId, status });
      // Swap the placeholder for the real row, so the next edit to it has a
      // real id to write against — a reload here would lose the open tab.
      setParty((p) => ({
        ...p,
        dishes: p.dishes.map((d) => (d.id === tempId ? made : d)),
      }));
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
      const made = await addGuest(party.id, name);
      setParty((p) => ({ ...p, guests: [...p.guests, made] }));
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


  // --- lists ---------------------------------------------------------------

  const onAddItem = (list: PartyListName, label: string, parentId: string | null) => {
    run(async () => {
      const made = await addListItem(party.id, { list, label, parentId });
      setParty((p) => ({ ...p, items: [...p.items, made] }));
    });
  };

  const onUpdateItem = (itemId: string, patch: Partial<PartyListItemView>) => {
    setParty((p) => ({
      ...p,
      items: p.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
    }));
    run(() => updateListItem(party.id, itemId, patch));
  };

  const onToggleItems = (itemIds: string[], done: boolean) => {
    const ids = new Set(itemIds);
    const taskIds = new Set(
      party.items.filter((i) => ids.has(i.id) && i.taskId).map((i) => i.taskId as string),
    );
    setParty((p) => ({
      ...p,
      items: p.items.map((i) => (ids.has(i.id) ? { ...i, done } : i)),
      tasks: p.tasks.map((t) => (taskIds.has(t.id) ? { ...t, done } : t)),
    }));
    run(() => setListItemsDone(party.id, itemIds, done));
  };

  const onDeleteItem = (itemId: string) => {
    // Deleting a heading takes its contents with it, as the database does.
    const doomed = new Set([itemId, ...descendantIds(party.items, itemId)]);
    setParty((p) => ({ ...p, items: p.items.filter((i) => !doomed.has(i.id)) }));
    run(() => deleteListItem(party.id, itemId));
  };

  /**
   * Promote a list line into the run of show. It lands on the party day with
   * no time yet — picking the day is the cook's call, and an invented time
   * would be a guess sitting in the schedule looking like a decision.
   */
  const onScheduleItem = (itemId: string) => {
    run(async () => {
      const { task, item } = await scheduleListItem(party.id, itemId, {
        dayOffset: 0,
        at: null,
      });
      setParty((p) => ({
        ...p,
        tasks: p.tasks.some((t) => t.id === task.id) ? p.tasks : [...p.tasks, task],
        items: p.items.map((i) => (i.id === item.id ? item : i)),
      }));
    });
  };

  const onClearDone = (list: PartyListName) => {
    setParty((p) => ({
      ...p,
      items: p.items.map((i) => (i.list === list ? { ...i, done: false } : i)),
    }));
    run(() => clearListDone(party.id, list));
  };

  const onDerive = async () => {
    const { added } = await deriveShopping(party.id);
    // The new lines arrive in place. Pressing Pull used to reload, which threw
    // you back to the menu and gave no sign the list had grown.
    if (added.length > 0) setParty((p) => ({ ...p, items: [...p.items, ...added] }));
    return added.length;
  };

  // --- run of show ---------------------------------------------------------

  const onAddTask = (input: {
    label: string; dayOffset: number; at: string | null; dishId: string | null;
  }) => {
    run(async () => {
      const made = await addTask(party.id, input);
      setParty((p) => ({ ...p, tasks: [...p.tasks, made] }));
    });
  };

  const onUpdateTask = (taskId: string, patch: Partial<PartyTaskView>) => {
    setParty((p) => ({
      ...p,
      tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      // The same job on the list, when it is also there.
      items:
        patch.done === undefined
          ? p.items
          : p.items.map((i) => (i.taskId === taskId ? { ...i, done: patch.done as boolean } : i)),
    }));
    run(() => updateTask(party.id, taskId, patch));
  };

  const onDeleteTask = (taskId: string) => {
    setParty((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }));
    run(() => deleteTask(party.id, taskId));
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

      {tab === 'lists' && (
        <PartyLists
          partyId={party.id}
          items={party.items}
          dishes={party.dishes}
          onAdd={onAddItem}
          onUpdate={onUpdateItem}
          onToggle={onToggleItems}
          onDelete={onDeleteItem}
          onDerive={onDerive}
          onClearDone={onClearDone}
          onSchedule={onScheduleItem}
        />
      )}

      {tab === 'schedule' && (
        <PartySchedule
          tasks={party.tasks}
          dishes={party.dishes}
          guests={party.guests}
          serveTime={party.serveTime}
          partyDate={party.date}
          onAdd={onAddTask}
          onUpdate={onUpdateTask}
          onDelete={onDeleteTask}
        />
      )}
    </div>
  );
}
