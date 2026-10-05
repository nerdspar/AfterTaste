import { describe, expect, it } from 'vitest';
import {
  applyDishDrag,
  courseDropId,
  courseFromDropId,
  withPlacements,
} from '@/lib/party-menu-order';
import type { PartyDishView } from '@/lib/party-types';

const dish = (
  over: Partial<PartyDishView> & Pick<PartyDishView, 'id' | 'name' | 'course' | 'position'>,
): PartyDishView => ({
  recipeId: null,
  multiplier: 1,
  instances: 1,
  equipment: null,
  status: 'confirmed',
  broughtById: null,
  ...over,
});

/** The menu as it reads after a drag: course → names in order. */
function layout(dishes: PartyDishView[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const d of [...dishes].sort((a, b) => a.position - b.position)) {
    (out[d.course] ??= []).push(d.name);
  }
  return out;
}

const MENU = [
  dish({ id: 'a', name: 'Turkey', course: 'Mains', position: 0 }),
  dish({ id: 'b', name: 'Stuffing', course: 'Mains', position: 1 }),
  dish({ id: 'c', name: 'Mashed potatoes', course: 'Mains', position: 2 }),
  dish({ id: 'd', name: 'Dates', course: 'Apps', position: 0 }),
];

describe('reordering within a course', () => {
  it('moves a dish up to where it was dropped', () => {
    const placements = applyDishDrag(MENU, 'c', 'a');
    expect(layout(withPlacements(MENU, placements!))).toEqual({
      Mains: ['Mashed potatoes', 'Turkey', 'Stuffing'],
      Apps: ['Dates'],
    });
  });

  it('moves a dish down', () => {
    const placements = applyDishDrag(MENU, 'a', 'c');
    expect(layout(withPlacements(MENU, placements!))).toEqual({
      Mains: ['Stuffing', 'Mashed potatoes', 'Turkey'],
      Apps: ['Dates'],
    });
  });

  it('does nothing when a dish is dropped on itself', () => {
    expect(applyDishDrag(MENU, 'a', 'a')).toBeNull();
  });

  it('leaves positions contiguous', () => {
    const placements = applyDishDrag(MENU, 'c', 'a')!;
    const mains = placements.filter((p) => p.course === 'Mains').map((p) => p.position);
    expect([...mains].sort()).toEqual([0, 1, 2]);
  });
});

describe('moving a dish to another course', () => {
  it('lands it among the dishes it was dropped on', () => {
    // The real ask: mashed potatoes are a side, not a main.
    const placements = applyDishDrag(MENU, 'c', 'd');
    expect(layout(withPlacements(MENU, placements!))).toEqual({
      Mains: ['Turkey', 'Stuffing'],
      Apps: ['Mashed potatoes', 'Dates'],
    });
  });

  it('drops into an empty course', () => {
    // Sides is empty, which is exactly when you need to move something there.
    const placements = applyDishDrag(MENU, 'c', courseDropId('Sides'));
    expect(layout(withPlacements(MENU, placements!))).toEqual({
      Mains: ['Turkey', 'Stuffing'],
      Apps: ['Dates'],
      Sides: ['Mashed potatoes'],
    });
  });

  it('closes the gap in the course it left', () => {
    const placements = applyDishDrag(MENU, 'a', courseDropId('Sides'))!;
    const mains = placements
      .filter((p) => p.course === 'Mains')
      .sort((x, y) => x.position - y.position);
    // Stuffing and mashed potatoes shuffle up to 0 and 1, not 1 and 2.
    expect(mains.map((p) => p.position)).toEqual([0, 1]);
  });

  it('appends to a course that already has dishes', () => {
    const placements = applyDishDrag(MENU, 'a', courseDropId('Apps'));
    expect(layout(withPlacements(MENU, placements!))).toEqual({
      Mains: ['Stuffing', 'Mashed potatoes'],
      Apps: ['Dates', 'Turkey'],
    });
  });

  it('does nothing when dropped on the end of its own course', () => {
    // "c" is already last in Mains, so this is not a move.
    expect(applyDishDrag(MENU, 'c', courseDropId('Mains'))).toBeNull();
  });

  it('moves a dish to the end of its own course from higher up', () => {
    const placements = applyDishDrag(MENU, 'a', courseDropId('Mains'));
    expect(layout(withPlacements(MENU, placements!))).toEqual({
      Mains: ['Stuffing', 'Mashed potatoes', 'Turkey'],
      Apps: ['Dates'],
    });
  });
});

describe('drop zone ids', () => {
  it('round-trips a course name', () => {
    expect(courseFromDropId(courseDropId('Sides'))).toBe('Sides');
  });

  it('does not mistake a dish id for a course', () => {
    // Dish ids are uuids; nothing should read one as a drop zone.
    expect(courseFromDropId('4d5ff538-a003-4adf-8a61-6d570b2b7c52')).toBeNull();
  });

  it('survives a course with a colon in its name', () => {
    expect(courseFromDropId(courseDropId('Drinks: later'))).toBe('Drinks: later');
  });
});

describe('guarding against nonsense', () => {
  it('ignores a drag whose dish has gone', () => {
    expect(applyDishDrag(MENU, 'missing', 'a')).toBeNull();
  });

  it('ignores a drop on something that is neither dish nor course', () => {
    expect(applyDishDrag(MENU, 'a', 'nonsense')).toBeNull();
  });
});
