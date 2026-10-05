'use client';

// The menu, grouped by course.
//
// Courses are the spine rather than serve times, because that is how a party
// is written down: Apps, Mains, Dessert, Drinks — with empty courses left
// standing, since "we haven't decided dessert" is information worth seeing.
//
// A dish can be an idea with no recipe ("Veggie 1"), a maybe, or assigned to a
// guest who hasn't confirmed. All three exist in a real plan weeks out, and a
// menu that insists on certainty just gets abandoned for a notes app.

import { useState } from 'react';
import { PlusIcon, Trash2Icon, UtensilsCrossedIcon, LightbulbIcon } from 'lucide-react';
import { COURSES, orderedCourses, multiplierLabel } from '@/lib/party-types';
import { notesForDish } from '@/lib/party-notes';
import type {
  PartyDishView, PartyGuestView, PartyNoteView, DishStatus,
} from '@/lib/party-types';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { cn } from '@/lib/utils';

interface Props {
  dishes: PartyDishView[];
  guests: PartyGuestView[];
  notes: PartyNoteView[];
  onAdd: (course: string, name: string, recipeId: string | null, status: DishStatus) => void;
  onUpdate: (dishId: string, patch: Partial<PartyDishView>) => void;
  onDelete: (dishId: string) => void;
}

const STATUS_LABEL: Record<DishStatus, string> = {
  confirmed: '',
  maybe: 'maybe',
  idea: 'placeholder',
};

export function PartyMenu({ dishes, guests, notes, onAdd, onUpdate, onDelete }: Props) {
  const { recipes } = useRecipeStore();
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftRecipe, setDraftRecipe] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  // Always show the standard courses, even when empty — a gap in the menu is
  // something you want to see from across the room.
  const courses = orderedCourses([...COURSES, ...dishes.map((d) => d.course)]);
  const guestName = (id: string | null) =>
    id ? (guests.find((g) => g.id === id)?.name ?? null) : null;

  const submit = (course: string) => {
    const recipe = recipes.find((r) => r.id === draftRecipe);
    const name = recipe ? recipe.title : draft.trim();
    if (!name) return;
    onAdd(course, name, recipe?.id ?? null, draft.trim() && !recipe ? 'confirmed' : 'confirmed');
    setDraft('');
    setDraftRecipe('');
    setAdding(null);
  };

  return (
    <div className="space-y-6">
      {courses.map((course) => {
        const inCourse = dishes
          .filter((d) => d.course === course)
          .sort((a, b) => a.position - b.position);

        return (
          <section key={course}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {course}
              </h2>
              <button
                type="button"
                onClick={() => { setAdding(course); setDraft(''); setDraftRecipe(''); }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                aria-label={`Add a dish to ${course}`}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            {inCourse.length === 0 && adding !== course && (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-3 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
                Nothing yet
              </p>
            )}

            <ul className="space-y-1.5">
              {inCourse.map((dish) => {
                const broughtBy = guestName(dish.broughtById);
                const isEditing = editing === dish.id;
                // What last year said about this exact dish, where the dish
                // is being decided rather than on a notes page.
                const lessons = notesForDish(notes, dish.id);
                return (
                  <li
                    key={dish.id}
                    className={cn(
                      'rounded-xl border bg-white px-3 py-2.5 dark:bg-slate-900',
                      dish.status === 'confirmed'
                        ? 'border-gray-200 dark:border-gray-700/40'
                        : 'border-dashed border-gray-300 dark:border-gray-700',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {multiplierLabel(dish.multiplier) && (
                        <span className="flex-none rounded-full border border-primary-200 px-1.5 py-0.5 font-mono text-[10px] text-primary-600 dark:border-primary-500/40 dark:text-primary-300">
                          {multiplierLabel(dish.multiplier)}
                        </span>
                      )}
                      {broughtBy && (
                        <span className="flex-none rounded-full border border-amber-300 px-1.5 py-0.5 text-[10px] text-amber-700 dark:border-amber-500/40 dark:text-amber-400">
                          {broughtBy}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing(isEditing ? null : dish.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className={cn(
                          'block truncate text-sm font-medium',
                          dish.status === 'confirmed'
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-500 dark:text-gray-400',
                        )}>
                          {dish.name}
                        </span>
                        <span className="block truncate text-[11px] text-gray-400 dark:text-gray-500">
                          {[
                            STATUS_LABEL[dish.status],
                            dish.instances > 1 && `${dish.instances} separate`,
                            dish.equipment,
                            dish.recipeId && 'recipe attached',
                          ].filter(Boolean).join(' · ') || ' '}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(dish.id)}
                        aria-label={`Remove ${dish.name}`}
                        className="flex-none rounded-lg p-1.5 text-gray-300 hover:bg-gray-100 hover:text-red-500 dark:text-gray-600 dark:hover:bg-gray-800"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {lessons.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {lessons.map((n) => (
                          <li
                            key={n.id}
                            className={cn(
                              'flex items-start gap-1 text-[11px]',
                              n.applied
                                ? 'text-gray-400 dark:text-gray-600'
                                : 'text-amber-700 dark:text-amber-400',
                            )}
                          >
                            <LightbulbIcon className="mt-px h-2.5 w-2.5 flex-none" />
                            <span>{n.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {isEditing && (
                      <div className="mt-3 grid gap-2 border-t border-gray-100 pt-3 sm:grid-cols-2 dark:border-gray-800">
                        <label className="block">
                          <span className="mb-1 block text-[11px] text-gray-500 dark:text-gray-400">
                            Recipe multiple
                          </span>
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                            value={dish.multiplier}
                            onChange={(e) => onUpdate(dish.id, { multiplier: Number(e.target.value) })}
                          >
                            {[0.5, 1, 1.5, 2, 2.5, 3, 4].map((m) => (
                              <option key={m} value={m}>{m}× recipe</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] text-gray-500 dark:text-gray-400">
                            Separate batches
                          </span>
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                            value={dish.instances}
                            onChange={(e) => onUpdate(dish.id, { instances: Number(e.target.value) })}
                          >
                            {[1, 2, 3, 4].map((n) => (
                              <option key={n} value={n}>
                                {n === 1 ? 'one' : `${n} — cooked separately`}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] text-gray-500 dark:text-gray-400">Status</span>
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                            value={dish.status}
                            onChange={(e) => onUpdate(dish.id, { status: e.target.value as DishStatus })}
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="maybe">Maybe</option>
                            <option value="idea">Placeholder</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] text-gray-500 dark:text-gray-400">
                            Who&apos;s bringing it
                          </span>
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                            value={dish.broughtById ?? ''}
                            onChange={(e) => onUpdate(dish.id, { broughtById: e.target.value || null })}
                          >
                            <option value="">Us</option>
                            {guests.map((g) => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </label>
                        {dish.broughtById && (
                          <p className="text-[11px] text-gray-400 sm:col-span-2 dark:text-gray-500">
                            Costs nothing on the shopping list, still takes oven time when it arrives.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {adding === course && (
              <div className="mt-2 rounded-xl border border-primary-300 bg-white p-3 dark:border-primary-500/40 dark:bg-slate-900">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setDraftRecipe(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(course); }}
                  placeholder="Charcuterie, Veggie 1, …"
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <p className="mt-2 mb-1 text-[11px] text-gray-500 dark:text-gray-400">
                  …or attach one of your recipes
                </p>
                <select
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  value={draftRecipe}
                  onChange={(e) => { setDraftRecipe(e.target.value); setDraft(''); }}
                >
                  <option value="">No recipe — just a name</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => submit(course)}
                    className="h-8 rounded-lg bg-primary-500 px-3 text-xs font-semibold text-white hover:bg-primary-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdding(null)}
                    className="h-8 rounded-lg px-3 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {dishes.length === 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-3 text-xs text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
          <UtensilsCrossedIcon className="h-4 w-4 flex-none" />
          Attach recipes, or just type a name — a dish doesn&apos;t need to be decided yet.
        </p>
      )}
    </div>
  );
}
