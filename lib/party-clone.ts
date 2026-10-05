// Working out what a cloned party should contain.
//
// Cloning is the feature the whole thing is built around: the real workflow is
// duplicating last year's note and editing the year. So the copy has to carry
// the schedule, not just the menu — the run of show is the part that took the
// thinking.
//
// Two rules decide everything here:
//
//   - Every reference is rebased onto the new party. A task pointing at last
//     year's turkey row, or a sub-item whose parent is last year's "Clean
//     house", would silently belong to the old party and show up in neither.
//   - Nothing arrives finished. A year-old "have it" is not evidence about this
//     year's pantry, and last year's lessons arrive as prompts, not as things
//     already done.
//
// Kept pure, with ids supplied by the caller, so the remapping can be tested
// without a database — it is fiddly, and getting it wrong loses a year of work
// quietly rather than loudly.

import type { DishStatus, NoteScope, PartyListName } from '@/lib/party-types';

export interface ClonableGuest {
  id: string;
  name: string;
  dietary: string | null;
}

export interface ClonableDish {
  id: string;
  course: string;
  position: number;
  recipeId: string | null;
  name: string;
  multiplier: number;
  instances: number;
  equipment: string | null;
  status: string;
  broughtById: string | null;
}

export interface ClonableTask {
  id: string;
  label: string;
  dayOffset: number;
  at: string | null;
  durationMin: number;
  passive: boolean;
  resource: string;
  ovenTempF: number | null;
  dishId: string | null;
  instance: number;
  assigneeId: string | null;
  position: number;
}

export interface ClonableItem {
  id: string;
  list: string;
  label: string;
  parentId: string | null;
  quantity: string | null;
  category: string | null;
  store: string | null;
  dishId: string | null;
  edited: boolean;
  position: number;
}

export interface ClonableNote {
  id: string;
  text: string;
  scope: string;
  target: string | null;
  position: number;
}

export interface ClonableParty {
  id: string;
  title: string;
  date: string;
  serveTime: string;
  notes: string;
  guests: ClonableGuest[];
  dishes: ClonableDish[];
  tasks: ClonableTask[];
  items: ClonableItem[];
  partyNotes: ClonableNote[];
}

/** Rows ready to be written, with ids already allocated and rebased. */
export interface ClonePlan {
  party: {
    id: string;
    householdId: string;
    title: string;
    subtitle: null;
    date: string;
    serveTime: string;
    notes: string;
    clonedFromId: string;
  };
  guests: {
    id: string; partyId: string; name: string; dietary: string | null; confirmed: boolean;
  }[];
  dishes: {
    id: string; partyId: string; course: string; position: number;
    recipeId: string | null; name: string; multiplier: number; instances: number;
    equipment: string | null; status: string; broughtById: string | null;
  }[];
  tasks: {
    id: string; partyId: string; label: string; dayOffset: number; at: string | null;
    durationMin: number; passive: boolean; resource: string; ovenTempF: number | null;
    dishId: string | null; instance: number; assigneeId: string | null;
    done: boolean; position: number;
  }[];
  /** Parents before children, so the self-reference is always satisfiable. */
  items: {
    id: string; partyId: string; list: string; label: string; parentId: string | null;
    quantity: string | null; category: string | null; store: string | null;
    dishId: string | null; edited: boolean; done: boolean; position: number;
  }[];
  notes: {
    id: string; partyId: string; text: string; scope: string; target: string | null;
    applied: boolean; position: number;
  }[];
}

export interface CloneInput {
  householdId: string;
  title: string;
  date: string;
  serveTime?: string;
}

/**
 * Rebase a reference onto the new party, dropping it if the target did not come
 * across. Dropping beats keeping: a null reads as "unassigned" everywhere,
 * whereas a stale id points into another party's rows.
 */
function rebase(id: string | null, map: Map<string, string>): string | null {
  if (!id) return null;
  return map.get(id) ?? null;
}

/**
 * Lay out the rows for a copy of `src` on a new date.
 *
 * `newId` allocates ids — the database would do this itself, but the plan has
 * to know them in advance to rebase references between the rows it is about to
 * write.
 */
export function planClone(
  src: ClonableParty,
  input: CloneInput,
  newId: () => string,
): ClonePlan {
  const partyId = newId();

  const guestIds = new Map<string, string>();
  const guests = src.guests.map((g) => {
    const id = newId();
    guestIds.set(g.id, id);
    return {
      id,
      partyId,
      name: g.name,
      dietary: g.dietary,
      // Last year's yes is not this year's yes.
      confirmed: false,
    };
  });

  const dishIds = new Map<string, string>();
  const dishes = src.dishes.map((d) => {
    const id = newId();
    dishIds.set(d.id, id);
    return {
      id,
      partyId,
      course: d.course,
      position: d.position,
      recipeId: d.recipeId, // recipes outlive parties, so this one is not rebased
      name: d.name,
      multiplier: d.multiplier,
      instances: d.instances,
      equipment: d.equipment,
      status: d.status,
      broughtById: rebase(d.broughtById, guestIds),
    };
  });

  const tasks = src.tasks.map((t) => ({
    id: newId(),
    partyId,
    label: t.label,
    // The timings are the point of cloning, so they come across untouched.
    dayOffset: t.dayOffset,
    at: t.at,
    durationMin: t.durationMin,
    passive: t.passive,
    resource: t.resource,
    ovenTempF: t.ovenTempF,
    dishId: rebase(t.dishId, dishIds),
    instance: t.instance,
    assigneeId: t.assigneeId, // a user, not a party row
    done: false,
    position: t.position,
  }));

  // Parents first: a child's parentId can only be rebased once the parent has
  // an id, and the write order has to satisfy the self-reference too.
  const itemIds = new Map<string, string>();
  const ordered = [
    ...src.items.filter((i) => !i.parentId),
    ...src.items.filter((i) => i.parentId),
  ];
  const items = ordered.map((i) => {
    const id = newId();
    itemIds.set(i.id, id);
    return {
      id,
      partyId,
      list: i.list,
      label: i.label,
      parentId: rebase(i.parentId, itemIds),
      quantity: i.quantity,
      category: i.category,
      store: i.store,
      dishId: rebase(i.dishId, dishIds),
      // An edit made last year is still a decision; it keeps protecting the
      // line from being recomputed away.
      edited: i.edited,
      done: false,
      position: i.position,
    };
  });

  const notes = src.partyNotes.map((n) => ({
    id: newId(),
    partyId,
    text: n.text,
    scope: n.scope,
    // A dish note points at a row; an ingredient note points at a name, which
    // is why the target is loose in the first place.
    target: n.scope === 'dish' ? rebase(n.target, dishIds) : n.target,
    applied: false,
    position: n.position,
  }));

  return {
    party: {
      id: partyId,
      householdId: input.householdId,
      title: input.title.trim() || src.title,
      subtitle: null, // "the year we…" is this year's to write
      date: input.date,
      serveTime: input.serveTime || src.serveTime,
      notes: src.notes,
      clonedFromId: src.id,
    },
    guests,
    dishes,
    tasks,
    items,
    notes,
  };
}

/** Narrowing helpers for the few places the view types want the union back. */
export function asDishStatus(status: string): DishStatus {
  return status === 'idea' || status === 'maybe' ? status : 'confirmed';
}

export function asListName(list: string): PartyListName {
  return list === 'todo' || list === 'prep' ? list : 'shopping';
}

export function asNoteScope(scope: string): NoteScope {
  return scope === 'dish' || scope === 'ingredient' ? scope : 'party';
}
