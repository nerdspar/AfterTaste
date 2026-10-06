'use client';

// The party's three lists: what to buy, what the house needs, what can be
// cooked ahead.
//
// The shopping list is derived from the menu and then overruled. That order
// matters: the app's aggregate is a starting point, and the cook's "1 stick is
// probably plenty" has to win permanently, so a line anyone has touched is
// marked and never recomputed. Pulling from the menu again only adds what is
// genuinely new, which is what makes it safe to press twice.
//
// The other two nest, because "clean house" is not one job.

import { useEffect, useState } from 'react';
import {
  PlusIcon,
  Trash2Icon,
  SparklesIcon,
  LoaderIcon,
  CornerDownRightIcon,
  RotateCcwIcon,
  CheckIcon,
  CalendarPlusIcon,
  LinkIcon,
  LightbulbIcon,
} from 'lucide-react';
import { buildListTree, groupShopping, listProgress, descendantIds, type ListNode } from '@/lib/party-lists';
import { notesForIngredient } from '@/lib/party-notes';
import type {
  PartyListItemView, PartyListName, PartyDishView, PartyNoteView,
} from '@/lib/party-types';
import { shoppingSources } from '@/app/(app)/party-actions';
import { cn } from '@/lib/utils';

interface Props {
  partyId: string;
  items: PartyListItemView[];
  dishes: PartyDishView[];
  notes: PartyNoteView[];
  onAdd: (list: PartyListName, label: string, parentId: string | null) => void;
  onUpdate: (itemId: string, patch: Partial<PartyListItemView>) => void;
  onToggle: (itemIds: string[], done: boolean) => void;
  onDelete: (itemId: string) => void;
  onDerive: () => Promise<number>;
  onClearDone: (list: PartyListName) => void;
  /** Give a line a place in the run of show, keeping the two the same job. */
  onSchedule: (itemId: string) => void;
  /** Take it back off, keeping the line. */
  onUnschedule: (itemId: string) => void;
}

const TABS: { key: PartyListName; label: string }[] = [
  { key: 'shopping', label: 'Shopping' },
  { key: 'todo', label: 'To-do' },
  { key: 'prep', label: 'Prep ahead' },
];

export function PartyLists({
  partyId, items, dishes, notes, onAdd, onUpdate, onToggle, onDelete, onDerive,
  onClearDone, onSchedule, onUnschedule,
}: Props) {
  const [list, setList] = useState<PartyListName>('shopping');
  const [draft, setDraft] = useState('');
  const [childOf, setChildOf] = useState<string | null>(null);
  const [childDraft, setChildDraft] = useState('');
  const [deriving, setDeriving] = useState(false);
  const [derived, setDerived] = useState<string | null>(null);
  const [sources, setSources] = useState<Record<string, { dishName: string; quantity: string }[]>>({});
  const [openLine, setOpenLine] = useState<string | null>(null);

  const mine = items.filter((i) => i.list === list);
  // The counter above tracks jobs; this button clears headings too, so it has
  // to count what it will actually change.
  const ticked = mine.filter((i) => i.done).length;
  const recipeDishes = dishes.filter((d) => d.recipeId && !d.broughtById).length;

  // The breakdown is only fetched for the shopping list, and only once: it is
  // explanatory, not something the list needs in order to render.
  useEffect(() => {
    if (list !== 'shopping') return;
    let cancelled = false;
    shoppingSources(partyId)
      .then((s) => { if (!cancelled) setSources(s); })
      .catch((err) => console.error('[party] breakdown failed', err));
    return () => { cancelled = true; };
  }, [partyId, list, items.length]);

  const submit = (parentId: string | null) => {
    const value = parentId ? childDraft.trim() : draft.trim();
    if (!value) return;
    onAdd(list, value, parentId);
    if (parentId) { setChildDraft(''); setChildOf(null); } else setDraft('');
  };

  const toggle = (item: PartyListItemView) => {
    // A heading and its contents never disagree.
    onToggle([item.id, ...descendantIds(mine, item.id)], !item.done);
  };

  const derive = async () => {
    setDeriving(true);
    setDerived(null);
    try {
      const added = await onDerive();
      setDerived(
        added === 0
          ? 'Nothing new — the list already covers the menu'
          : `Added ${added} ${added === 1 ? 'line' : 'lines'}`,
      );
    } catch {
      setDerived('Could not read the menu');
    } finally {
      setDeriving(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const count = listProgress(items.filter((i) => i.list === t.key));
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => { setList(t.key); setDraft(''); setChildOf(null); }}
              className={cn(
                'flex-none rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                list === t.key
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
              )}
            >
              {t.label}
              {count.total > 0 && (
                <span className="ml-1.5 tabular-nums opacity-60">
                  {count.done}/{count.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {list === 'shopping' && (
        <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700/40 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Build it from the menu
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {recipeDishes === 0
                  ? 'Attach a recipe to a dish and its ingredients can land here.'
                  : `${recipeDishes} ${recipeDishes === 1 ? 'dish has' : 'dishes have'} a recipe. Anything you've edited stays as it is.`}
              </p>
            </div>
            <button
              type="button"
              onClick={derive}
              disabled={deriving || recipeDishes === 0}
              className="inline-flex h-9 flex-none items-center gap-1.5 rounded-lg bg-primary-500 px-3 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
            >
              {deriving ? (
                <LoaderIcon className="h-4 w-4 animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4" />
              )}
              Pull
            </button>
          </div>
          {derived && <p className="mt-2 text-xs text-primary-700 dark:text-primary-300">{derived}</p>}
        </div>
      )}

      {mine.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
          {list === 'shopping'
            ? 'Nothing to buy yet.'
            : list === 'todo'
              ? 'Nothing to do yet — "clean house", "set the table".'
              : 'Nothing to make ahead yet.'}
        </p>
      ) : list === 'shopping' ? (
        <div className="space-y-4">
          {groupShopping(mine).map((group) => (
            <section key={group.category}>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {group.category}
              </h3>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-700/40">
                {group.items.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    from={sources[item.label.toLowerCase().trim()]}
                    notes={notesForIngredient(notes, item.label)}
                    open={openLine === item.id}
                    onOpen={() => setOpenLine(openLine === item.id ? null : item.id)}
                    onToggle={() => toggle(item)}
                    onUpdate={(patch) => onUpdate(item.id, patch)}
                    onDelete={() => onDelete(item.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700/40">
          {buildListTree(mine).map((node) => (
            <TaskRow
              key={node.item.id}
              node={node}
              depth={0}
              addingUnder={childOf}
              childDraft={childDraft}
              setChildDraft={setChildDraft}
              onAddUnder={setChildOf}
              onSubmitChild={() => submit(childOf)}
              onToggle={toggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onSchedule={onSchedule}
              onUnschedule={onUnschedule}
            />
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(null); }}
          placeholder={list === 'shopping' ? 'Add to the list…' : 'Add a job…'}
          className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={() => submit(null)}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary-500 text-white hover:bg-primary-700"
          aria-label="Add item"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {ticked > 0 && (
        <button
          type="button"
          onClick={() => onClearDone(list)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <RotateCcwIcon className="h-3 w-3" />
          Untick all {ticked}
        </button>
      )}
    </div>
  );
}

/** One shopping line, with the working-out behind its quantity on demand. */
function ShoppingRow({
  item, from, notes, open, onOpen, onToggle, onUpdate, onDelete,
}: {
  item: PartyListItemView;
  from?: { dishName: string; quantity: string }[];
  notes: PartyNoteView[];
  open: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onUpdate: (patch: Partial<PartyListItemView>) => void;
  onDelete: () => void;
}) {
  const [quantity, setQuantity] = useState(item.quantity ?? '');
  const [editingQty, setEditingQty] = useState(false);

  return (
    <li className="px-3 py-2">
      {/* The name gets its own line and the amount sits under it. A phone row
          could not hold both, and "4½ stalks" was being cut to "4½ stalk" —
          a quantity you cannot read is worse than no quantity. */}
      <div className="flex items-start gap-2.5">
        <Tick done={item.done} onToggle={onToggle} label={item.label} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setEditingQty(true)}
            title="Set an amount"
            className={cn(
              'block w-full truncate text-left text-sm',
              item.done
                ? 'text-gray-400 line-through dark:text-gray-600'
                : 'text-gray-900 dark:text-gray-100',
            )}
          >
            {item.label}
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* A box on every row made the list look like a form. The amount
                reads as text until you touch it, and a line with no amount
                offers a quiet way to add one. */}
            {editingQty ? (
              <input
                autoFocus
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onBlur={() => {
                  setEditingQty(false);
                  if (quantity !== (item.quantity ?? '')) onUpdate({ quantity, edited: true });
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                placeholder="how much?"
                aria-label={`Amount of ${item.label}`}
                className="min-h-[1.75rem] w-28 flex-none py-1 rounded-md border border-gray-200 bg-transparent px-1.5 text-xs tabular-nums text-gray-600 dark:border-gray-700 dark:text-gray-300"
              />
            ) : (
              // No amount means nothing is shown. A placeholder on every line
              // is the same clutter the input boxes were — the name is what
              // you read in an aisle. Tap the line to put a number on it.
              item.quantity && (
                <button
                  type="button"
                  onClick={() => setEditingQty(true)}
                  aria-label={`Change the amount of ${item.label}`}
                  className="flex-none rounded px-1 text-xs tabular-nums text-gray-600 dark:text-gray-300"
                >
                  {item.quantity}
                </button>
              )
            )}

            {from && from.length > 1 && (
              <button
                type="button"
                onClick={onOpen}
                className="flex-none rounded px-1 text-[11px] text-primary-700 underline decoration-dotted underline-offset-2 dark:text-primary-300"
                aria-expanded={open}
              >
                {from.length} dishes
              </button>
            )}
            {/* "Yours" only means something against a line the app worked out.
                On a line you typed it is just noise — of course it is yours. */}
            {item.edited && item.dishId && (
              <span
                className="flex-none text-[10px] uppercase tracking-wide text-gray-300 dark:text-gray-600"
                title="You changed this, so pulling from the menu leaves it alone"
              >
                yours
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${item.label}`}
          className="flex-none rounded p-1 text-gray-300 hover:text-red-500 dark:text-gray-600"
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </button>
      </div>

      {notes.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {notes.map((n) => (
            <li
              key={n.id}
              className={cn(
                'flex items-start gap-1 text-[11px]',
                n.applied ? 'text-gray-400 dark:text-gray-600' : 'text-amber-700 dark:text-amber-400',
              )}
            >
              <LightbulbIcon className="mt-px h-2.5 w-2.5 flex-none" />
              {/* The reminder turns up where the decision gets made, which is
                  standing in the aisle looking at this line. */}
              <span>{n.text}</span>
            </li>
          ))}
        </ul>
      )}

      {open && from && (
        <ul className="mt-1.5 space-y-0.5 border-l-2 border-gray-100 pl-3 dark:border-gray-800">
          {from.map((f, i) => (
            <li key={`${f.dishName}-${i}`} className="flex justify-between gap-2 text-[11px] text-gray-400">
              <span className="truncate">{f.dishName}</span>
              <span className="flex-none tabular-nums">{f.quantity}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** One job, and whatever it decomposes into. */
function TaskRow({
  node, depth, addingUnder, childDraft, setChildDraft,
  onAddUnder, onSubmitChild, onToggle, onUpdate, onDelete, onSchedule, onUnschedule,
}: {
  node: ListNode;
  depth: number;
  addingUnder: string | null;
  childDraft: string;
  setChildDraft: (v: string) => void;
  onAddUnder: (id: string | null) => void;
  onSubmitChild: () => void;
  onToggle: (item: PartyListItemView) => void;
  onUpdate: (itemId: string, patch: Partial<PartyListItemView>) => void;
  onDelete: (itemId: string) => void;
  onSchedule: (itemId: string) => void;
  onUnschedule: (itemId: string) => void;
}) {
  const { item, children } = node;

  return (
    <>
      <li
        className="flex items-center gap-2.5 border-b border-gray-100 px-3 py-2 last:border-0 dark:border-gray-800"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <Tick done={item.done} onToggle={() => onToggle(item)} label={item.label} />
        <input
          defaultValue={item.label}
          onBlur={(e) => {
            const label = e.target.value.trim();
            if (label && label !== item.label) onUpdate(item.id, { label });
          }}
          aria-label="Job"
          className={cn(
            'min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus:outline-none',
            item.done
              ? 'text-gray-400 line-through dark:text-gray-600'
              : 'text-gray-900 dark:text-gray-100',
          )}
        />
        {children.length === 0 && (
          item.taskId ? (
            <button
              type="button"
              onClick={() => onUnschedule(item.id)}
              aria-label={`Take ${item.label} off the run of show`}
              title="In the run of show — tap to take it off, keeping the job here"
              className="flex-none rounded p-1 text-primary-600 hover:text-red-500 dark:text-primary-400"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSchedule(item.id)}
              aria-label={`Put ${item.label} in the run of show`}
              title="Give it a time in the run of show"
              className="flex-none rounded p-1 text-gray-300 hover:text-primary-600 dark:text-gray-600 dark:hover:text-primary-400"
            >
              <CalendarPlusIcon className="h-3.5 w-3.5" />
            </button>
          )
        )}
        {depth < 2 && (
          <button
            type="button"
            onClick={() => onAddUnder(addingUnder === item.id ? null : item.id)}
            aria-label={`Add something under ${item.label}`}
            className="flex-none rounded p-1 text-gray-300 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-300"
          >
            <CornerDownRightIcon className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          aria-label={`Remove ${item.label}`}
          className="flex-none rounded p-1 text-gray-300 hover:text-red-500 dark:text-gray-600"
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </button>
      </li>

      {addingUnder === item.id && (
        <li
          className="border-b border-gray-100 px-3 py-2 dark:border-gray-800"
          style={{ paddingLeft: `${32 + depth * 20}px` }}
        >
          <input
            autoFocus
            value={childDraft}
            onChange={(e) => setChildDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmitChild();
              if (e.key === 'Escape') onAddUnder(null);
            }}
            placeholder={`Under ${item.label}…`}
            className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </li>
      )}

      {children.map((kid) => (
        <TaskRow
          key={kid.item.id}
          node={kid}
          depth={depth + 1}
          addingUnder={addingUnder}
          childDraft={childDraft}
          setChildDraft={setChildDraft}
          onAddUnder={onAddUnder}
          onSubmitChild={onSubmitChild}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onSchedule={onSchedule}
          onUnschedule={onUnschedule}
        />
      ))}
    </>
  );
}

function Tick({ done, onToggle, label }: { done: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={done ? `Untick ${label}` : `Tick ${label}`}
      className={cn(
        'flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-colors',
        done
          ? 'border-primary-500 bg-primary-500 text-white'
          : 'border-gray-300 hover:border-gray-400 dark:border-gray-600',
      )}
    >
      {done && <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  );
}
