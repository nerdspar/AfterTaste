'use server';

import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/session';
import {
  deriveShoppingLines,
  freshShoppingLines,
  type ShoppingDish,
} from '@/lib/party-shopping';
import {
  planClone,
  asDishStatus,
  asListName,
  asNoteScope,
} from '@/lib/party-clone';
import { guessGroceryCategory } from '@/lib/grocery-category';
import type {
  PartyView,
  PartySummary,
  DishStatus,
  PartyListName,
  PartyDishView,
  PartyGuestView,
  PartyListItemView,
  PartyTaskView,
} from '@/lib/party-types';
import type { Ingredient } from '@/data/sample/recipes';

// Every read and write is scoped to the session's household, the same way
// data-actions.ts does it: a write against an existing row uses
// `where: { id, householdId }` so a forged id can never reach another
// household's party.

async function ownParty(partyId: string) {
  const { householdId, userId } = await requireSession();
  const party = await prisma.party.findFirst({
    where: { id: partyId, householdId },
    select: { id: true },
  });
  if (!party) throw new Error('Party not found');
  return { householdId, userId, partyId: party.id };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function loadParty(partyId: string): Promise<PartyView | null> {
  const { householdId } = await requireSession();
  const p = await prisma.party.findFirst({
    where: { id: partyId, householdId },
    include: {
      guests: { orderBy: { name: 'asc' } },
      dishes: { orderBy: [{ course: 'asc' }, { position: 'asc' }] },
      tasks: {
        orderBy: [{ dayOffset: 'asc' }, { position: 'asc' }],
        include: { listItem: { select: { list: true } } },
      },
      items: { orderBy: { position: 'asc' } },
      partyNotes: { orderBy: { position: 'asc' } },
    },
  });
  if (!p) return null;

  return {
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    date: p.date,
    serveTime: p.serveTime,
    notes: p.notes,
    clonedFromId: p.clonedFromId,
    guests: p.guests.map((g) => ({
      id: g.id, name: g.name, dietary: g.dietary, confirmed: g.confirmed,
    })),
    dishes: p.dishes.map((d) => ({
      id: d.id, course: d.course, position: d.position, recipeId: d.recipeId,
      name: d.name, multiplier: d.multiplier, instances: d.instances,
      equipment: d.equipment, status: asDishStatus(d.status),
      broughtById: d.broughtById,
    })),
    tasks: p.tasks.map((t) =>
      asTaskView(t, t.listItem ? asListName(t.listItem.list) : null),
    ),
    items: p.items.map(asItemView),
    partyNotes: p.partyNotes.map((n) => ({
      id: n.id, text: n.text, scope: asNoteScope(n.scope),
      target: n.target, applied: n.applied, position: n.position,
    })),
  };
}

export async function listParties(): Promise<PartySummary[]> {
  const { householdId } = await requireSession();
  const rows = await prisma.party.findMany({
    where: { householdId },
    orderBy: { date: 'desc' },
    include: { _count: { select: { dishes: true, guests: true } } },
  });
  return rows.map((p) => ({
    id: p.id, title: p.title, date: p.date, serveTime: p.serveTime,
    dishCount: p._count.dishes, guestCount: p._count.guests,
  }));
}

/** Parties on given dates, for the meal planner to show a day has one. */
export async function partiesForDates(
  dates: string[],
): Promise<Record<string, PartySummary>> {
  const { householdId } = await requireSession();
  if (dates.length === 0) return {};
  const rows = await prisma.party.findMany({
    where: { householdId, date: { in: dates } },
    include: { _count: { select: { dishes: true, guests: true } } },
  });
  return Object.fromEntries(
    rows.map((p) => [
      p.date,
      { id: p.id, title: p.title, date: p.date, serveTime: p.serveTime,
        dishCount: p._count.dishes, guestCount: p._count.guests },
    ]),
  );
}

// ---------------------------------------------------------------------------
// Party
// ---------------------------------------------------------------------------

export async function createParty(input: {
  title: string; date: string; serveTime?: string;
}): Promise<string> {
  const { householdId } = await requireSession();
  const party = await prisma.party.create({
    data: {
      householdId,
      title: input.title.trim() || 'Party',
      date: input.date,
      serveTime: input.serveTime || '18:00',
    },
  });
  return party.id;
}

export async function updateParty(
  partyId: string,
  patch: { title?: string; subtitle?: string; date?: string; serveTime?: string; notes?: string },
): Promise<void> {
  const { householdId } = await ownParty(partyId);
  await prisma.party.updateMany({ where: { id: partyId, householdId }, data: patch });
}

export async function deleteParty(partyId: string): Promise<void> {
  const { householdId } = await ownParty(partyId);
  await prisma.party.deleteMany({ where: { id: partyId, householdId } });
}

/**
 * Copy a party onto a new date.
 *
 * Carries the menu, the guests, the lists and — the point of the exercise —
 * the tasks with their timings, so next year starts from the schedule you
 * worked out rather than from a blank Saturday. Last year's notes come across
 * unapplied, as prompts against the new plan.
 *
 * Ticked-off state does not come with it: a year-old "have it" is not evidence
 * about this year's pantry.
 */
export async function cloneParty(input: {
  sourceId: string; title: string; date: string; serveTime?: string;
}): Promise<string> {
  const { householdId } = await requireSession();
  const src = await prisma.party.findFirst({
    where: { id: input.sourceId, householdId },
    include: { guests: true, dishes: true, tasks: true, items: true, partyNotes: true },
  });
  if (!src) throw new Error('Party not found');

  // What to write is worked out first, ids and all, so the rebasing is one
  // testable step and the write is a plain insert in dependency order.
  const plan = planClone(src, { householdId, ...input }, () => randomUUID());

  await prisma.$transaction([
    prisma.party.create({ data: plan.party }),
    prisma.party_Guest.createMany({ data: plan.guests }),
    prisma.partyDish.createMany({ data: plan.dishes }),
    prisma.partyTask.createMany({ data: plan.tasks }),
    prisma.partyListItem.createMany({ data: plan.items }),
    prisma.partyNote.createMany({ data: plan.notes }),
  ]);

  return plan.party.id;
}

// ---------------------------------------------------------------------------
// Dishes, guests, tasks, list items, notes
// ---------------------------------------------------------------------------

export async function addDish(
  partyId: string,
  input: { course: string; name: string; recipeId?: string | null; status?: DishStatus },
): Promise<PartyDishView> {
  await ownParty(partyId);
  const count = await prisma.partyDish.count({ where: { partyId, course: input.course } });
  const d = await prisma.partyDish.create({
    data: {
      partyId, course: input.course, name: input.name.trim() || 'Dish',
      recipeId: input.recipeId ?? null, status: input.status ?? 'confirmed',
      position: count,
    },
  });
  return {
    id: d.id, course: d.course, position: d.position, recipeId: d.recipeId,
    name: d.name, multiplier: d.multiplier, instances: d.instances,
    equipment: d.equipment, status: asDishStatus(d.status), broughtById: d.broughtById,
  };
}

export async function updateDish(
  partyId: string,
  dishId: string,
  patch: {
    name?: string; course?: string; multiplier?: number; instances?: number;
    equipment?: string | null; status?: DishStatus; broughtById?: string | null;
    recipeId?: string | null;
  },
): Promise<void> {
  await ownParty(partyId);
  await prisma.partyDish.updateMany({ where: { id: dishId, partyId }, data: patch });
}

export async function deleteDish(partyId: string, dishId: string): Promise<void> {
  await ownParty(partyId);
  await prisma.partyDish.deleteMany({ where: { id: dishId, partyId } });
}

export async function addGuest(partyId: string, name: string): Promise<PartyGuestView> {
  await ownParty(partyId);
  const g = await prisma.party_Guest.create({
    data: { partyId, name: name.trim() || 'Guest' },
  });
  return { id: g.id, name: g.name, dietary: g.dietary, confirmed: g.confirmed };
}

export async function updateGuest(
  partyId: string,
  guestId: string,
  patch: { name?: string; dietary?: string | null; confirmed?: boolean },
): Promise<void> {
  await ownParty(partyId);
  await prisma.party_Guest.updateMany({ where: { id: guestId, partyId }, data: patch });
}

export async function deleteGuest(partyId: string, guestId: string): Promise<void> {
  await ownParty(partyId);
  await prisma.party_Guest.deleteMany({ where: { id: guestId, partyId } });
}

export async function addTask(
  partyId: string,
  input: {
    label: string; dayOffset?: number; at?: string | null; durationMin?: number;
    passive?: boolean; resource?: string; ovenTempF?: number | null;
    dishId?: string | null; instance?: number;
  },
): Promise<PartyTaskView> {
  await ownParty(partyId);
  const count = await prisma.partyTask.count({ where: { partyId } });
  const t = await prisma.partyTask.create({
    data: {
      partyId, label: input.label.trim() || 'Task',
      dayOffset: input.dayOffset ?? 0, at: input.at ?? null,
      durationMin: input.durationMin ?? 0, passive: input.passive ?? false,
      resource: input.resource ?? 'none', ovenTempF: input.ovenTempF ?? null,
      dishId: input.dishId ?? null, instance: input.instance ?? 1,
      position: count,
    },
  });
  return asTaskView(t);
}

export async function updateTask(
  partyId: string,
  taskId: string,
  patch: {
    label?: string; dayOffset?: number; at?: string | null; durationMin?: number;
    passive?: boolean; resource?: string; ovenTempF?: number | null;
    assigneeId?: string | null; done?: boolean;
  },
): Promise<void> {
  await ownParty(partyId);
  await prisma.$transaction([
    prisma.partyTask.updateMany({ where: { id: taskId, partyId }, data: patch }),
    // The other half of the same job, when there is one.
    ...(patch.done === undefined
      ? []
      : [
          prisma.partyListItem.updateMany({
            where: { partyId, taskId },
            data: { done: patch.done },
          }),
        ]),
  ]);
}

export async function deleteTask(partyId: string, taskId: string): Promise<void> {
  await ownParty(partyId);
  await prisma.partyTask.deleteMany({ where: { id: taskId, partyId } });
}

export async function addListItem(
  partyId: string,
  input: {
    list: PartyListName; label: string; parentId?: string | null;
    quantity?: string | null; category?: string | null; store?: string | null;
  },
): Promise<PartyListItemView> {
  await ownParty(partyId);
  const count = await prisma.partyListItem.count({ where: { partyId, list: input.list } });
  const label = input.label.trim() || 'Item';
  const i = await prisma.partyListItem.create({
    data: {
      partyId, list: input.list, label,
      parentId: input.parentId ?? null, quantity: input.quantity ?? null,
      // A line typed by hand belongs to whoever typed it, so a later pull from
      // the menu leaves it alone.
      category: input.category ?? guessGroceryCategory(label),
      store: input.store ?? null,
      edited: true, position: count,
    },
  });
  return asItemView(i);
}

export async function updateListItem(
  partyId: string,
  itemId: string,
  patch: {
    label?: string; quantity?: string | null; category?: string | null;
    store?: string | null; done?: boolean; parentId?: string | null;
  },
): Promise<void> {
  await ownParty(partyId);
  // Anything a person touches is theirs from then on, so a later re-derive
  // leaves it alone. This is what protects "1 stick is probably plenty".
  const marksEdited =
    patch.label !== undefined || patch.quantity !== undefined || patch.category !== undefined;
  await prisma.partyListItem.updateMany({
    where: { id: itemId, partyId },
    data: marksEdited ? { ...patch, edited: true } : patch,
  });
}

export async function deleteListItem(partyId: string, itemId: string): Promise<void> {
  await ownParty(partyId);
  await prisma.partyListItem.deleteMany({ where: { id: itemId, partyId } });
}

export async function addNote(
  partyId: string,
  input: { text: string; scope?: 'party' | 'dish' | 'ingredient'; target?: string | null },
): Promise<void> {
  await ownParty(partyId);
  const count = await prisma.partyNote.count({ where: { partyId } });
  await prisma.partyNote.create({
    data: {
      partyId, text: input.text.trim(), scope: input.scope ?? 'party',
      target: input.target ?? null, position: count,
    },
  });
}

export async function setNoteApplied(
  partyId: string,
  noteId: string,
  applied: boolean,
): Promise<void> {
  await ownParty(partyId);
  await prisma.partyNote.updateMany({ where: { id: noteId, partyId }, data: { applied } });
}

export async function deleteNote(partyId: string, noteId: string): Promise<void> {
  await ownParty(partyId);
  await prisma.partyNote.deleteMany({ where: { id: noteId, partyId } });
}

/** One list row as the screens read it. */
function asItemView(i: {
  id: string; list: string; label: string; parentId: string | null;
  quantity: string | null; category: string | null; store: string | null;
  dishId: string | null; edited: boolean; done: boolean; position: number;
  taskId: string | null;
}): PartyListItemView {
  return {
    id: i.id, list: asListName(i.list), label: i.label, parentId: i.parentId,
    quantity: i.quantity, category: i.category, store: i.store,
    dishId: i.dishId, edited: i.edited, done: i.done, position: i.position,
    taskId: i.taskId,
  };
}

/** One run-of-show step as the screens read it. */
function asTaskView(t: {
  id: string; label: string; dayOffset: number; at: string | null;
  durationMin: number; passive: boolean; resource: string; ovenTempF: number | null;
  dishId: string | null; instance: number; assigneeId: string | null;
  done: boolean; position: number;
}, fromList: PartyListName | null = null): PartyTaskView {
  return {
    id: t.id, label: t.label, dayOffset: t.dayOffset, at: t.at,
    durationMin: t.durationMin, passive: t.passive, resource: t.resource,
    ovenTempF: t.ovenTempF, dishId: t.dishId, instance: t.instance,
    assigneeId: t.assigneeId, done: t.done, position: t.position, fromList,
  };
}

/** The menu as the shopping derivation needs to see it. */
async function dishesForDerivation(partyId: string): Promise<ShoppingDish[]> {
  const dishes = await prisma.partyDish.findMany({
    where: { partyId },
    include: { recipe: { select: { ingredients: true } } },
  });
  return dishes.map((d) => ({
    id: d.id,
    name: d.name,
    multiplier: d.multiplier,
    instances: d.instances,
    // A guest-brought dish costs oven time, not money.
    broughtByGuest: d.broughtById !== null,
    ingredients: (d.recipe?.ingredients as Ingredient[] | undefined) ?? [],
  }));
}

/**
 * Tick (or untick) a row and everything nested under it in one write.
 *
 * "Clean house" being done means the kitchen is done, and a sub-list that
 * disagrees with its heading is the kind of thing that makes a list untrusted.
 */
export async function setListItemsDone(
  partyId: string,
  itemIds: string[],
  done: boolean,
): Promise<void> {
  await ownParty(partyId);
  if (itemIds.length === 0) return;

  // A line that is also a step in the run of show is one job, not two. Ticking
  // it in the kitchen has to tick it on the list, or the two drift and both
  // stop being trusted.
  const linked = await prisma.partyListItem.findMany({
    where: { partyId, id: { in: itemIds }, taskId: { not: null } },
    select: { taskId: true },
  });
  const taskIds = linked.map((l) => l.taskId as string);

  await prisma.$transaction([
    prisma.partyListItem.updateMany({
      where: { partyId, id: { in: itemIds } },
      data: { done },
    }),
    ...(taskIds.length > 0
      ? [prisma.partyTask.updateMany({ where: { partyId, id: { in: taskIds } }, data: { done } })]
      : []),
  ]);
}

/**
 * Give a list line a place in the run of show.
 *
 * "Make the gravy base" lives on the prep list and also happens at 7pm on the
 * Friday — writing it twice means ticking it twice and, eventually, two
 * versions of the plan. So the line keeps its place on the list and gains a
 * step, and the two stay the same job.
 */
export async function scheduleListItem(
  partyId: string,
  itemId: string,
  input: { dayOffset: number; at: string | null },
): Promise<{ task: PartyTaskView; item: PartyListItemView }> {
  await ownParty(partyId);
  const item = await prisma.partyListItem.findFirst({
    where: { id: itemId, partyId },
  });
  if (!item) throw new Error('Item not found');
  if (item.taskId) {
    const existing = await prisma.partyTask.findFirst({ where: { id: item.taskId, partyId } });
    if (existing) {
      return { task: asTaskView(existing, asListName(item.list)), item: asItemView(item) };
    }
  }

  const count = await prisma.partyTask.count({ where: { partyId } });
  const task = await prisma.partyTask.create({
    data: {
      partyId,
      label: item.label,
      dayOffset: input.dayOffset,
      at: input.at,
      dishId: item.dishId,
      done: item.done,
      position: count,
    },
  });
  const linked = await prisma.partyListItem.update({
    where: { id: item.id },
    data: { taskId: task.id },
  });
  return { task: asTaskView(task, asListName(item.list)), item: asItemView(linked) };
}

/** Clear the ticks on one list, for the next shop or the next party. */
export async function clearListDone(partyId: string, list: PartyListName): Promise<void> {
  await ownParty(partyId);
  const linked = await prisma.partyListItem.findMany({
    where: { partyId, list, done: true, taskId: { not: null } },
    select: { taskId: true },
  });
  const taskIds = linked.map((l) => l.taskId as string);
  await prisma.$transaction([
    prisma.partyListItem.updateMany({
      where: { partyId, list, done: true },
      data: { done: false },
    }),
    ...(taskIds.length > 0
      ? [prisma.partyTask.updateMany({ where: { partyId, id: { in: taskIds } }, data: { done: false } })]
      : []),
  ]);
}

/**
 * Where each derived shopping line came from, keyed by label.
 *
 * Recomputed rather than stored: the breakdown is only meaningful against the
 * current menu, and a stored one would quietly describe a dish that has since
 * been scaled or dropped. An aggregate that reads wrong in a supermarket aisle
 * is only debuggable if it can show its working-out.
 */
export async function shoppingSources(
  partyId: string,
): Promise<Record<string, { dishName: string; quantity: string }[]>> {
  await ownParty(partyId);
  const lines = deriveShoppingLines(await dishesForDerivation(partyId));
  return Object.fromEntries(
    lines
      .filter((l) => l.from.length > 1 || !l.summed)
      .map((l) => [
        l.label.toLowerCase().trim(),
        l.from.map((f) => ({ dishName: f.dishName, quantity: f.quantity })),
      ]),
  );
}

// ---------------------------------------------------------------------------
// Deriving the shopping list
// ---------------------------------------------------------------------------

/**
 * Add shopping lines for everything the menu needs.
 *
 * Additive and non-destructive: lines a person has touched are left exactly as
 * they are, and a line that already exists for an ingredient is skipped rather
 * than overwritten. Running it twice does nothing the second time, which is
 * what makes it safe to offer as a button.
 */
export async function deriveShopping(
  partyId: string,
): Promise<{ added: PartyListItemView[] }> {
  await ownParty(partyId);

  const lines = deriveShoppingLines(await dishesForDerivation(partyId));
  if (lines.length === 0) return { added: [] };

  const existing = await prisma.partyListItem.findMany({
    where: { partyId, list: 'shopping' },
    select: { label: true },
  });

  const fresh = freshShoppingLines(lines, existing.map((e) => e.label));
  if (fresh.length === 0) return { added: [] };

  const base = await prisma.partyListItem.count({ where: { partyId, list: 'shopping' } });
  // Returned rather than counted, so the screen can show the new lines without
  // a reload throwing the cook back to the top of the party.
  const made = await prisma.partyListItem.createManyAndReturn({
    data: fresh.map((l, i) => ({
      partyId,
      list: 'shopping',
      label: l.label,
      quantity: l.quantity,
      category: l.category,
      // One source dish is recorded; the full breakdown is recomputed for
      // display rather than denormalised here.
      dishId: l.from[0]?.dishId ?? null,
      edited: false,
      position: base + i,
    })),
  });
  return { added: made.map(asItemView) };
}
