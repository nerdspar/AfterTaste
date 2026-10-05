import { describe, expect, it } from 'vitest';
import {
  planClone,
  type ClonableParty,
  type ClonableDish,
  type ClonableItem,
  type ClonableTask,
} from '@/lib/party-clone';

/** Predictable ids, so a test can say "the second dish" and mean it. */
function ids() {
  let n = 0;
  return () => `new${++n}`;
}

const dish = (over: Partial<ClonableDish> & Pick<ClonableDish, 'id' | 'name'>): ClonableDish => ({
  course: 'Mains',
  position: 0,
  recipeId: null,
  multiplier: 1,
  instances: 1,
  equipment: null,
  status: 'confirmed',
  broughtById: null,
  ...over,
});

const task = (over: Partial<ClonableTask> & Pick<ClonableTask, 'id' | 'label'>): ClonableTask => ({
  dayOffset: 0,
  at: null,
  durationMin: 0,
  passive: false,
  resource: 'none',
  ovenTempF: null,
  dishId: null,
  instance: 1,
  assigneeId: null,
  position: 0,
  ...over,
});

const item = (over: Partial<ClonableItem> & Pick<ClonableItem, 'id' | 'label'>): ClonableItem => ({
  list: 'shopping',
  parentId: null,
  quantity: null,
  category: null,
  store: null,
  dishId: null,
  edited: false,
  position: 0,
  taskId: null,
  ...over,
});

const party = (over: Partial<ClonableParty> = {}): ClonableParty => ({
  id: 'old',
  title: 'Friendsgiving 2025',
  date: '2025-11-22',
  serveTime: '17:30',
  notes: '',
  guests: [],
  dishes: [],
  tasks: [],
  items: [],
  partyNotes: [],
  ...over,
});

const INPUT = { householdId: 'h1', title: 'Friendsgiving 2026', date: '2026-11-21' };

describe('planning a party clone', () => {
  it('carries the run of show with its timings', () => {
    const plan = planClone(
      party({
        tasks: [
          task({ id: 't1', label: 'Dough out of fridge', dayOffset: 0, at: '15:00' }),
          task({ id: 't2', label: 'Turkey in', at: '13:00', durationMin: 210, resource: 'oven', ovenTempF: 325 }),
        ],
      }),
      INPUT,
      ids(),
    );

    // The schedule is the part that took the thinking; it is why you clone.
    expect(plan.tasks.map((t) => [t.label, t.at, t.durationMin])).toEqual([
      ['Dough out of fridge', '15:00', 0],
      ['Turkey in', '13:00', 210],
    ]);
    expect(plan.tasks[1].ovenTempF).toBe(325);
  });

  it('rebases every reference onto the new party', () => {
    const plan = planClone(
      party({
        guests: [{ id: 'g1', name: 'Pat', dietary: 'no nuts' }],
        dishes: [
          dish({ id: 'd1', name: 'Turkey' }),
          dish({ id: 'd2', name: 'Pecan pie', broughtById: 'g1' }),
        ],
        tasks: [task({ id: 't1', label: 'Turkey in', dishId: 'd1' })],
        items: [item({ id: 'i1', label: 'butter', dishId: 'd1' })],
        partyNotes: [{ id: 'n1', text: 'too much butter', scope: 'dish', target: 'd1', position: 0 }],
      }),
      INPUT,
      ids(),
    );

    const turkey = plan.dishes[0].id;
    const pat = plan.guests[0].id;

    expect(plan.dishes[1].broughtById).toBe(pat);
    expect(plan.tasks[0].dishId).toBe(turkey);
    expect(plan.items[0].dishId).toBe(turkey);
    expect(plan.notes[0].target).toBe(turkey);
    // Nothing may still point at last year's rows.
    for (const id of [plan.dishes[1].broughtById, plan.tasks[0].dishId, plan.items[0].dishId]) {
      expect(id).not.toBe('d1');
      expect(id).not.toBe('g1');
    }
  });

  it('nests list items under their new parents, parents first', () => {
    const plan = planClone(
      party({
        items: [
          // Deliberately out of order: the source has no ordering guarantee.
          item({ id: 'i2', label: 'Kitchen', list: 'todo', parentId: 'i1' }),
          item({ id: 'i1', label: 'Clean house', list: 'todo' }),
          item({ id: 'i3', label: 'Cabinets', list: 'todo', parentId: 'i2' }),
        ],
      }),
      INPUT,
      ids(),
    );

    const byLabel = Object.fromEntries(plan.items.map((i) => [i.label, i]));
    expect(byLabel['Kitchen'].parentId).toBe(byLabel['Clean house'].id);
    // A parent must be written before the child that references it.
    const order = plan.items.map((i) => i.label);
    expect(order.indexOf('Clean house')).toBeLessThan(order.indexOf('Kitchen'));
  });

  it('drops a reference whose target did not come across', () => {
    const plan = planClone(
      party({
        dishes: [dish({ id: 'd1', name: 'Pie', broughtById: 'ghost' })],
        tasks: [task({ id: 't1', label: 'Reheat', dishId: 'ghost' })],
      }),
      INPUT,
      ids(),
    );

    // Null reads as "unassigned"; a stale id points into another party's rows.
    expect(plan.dishes[0].broughtById).toBeNull();
    expect(plan.tasks[0].dishId).toBeNull();
  });

  it('keeps an ingredient note pointing at its name, not at a row', () => {
    const plan = planClone(
      party({
        dishes: [dish({ id: 'd1', name: 'Stuffing' })],
        partyNotes: [{ id: 'n1', text: '1 stick is plenty', scope: 'ingredient', target: 'butter', position: 0 }],
      }),
      INPUT,
      ids(),
    );

    expect(plan.notes[0].target).toBe('butter');
  });

  it('arrives with nothing already done', () => {
    const plan = planClone(
      party({
        guests: [{ id: 'g1', name: 'Pat', dietary: null }],
        tasks: [task({ id: 't1', label: 'Brine turkey' })],
        items: [item({ id: 'i1', label: 'butter' })],
        partyNotes: [{ id: 'n1', text: 'start the gravy earlier', scope: 'party', target: null, position: 0 }],
      }),
      INPUT,
      ids(),
    );

    // A year-old "have it" is not evidence about this year's pantry.
    expect(plan.items[0].done).toBe(false);
    expect(plan.tasks[0].done).toBe(false);
    expect(plan.guests[0].confirmed).toBe(false);
    // Last year's lesson is a prompt against this year's plan, not a tick.
    expect(plan.notes[0].applied).toBe(false);
  });

  it('keeps a scheduled prep line attached to its step', () => {
    const plan = planClone(
      party({
        tasks: [task({ id: 't1', label: 'Make the gravy base', dayOffset: -1, at: '19:00' })],
        items: [item({ id: 'i1', label: 'Make the gravy base', list: 'prep', taskId: 't1' })],
      }),
      INPUT,
      ids(),
    );

    // One job, not two — and still one job next year.
    expect(plan.items[0].taskId).toBe(plan.tasks[0].id);
    expect(plan.items[0].taskId).not.toBe('t1');
  });

  it('drops a link whose step did not come across', () => {
    const plan = planClone(
      party({ items: [item({ id: 'i1', label: 'Orphan', taskId: 'gone' })] }),
      INPUT,
      ids(),
    );

    expect(plan.items[0].taskId).toBeNull();
  });

  it('keeps an edited line protected after the clone', () => {
    const plan = planClone(
      party({ items: [item({ id: 'i1', label: 'butter', quantity: '1 stick', edited: true })] }),
      INPUT,
      ids(),
    );

    // The edit was a decision; it should still fend off a re-derive next year.
    expect(plan.items[0].edited).toBe(true);
    expect(plan.items[0].quantity).toBe('1 stick');
  });

  it('takes the new name and date, and records where it came from', () => {
    const plan = planClone(party({ notes: 'park on the street' }), INPUT, ids());

    expect(plan.party.title).toBe('Friendsgiving 2026');
    expect(plan.party.date).toBe('2026-11-21');
    expect(plan.party.serveTime).toBe('17:30'); // inherited when not given
    expect(plan.party.notes).toBe('park on the street');
    expect(plan.party.clonedFromId).toBe('old');
    // "The year we…" is this year's line to write.
    expect(plan.party.subtitle).toBeNull();
  });

  it('falls back to the old title rather than creating an untitled party', () => {
    const plan = planClone(party(), { ...INPUT, title: '   ' }, ids());
    expect(plan.party.title).toBe('Friendsgiving 2025');
  });

  it('keeps the recipe link, which outlives the party', () => {
    const plan = planClone(
      party({ dishes: [dish({ id: 'd1', name: 'Stuffing', recipeId: 'r1', multiplier: 1.5, instances: 2 })] }),
      INPUT,
      ids(),
    );

    expect(plan.dishes[0].recipeId).toBe('r1');
    expect(plan.dishes[0].multiplier).toBe(1.5);
    expect(plan.dishes[0].instances).toBe(2);
  });

  it('gives every row its own id under the new party', () => {
    const plan = planClone(
      party({
        guests: [{ id: 'g1', name: 'Pat', dietary: null }],
        dishes: [dish({ id: 'd1', name: 'Turkey' })],
        tasks: [task({ id: 't1', label: 'Turkey in' })],
        items: [item({ id: 'i1', label: 'butter' })],
        partyNotes: [{ id: 'n1', text: 'note', scope: 'party', target: null, position: 0 }],
      }),
      INPUT,
      ids(),
    );

    const rows = [...plan.guests, ...plan.dishes, ...plan.tasks, ...plan.items, ...plan.notes];
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.every((r) => r.partyId === plan.party.id)).toBe(true);
    expect(rows.every((r) => r.id !== plan.party.id)).toBe(true);
  });
});
