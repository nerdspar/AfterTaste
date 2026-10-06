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

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlusIcon,
  Trash2Icon,
  UtensilsCrossedIcon,
  LightbulbIcon,
  GripVerticalIcon,
  SearchIcon,
  BookOpenIcon,
} from 'lucide-react';
import { COURSES, orderedCourses, multiplierLabel } from '@/lib/party-types';
import { notesForDish } from '@/lib/party-notes';
import {
  applyDishDrag,
  courseDropId,
  withPlacements,
  type DishPlacement,
} from '@/lib/party-menu-order';
import type {
  PartyDishView, PartyGuestView, PartyNoteView, DishStatus,
} from '@/lib/party-types';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { searchRecipes } from '@/lib/recipe-search';
import { cn } from '@/lib/utils';

interface Props {
  dishes: PartyDishView[];
  guests: PartyGuestView[];
  notes: PartyNoteView[];
  onAdd: (course: string, name: string, recipeId: string | null, status: DishStatus) => void;
  onUpdate: (dishId: string, patch: Partial<PartyDishView>) => void;
  onDelete: (dishId: string) => void;
  /** A whole new ordering, after a drag or a course change. */
  onReorder: (placements: DishPlacement[]) => void;
}

const STATUS_LABEL: Record<DishStatus, string> = {
  confirmed: '',
  maybe: 'maybe',
  idea: 'placeholder',
};

export function PartyMenu({
  dishes, guests, notes, onAdd, onUpdate, onDelete, onReorder,
}: Props) {
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  // Same feel as the grocery list: a small nudge starts a mouse drag, a short
  // press starts a touch one, so scrolling the menu on a phone never picks a
  // dish up by accident.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;
    const placements = applyDishDrag(dishes, String(active.id), String(over.id));
    if (placements) onReorder(placements);
  };

  const draggedDish = dragging ? dishes.find((d) => d.id === dragging) : null;

  // Always show the standard courses, even when empty — a gap in the menu is
  // something you want to see from across the room.
  const courses = orderedCourses([...COURSES, ...dishes.map((d) => d.course)]);
  const guestName = (id: string | null) =>
    id ? (guests.find((g) => g.id === id)?.name ?? null) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e: DragStartEvent) => setDragging(String(e.active.id))}
      onDragCancel={() => setDragging(null)}
      onDragEnd={onDragEnd}
    >
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
                onClick={() => setAdding(adding === course ? null : course)}
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

            <CourseDropZone course={course} isEmpty={inCourse.length === 0}>
            <SortableContext
              items={inCourse.map((d) => d.id)}
              strategy={verticalListSortingStrategy}
            >
            <ul className="space-y-1.5">
              {inCourse.map((dish) => {
                const broughtBy = guestName(dish.broughtById);
                const isEditing = editing === dish.id;
                // What last year said about this exact dish, where the dish
                // is being decided rather than on a notes page.
                const lessons = notesForDish(notes, dish.id);
                return (
                  <SortableDish key={dish.id} dish={dish}>
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
                          <span className="mb-1 block text-[11px] text-gray-500 dark:text-gray-400">
                            Course
                          </span>
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                            value={dish.course}
                            onChange={(e) => {
                              // Same operation as dragging it there, so the
                              // dish lands at the end of its new course and
                              // the old one closes its gap.
                              const placements = applyDishDrag(
                                dishes, dish.id, courseDropId(e.target.value),
                              );
                              if (placements) onReorder(placements);
                            }}
                          >
                            {courses.map((c) => (
                              <option key={c} value={c}>{c}</option>
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
                  </SortableDish>
                );
              })}
            </ul>
            </SortableContext>
            </CourseDropZone>

            {adding === course && (
              <AddDish
                course={course}
                onAdd={(name, recipeId) => {
                  onAdd(course, name, recipeId, 'confirmed');
                  setAdding(null);
                }}
                onCancel={() => setAdding(null)}
              />
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

      <DragOverlay>
        {draggedDish ? (
          <div className="rounded-xl border border-primary-400 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 shadow-lg dark:bg-slate-900 dark:text-gray-100">
            {draggedDish.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Adding a dish: one box that searches your recipes as you type.
 *
 * It was a text field and a dropdown of every recipe, which stops working the
 * moment the box has more than a screenful — and it made attaching a recipe
 * feel like a different act from naming a dish, when they are the same thing
 * with more or less known about it. One field, the same search the rest of the
 * app uses, and whatever you typed stands as a plain name if you ignore the
 * matches.
 */
function AddDish({
  course, onAdd, onCancel,
}: {
  course: string;
  onAdd: (name: string, recipeId: string | null) => void;
  onCancel: () => void;
}) {
  const { recipes } = useRecipeStore();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<{ id: string; title: string } | null>(null);

  const matches = useMemo(
    () => (query.trim().length < 2 ? [] : searchRecipes(recipes, query).slice(0, 6)),
    [recipes, query],
  );

  const submit = () => {
    if (picked) return onAdd(picked.title, picked.id);
    const name = query.trim();
    if (name) onAdd(name, null);
  };

  return (
    <div className="mt-2 rounded-xl border border-primary-300 bg-white p-3 dark:border-primary-500/40 dark:bg-slate-900">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={picked ? picked.title : query}
          onChange={(e) => { setQuery(e.target.value); setPicked(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={`Search recipes, or name a dish for ${course}`}
          aria-label={`Dish for ${course}`}
          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      {picked ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-primary-700 dark:text-primary-300">
          <BookOpenIcon className="h-3 w-3 flex-none" />
          Its ingredients can feed the shopping list.
          <button
            type="button"
            onClick={() => { setPicked(null); setQuery(''); }}
            className="underline decoration-dotted underline-offset-2"
          >
            Use a plain name instead
          </button>
        </p>
      ) : matches.length > 0 ? (
        <ul className="mt-2 max-h-48 overflow-y-auto">
          {matches.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setPicked({ id: r.id, title: r.title })}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <BookOpenIcon className="h-3.5 w-3.5 flex-none text-gray-400" />
                <span className="min-w-0 truncate">{r.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 ? (
        <p className="mt-2 text-[11px] text-gray-400">
          No recipe matches — &ldquo;{query.trim()}&rdquo; will be added as a plain name.
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={submit}
          className="inline-flex h-8 items-center rounded-lg bg-primary-500 px-3 text-xs font-semibold text-white hover:bg-primary-700"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 items-center rounded-lg px-3 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** One dish row, draggable by its handle only. */
function SortableDish({
  dish, children,
}: {
  dish: PartyDishView;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: dish.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={cn(
        'rounded-xl border bg-white px-3 py-2.5 dark:bg-slate-900',
        dish.status === 'confirmed'
          ? 'border-gray-200 dark:border-gray-700/40'
          : 'border-dashed border-gray-300 dark:border-gray-700',
        // The original stays in place as a gap while the overlay follows the
        // finger, so the menu does not jump around under the drag.
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-1.5">
        <span
          // Only the handle starts a drag, so tapping a dish still opens it
          // and the page still scrolls under a finger.
          {...attributes}
          {...listeners}
          role="button"
          tabIndex={0}
          aria-label={`Reorder ${dish.name}`}
          className="-ml-1 mt-0.5 flex-none cursor-grab touch-none p-1 text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
        >
          <GripVerticalIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </li>
  );
}

/**
 * A course's dishes, droppable even when there are none.
 *
 * The empty case is the point: a menu that is still all Mains is exactly when
 * you need to drop something into Sides, and an empty section you cannot drop
 * into would be useless at the moment it matters.
 */
function CourseDropZone({
  course, isEmpty, children,
}: {
  course: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: courseDropId(course) });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl transition-colors',
        isOver && 'bg-primary-500/5 outline outline-2 outline-dashed outline-primary-400/50',
        isEmpty && 'min-h-[3rem]',
      )}
    >
      {children}
    </div>
  );
}
