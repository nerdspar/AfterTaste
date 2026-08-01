'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/aftertaste/Card';
import { cn } from '@/lib/utils';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import {
  useMealPlan,
  parsePlanEntry,
} from '@/components/aftertaste/MealPlanStoreProvider';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  StickyNoteIcon,
  XIcon,
  LayersIcon,
  PlusIcon,
  CheckIcon,
} from 'lucide-react';
import Image from 'next/image';
import { RecipePlaceholder } from '@/components/aftertaste/RecipePlaceholder';
import { hasRecipePhoto } from '@/lib/recipe-image';
import Link from 'next/link';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

// Rolling 7-day week: today is always the first column. `offset` pages a full
// week forward/back.
function getWeekDates(offset: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatDateRange(dates: Date[]) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${fmt.format(dates[0])} - ${fmt.format(dates[6])}, ${dates[0].getFullYear()}`;
}

// Indexed by Date.getDay() (0 = Sunday) since columns now roll from today.
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type PlanKey = string;

function MealPlannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { recipes, getRecipe } = useRecipeStore();
  const { plan, addRecipe, setNote, removeAt } = useMealPlan();
  const [weekOffset, setWeekOffset] = useState(0);
  const [pickingSlot, setPickingSlot] = useState<PlanKey | null>(null);
  const [fannedSlot, setFannedSlot] = useState<PlanKey | null>(null);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [noteText, setNoteText] = useState('');

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const filteredRecipes = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        (r.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [recipes, pickerQuery]);

  // Arriving from a recipe's "Add to Meal Plan" enters a mode where clicking a
  // slot drops that recipe straight in, instead of opening the recipe picker.
  useEffect(() => {
    const add = searchParams.get('add');
    if (add) {
      setPendingRecipeId(add);
      setPickingSlot(null);
      router.replace('/meal-planner', { scroll: false });
    }
  }, [searchParams, router]);

  const pendingRecipe = pendingRecipeId ? getRecipe(pendingRecipeId) : null;

  const makeKey = (dayIdx: number, meal: string) => {
    // Use the local calendar date (not toISOString, which is UTC and would
    // shift the key across the day boundary depending on time zone / time of
    // day, so the same slot could get different keys).
    const d = weekDates[dayIdx];
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}_${meal}`;
  };

  // Values in a slot, ordered, each tagged with its array index for removal.
  const slotEntries = (slotKey: string) =>
    (plan[slotKey] ?? []).map((value, index) => ({
      index,
      entry: parsePlanEntry(value),
    }));

  // The picker modal is where you add a recipe (or note) to a slot.
  const openPicker = (slotKey: string) => {
    setPickingSlot(slotKey);
    setFannedSlot(null);
    setPickerQuery('');
    const note = slotEntries(slotKey).find((e) => e.entry?.type === 'note');
    setNoteText(note?.entry?.type === 'note' ? note.entry.text : '');
  };

  const closePicker = () => {
    setPickingSlot(null);
    setPickerQuery('');
    setNoteText('');
  };

  const openFan = (slotKey: string) => {
    setFannedSlot(slotKey);
    setPickingSlot(null);
  };
  const closeFan = () => setFannedSlot(null);

  // In the picker, tapping a recipe toggles it in/out of the slot. Adding keeps
  // the picker open so a main + sides can be added in one go.
  const toggleRecipe = (slotKey: string, recipeId: string) => {
    const idx = (plan[slotKey] ?? []).indexOf(recipeId);
    if (idx >= 0) removeAt(slotKey, idx);
    else addRecipe(slotKey, recipeId);
  };

  const saveNote = () => {
    if (!pickingSlot) return;
    setNote(pickingSlot, noteText); // empty text removes the note
  };

  const handleSlotClick = (slotKey: string) => {
    if (pendingRecipeId) {
      addRecipe(slotKey, pendingRecipeId);
      setPendingRecipeId(null);
      return;
    }
    // Filled slot → fan its recipes out in place; empty slot → open the picker.
    if ((plan[slotKey]?.length ?? 0) > 0) {
      setFannedSlot((cur) => (cur === slotKey ? null : slotKey));
    } else {
      openPicker(slotKey);
    }
  };

  // If the fanned slot becomes empty (last recipe removed), close the fan.
  useEffect(() => {
    if (fannedSlot && !plan[fannedSlot]?.length) setFannedSlot(null);
  }, [fannedSlot, plan]);

  // Lock background scroll while the picker modal is open so it doesn't drag
  // behind the modal.
  useEffect(() => {
    if (!pickingSlot) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pickingSlot]);

  // "Sat, Aug 1 · Dinner" from a `<YYYY-MM-DD>_<meal>` slot key.
  const slotLabel = (slotKey: string) => {
    const us = slotKey.lastIndexOf('_');
    const [y, m, d] = slotKey.slice(0, us).split('-').map(Number);
    const meal = slotKey.slice(us + 1);
    const label = new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return `${label} · ${meal}`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Meal Planner
      </h1>

      {pendingRecipe && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary-300 bg-primary-500/5 px-4 py-2.5 dark:border-primary-500/40 dark:bg-primary-500/10">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Adding{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {pendingRecipe.title}
            </span>{' '}
            — pick a slot
          </p>
          <button
            type="button"
            onClick={() => setPendingRecipeId(null)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
            </button>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatDateRange(weekDates)}
            </h2>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="text-xs text-secondary-500 hover:text-secondary-700 font-medium"
            >
              This Week
            </button>
          )}
        </div>

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header row */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div />
              {weekDates.map((date, i) => {
                const isToday =
                  date.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className="text-center py-1">
                    <p
                      className={cn(
                        'text-xs font-medium',
                        isToday
                          ? 'text-primary-500'
                          : 'text-gray-500 dark:text-gray-400',
                      )}
                    >
                      {WEEKDAY_SHORT[date.getDay()]}
                    </p>
                    <p
                      className={cn(
                        'text-[11px] tabular-nums',
                        isToday
                          ? 'text-primary-500 font-semibold'
                          : 'text-gray-400 dark:text-gray-500',
                      )}
                    >
                      {date.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Meal rows */}
            {MEAL_TYPES.map((meal) => (
              <div key={meal} className="grid grid-cols-8 gap-2 mb-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 py-3 pr-2 flex items-center">
                  {meal}
                </div>
                {weekDates.map((_, dayIdx) => {
                  const key = makeKey(dayIdx, meal);
                  const entries = slotEntries(key);
                  const recipeEntries = entries.flatMap((e) => {
                    if (e.entry?.type !== 'recipe') return [];
                    const r = getRecipe(e.entry.recipeId);
                    return r ? [{ index: e.index, recipe: r }] : [];
                  });
                  const noteEntry = entries.find(
                    (e) => e.entry?.type === 'note',
                  );
                  const noteLabel =
                    noteEntry?.entry?.type === 'note' ? noteEntry.entry.text : '';
                  const count = recipeEntries.length + (noteEntry ? 1 : 0);
                  const isPicking = pickingSlot === key;

                  // Empty slot — tap to open the editor.
                  if (count === 0) {
                    const slotActive = isPicking || pendingRecipeId !== null;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => handleSlotClick(key)}
                        className={cn(
                          'h-16 rounded-xl border border-dashed flex items-center justify-center transition-colors',
                          isPicking
                            ? 'border-primary-500 bg-primary-500/5 dark:bg-primary-500/10'
                            : pendingRecipeId
                              ? 'border-primary-300 bg-primary-500/5 hover:border-primary-500 dark:border-primary-500/40 dark:bg-primary-500/10'
                              : 'border-gray-200 dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/20 hover:border-gray-300 dark:hover:border-gray-600',
                        )}
                      >
                        <span
                          className={cn(
                            'text-xs',
                            slotActive
                              ? 'text-primary-500'
                              : 'text-gray-300 dark:text-gray-600',
                          )}
                        >
                          +
                        </span>
                      </button>
                    );
                  }

                  // Filled slot — the tile fans its recipes out in place.
                  const primary = recipeEntries[0]?.recipe;
                  const isFanned = fannedSlot === key;
                  return (
                    <div key={key} className="relative">
                      <button
                        type="button"
                        onClick={() => handleSlotClick(key)}
                        aria-label={`Open ${meal} plan`}
                        className={cn(
                          'h-16 w-full rounded-xl border overflow-hidden relative text-left transition-shadow',
                          primary
                            ? 'border-gray-200 dark:border-gray-700/40 bg-white dark:bg-gray-800/40'
                            : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-1.5',
                          isFanned && 'ring-2 ring-primary-500',
                          count > 1 &&
                            'shadow-[3px_3px_0_0_#e5e7eb] dark:shadow-[3px_3px_0_0_#1e293b]',
                        )}
                      >
                        {primary ? (
                          <>
                            {hasRecipePhoto(primary.image) ? (
                              <Image
                                src={primary.image}
                                alt={primary.title}
                                fill
                                className="object-cover opacity-80"
                                sizes="80px"
                              />
                            ) : (
                              <RecipePlaceholder className="absolute inset-0 w-full h-full opacity-80" />
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-white/85 to-transparent dark:from-black/70 pointer-events-none" />
                            <div className="relative p-1.5 h-full flex flex-col justify-end">
                              <p className="text-[9px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
                                {primary.title.split(' ').slice(0, 3).join(' ')}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <StickyNoteIcon className="w-3 h-3 text-amber-500 dark:text-amber-400 mb-0.5" />
                            <p className="text-[9px] font-medium text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight">
                              {noteLabel}
                            </p>
                          </>
                        )}

                        {count > 1 && (
                          <span className="absolute top-1 right-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 h-4 text-[9px] font-bold text-white tabular-nums">
                            <LayersIcon className="w-2.5 h-2.5" />
                            {count}
                          </span>
                        )}
                      </button>

                      {/* Fan-out: recipes spread from the tile; tap one to open
                          it, or the + to add another. */}
                      {isFanned && (
                        <>
                          <button
                            type="button"
                            aria-label="Close"
                            onClick={closeFan}
                            className="fixed inset-0 z-40 cursor-default"
                          />
                          <div className="absolute left-1/2 top-1 z-50 w-40 -translate-x-1/2 space-y-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl duration-200 animate-in fade-in zoom-in-95 dark:border-gray-700 dark:bg-slate-900">
                            {recipeEntries.map(({ index, recipe }, i) => (
                              <div
                                key={index}
                                className="relative animate-in fade-in slide-in-from-top-1"
                                style={{
                                  animationDelay: `${i * 45}ms`,
                                  animationFillMode: 'backwards',
                                }}
                              >
                                <Link
                                  href={`/recipes/${recipe.id}`}
                                  onClick={closeFan}
                                  className="flex items-center gap-2 rounded-lg p-1 pr-6 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                >
                                  <span className="relative w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                                    {hasRecipePhoto(recipe.image) ? (
                                      <Image
                                        src={recipe.image}
                                        alt=""
                                        fill
                                        className="object-cover"
                                        sizes="32px"
                                      />
                                    ) : (
                                      <RecipePlaceholder className="absolute inset-0 w-full h-full" />
                                    )}
                                  </span>
                                  <span className="min-w-0 text-[11px] font-medium leading-tight text-gray-900 dark:text-gray-100 line-clamp-2">
                                    {recipe.title}
                                  </span>
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => removeAt(key, index)}
                                  aria-label={`Remove ${recipe.title}`}
                                  className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-red-500"
                                >
                                  <XIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}

                            {noteEntry?.entry?.type === 'note' && (
                              <div
                                className="relative animate-in fade-in slide-in-from-top-1"
                                style={{
                                  animationDelay: `${recipeEntries.length * 45}ms`,
                                  animationFillMode: 'backwards',
                                }}
                              >
                                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-1 pr-6 dark:bg-amber-500/10">
                                  <StickyNoteIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                  <span className="min-w-0 text-[11px] leading-tight text-gray-800 dark:text-gray-100 line-clamp-2">
                                    {noteEntry.entry.text}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAt(key, noteEntry.index)}
                                  aria-label="Remove note"
                                  className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-red-500"
                                >
                                  <XIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => openPicker(key)}
                              style={{
                                animationDelay: `${count * 45}ms`,
                                animationFillMode: 'backwards',
                              }}
                              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-1.5 text-[11px] font-medium text-gray-500 animate-in fade-in slide-in-from-top-1 hover:border-primary-400 hover:text-primary-500 dark:border-gray-600 dark:text-gray-400"
                            >
                              <PlusIcon className="w-3.5 h-3.5" />
                              Add
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Picker modal: add a recipe or note to a slot */}
      {pickingSlot && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={closePicker}
            className="absolute inset-0 bg-black/40 animate-in fade-in"
          />
          <div className="relative z-10 flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-4 shadow-xl animate-in fade-in slide-in-from-bottom-4 dark:border-gray-700 dark:bg-slate-900 sm:max-w-lg sm:rounded-2xl sm:zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Add to {slotLabel(pickingSlot)}
              </h3>
              <button
                type="button"
                onClick={closePicker}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                Done
              </button>
            </div>

          {/* Custom note (e.g. eating out) */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Eating out or something else? Add a note
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveNote();
                  }
                }}
                placeholder="e.g. Dinner out, Leftovers, Order pizza"
                className={cn(
                  'flex-1 min-w-0 h-9 px-3 rounded-lg text-sm',
                  'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
                )}
              />
              <button
                type="button"
                onClick={saveNote}
                disabled={!noteText.trim()}
                className={cn(
                  'h-9 px-4 rounded-lg text-sm font-medium transition-colors flex-shrink-0',
                  'bg-primary-500 text-white hover:bg-primary-700',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary-500',
                )}
              >
                Save
              </button>
            </div>
          </div>

          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Add a recipe
          </p>

          {/* Recipe search */}
          <div className="relative mb-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search recipes..."
              className={cn(
                'w-full h-9 pl-9 pr-3 rounded-lg text-sm',
                'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
              )}
            />
          </div>

          {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {filteredRecipes.map((recipe) => {
                const selected = (plan[pickingSlot] ?? []).includes(recipe.id);
                return (
                  <button
                    type="button"
                    key={recipe.id}
                    onClick={() => toggleRecipe(pickingSlot, recipe.id)}
                    aria-pressed={selected}
                    className={cn(
                      'overflow-hidden rounded-xl border text-left transition-all',
                      selected
                        ? 'border-primary-500 ring-2 ring-primary-500'
                        : 'border-gray-200 dark:border-gray-700/40 hover:ring-2 hover:ring-primary-500/40',
                    )}
                  >
                    <div className="relative h-16">
                      {hasRecipePhoto(recipe.image) ? (
                        <Image
                          src={recipe.image}
                          alt={recipe.title}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      ) : (
                        <RecipePlaceholder className="absolute inset-0 w-full h-full" />
                      )}
                      {selected && (
                        <>
                          <div className="absolute inset-0 bg-primary-500/25" />
                          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-white shadow">
                            <CheckIcon className="w-3 h-3" />
                          </span>
                        </>
                      )}
                    </div>
                    <div className="p-1.5">
                      <p className="text-[10px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
                        {recipe.title}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {recipe.cookTime} · {recipe.calories} kcal
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
              No recipes match “{pickerQuery}”.
            </p>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MealPlannerPage() {
  return (
    <Suspense>
      <MealPlannerContent />
    </Suspense>
  );
}
