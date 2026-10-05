'use client';

// What last year taught you, sitting on top of this year's plan.
//
// Shown above the tabs rather than on a page of its own, because a lesson
// filed somewhere tidy is a lesson nobody reads at the moment it would have
// helped. Unapplied notes stay in the way until they are dealt with; applied
// ones fold out of sight but are still there, because next year wants them
// again.

import { useState } from 'react';
import {
  LightbulbIcon,
  PlusIcon,
  Trash2Icon,
  CheckIcon,
  ChevronDownIcon,
} from 'lucide-react';
import { unapplied } from '@/lib/party-notes';
import type { PartyNoteView, PartyDishView, NoteScope } from '@/lib/party-types';
import { cn } from '@/lib/utils';

interface Props {
  notes: PartyNoteView[];
  dishes: PartyDishView[];
  onAdd: (text: string, scope: NoteScope, target: string | null) => void;
  onApply: (noteId: string, applied: boolean) => void;
  onDelete: (noteId: string) => void;
}

export function PartyNotes({ notes, dishes, onAdd, onApply, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [target, setTarget] = useState('');

  const todo = unapplied(notes);
  const done = notes.filter((n) => n.applied);
  const dishName = (id: string | null) =>
    id ? (dishes.find((d) => d.id === id)?.name ?? null) : null;

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    // A note hung on a dish follows that dish; anything else is about the party.
    onAdd(text, target ? 'dish' : 'party', target || null);
    setDraft('');
    setTarget('');
  };

  // Nothing to say and nothing filed: stay out of the way entirely.
  if (notes.length === 0 && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <LightbulbIcon className="h-3.5 w-3.5" />
        Note something for next year
      </button>
    );
  }

  return (
    <div
      className={cn(
        'mb-4 overflow-hidden rounded-2xl border',
        todo.length > 0
          ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'
          : 'border-gray-200 bg-white dark:border-gray-700/40 dark:bg-slate-900',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
      >
        <LightbulbIcon
          className={cn(
            'h-4 w-4 flex-none',
            todo.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400',
          )}
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-sm font-semibold',
              todo.length > 0
                ? 'text-amber-900 dark:text-amber-200'
                : 'text-gray-700 dark:text-gray-200',
            )}
          >
            {todo.length > 0
              ? `${todo.length} ${todo.length === 1 ? 'lesson' : 'lessons'} from last time`
              : 'Notes for next year'}
          </span>
          {!open && todo.length > 0 && (
            <span className="block truncate text-xs text-amber-800/80 dark:text-amber-200/70">
              {todo[0].text}
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 flex-none text-gray-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="border-t border-black/5 px-3.5 py-2.5 dark:border-white/10">
          {notes.length === 0 && (
            <p className="mb-2 text-xs text-gray-400">
              &ldquo;Way too much butter&rdquo;, &ldquo;start the gravy earlier&rdquo;. These come
              across when you copy this party, so next year starts with what you learned.
            </p>
          )}

          <ul className="space-y-1.5">
            {[...todo, ...done].map((note) => (
              <li key={note.id} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => onApply(note.id, !note.applied)}
                  aria-pressed={note.applied}
                  aria-label={note.applied ? 'Not dealt with yet' : 'Dealt with'}
                  title={
                    note.applied
                      ? 'Dealt with — this year’s plan reflects it'
                      : 'Tick once this year’s plan reflects it'
                  }
                  className={cn(
                    'mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border transition-colors',
                    note.applied
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-amber-400 hover:border-amber-500 dark:border-amber-500/60',
                  )}
                >
                  {note.applied && <CheckIcon className="h-3 w-3" strokeWidth={3} />}
                </button>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-xs',
                      note.applied
                        ? 'text-gray-400 line-through dark:text-gray-500'
                        : 'text-amber-900 dark:text-amber-100',
                    )}
                  >
                    {note.text}
                  </span>
                  {note.scope !== 'party' && note.target && (
                    <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                      {note.scope === 'dish'
                        ? (dishName(note.target) ?? 'a dish that has gone')
                        : note.target}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(note.id)}
                  aria-label={`Delete note: ${note.text}`}
                  className="flex-none rounded p-0.5 text-gray-300 hover:text-red-500 dark:text-gray-600"
                >
                  <Trash2Icon className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="What would you do differently?"
              className="h-8 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            {dishes.length > 0 && (
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                aria-label="About"
                className="h-8 flex-none rounded-lg border border-gray-200 bg-white px-1.5 pr-6 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">the party</option>
                {dishes.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={submit}
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary-500 text-white hover:bg-primary-700"
              aria-label="Add note"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
