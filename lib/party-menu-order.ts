// Moving dishes around the menu.
//
// Two things have to work: reordering within a course, and moving a dish to a
// different one. They are the same gesture — you drag "Mashed potatoes" from
// Mains and drop it among the Sides — so they are one operation here rather
// than a reorder and a separate "change course" that happen to look alike.
//
// Dropping onto an empty course has to work too. A menu's empty courses are
// shown on purpose ("we haven't decided dessert"), and a Sides section you
// cannot drop into is exactly the one you need when the menu is still Mains
// with everything in it.

import type { PartyDishView } from '@/lib/party-types';

/** The id a course's drop zone carries, kept distinct from any dish id. */
export const courseDropId = (course: string) => `course:${course}`;

/** The course a drop zone id refers to, or null if it is not one. */
export function courseFromDropId(id: string): string | null {
  return id.startsWith('course:') ? id.slice('course:'.length) : null;
}

export interface DishPlacement {
  id: string;
  course: string;
  position: number;
}

/**
 * Where every dish ends up after one drag.
 *
 * Returns placements for the whole menu rather than just the moved dish:
 * positions are only meaningful relative to their neighbours, and writing one
 * row leaves the rest describing an order that no longer exists.
 *
 * `overId` is either another dish (take its course, land where it is) or a
 * course's drop zone (join that course at the end).
 */
export function applyDishDrag(
  dishes: PartyDishView[],
  activeId: string,
  overId: string,
): DishPlacement[] | null {
  const active = dishes.find((d) => d.id === activeId);
  if (!active) return null;

  const droppedOnCourse = courseFromDropId(overId);
  const over = droppedOnCourse === null ? dishes.find((d) => d.id === overId) : undefined;
  if (droppedOnCourse === null && !over) return null;

  const targetCourse = droppedOnCourse ?? (over as PartyDishView).course;

  // Nothing to do when a dish is dropped back exactly where it started.
  if (over && over.id === active.id) return null;
  if (droppedOnCourse !== null && active.course === targetCourse) {
    const inCourse = ordered(dishes, targetCourse);
    if (inCourse[inCourse.length - 1]?.id === active.id) return null;
  }

  // Rebuild the target course with the dish inserted where it was dropped.
  const without = ordered(dishes, targetCourse).filter((d) => d.id !== active.id);
  const moved = { ...active, course: targetCourse };

  let inserted: PartyDishView[];
  if (!over) {
    inserted = [...without, moved];
  } else if (active.course === targetCourse) {
    // Within a course this is a straight reorder, and reorders are asymmetric:
    // dragging something down past a dish puts it after that dish, dragging it
    // up puts it before. Inserting at the target's index both ways would make
    // a downward drag land one short of where the finger let go.
    const list = ordered(dishes, targetCourse);
    const from = list.findIndex((d) => d.id === active.id);
    const to = list.findIndex((d) => d.id === over.id);
    if (from === -1 || to === -1 || from === to) return null;
    inserted = [...list];
    inserted.splice(to, 0, inserted.splice(from, 1)[0]);
  } else {
    // Arriving from another course, it takes the target's place and pushes it
    // down — there is no gap being left behind to account for.
    const at = without.findIndex((d) => d.id === over.id);
    inserted = at === -1
      ? [...without, moved]
      : [...without.slice(0, at), moved, ...without.slice(at)];
  }

  const placements: DishPlacement[] = inserted.map((d, i) => ({
    id: d.id,
    course: targetCourse,
    position: i,
  }));

  // The course it left has to close its gap, or later drops land oddly.
  if (active.course !== targetCourse) {
    const source = ordered(dishes, active.course).filter((d) => d.id !== active.id);
    placements.push(
      ...source.map((d, i) => ({ id: d.id, course: active.course, position: i })),
    );
  }

  return placements;
}

/** One course's dishes, in the order they are shown. */
function ordered(dishes: PartyDishView[], course: string): PartyDishView[] {
  return dishes
    .filter((d) => d.course === course)
    .sort((a, b) => a.position - b.position);
}

/** Apply placements to a dish list, for the optimistic update. */
export function withPlacements(
  dishes: PartyDishView[],
  placements: DishPlacement[],
): PartyDishView[] {
  const by = new Map(placements.map((p) => [p.id, p]));
  return dishes.map((d) => {
    const p = by.get(d.id);
    return p ? { ...d, course: p.course, position: p.position } : d;
  });
}
