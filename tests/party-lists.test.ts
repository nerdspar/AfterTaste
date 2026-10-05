import { describe, expect, it } from 'vitest';
import {
  buildListTree,
  groupShopping,
  listProgress,
  descendantIds,
  type ListNode,
} from '@/lib/party-lists';
import type { PartyListItemView } from '@/lib/party-types';

const item = (
  over: Partial<PartyListItemView> & Pick<PartyListItemView, 'id' | 'label'>,
): PartyListItemView => ({
  list: 'todo',
  parentId: null,
  quantity: null,
  category: null,
  store: null,
  dishId: null,
  edited: false,
  done: false,
  position: 0,
  ...over,
});

/** Labels of a tree, indented, so a test can assert the shape in one go. */
function outline(nodes: ListNode[], depth = 0): string[] {
  return nodes.flatMap((n) => [
    `${'  '.repeat(depth)}${n.item.label}`,
    ...outline(n.children, depth + 1),
  ]);
}

describe('nesting the house and prep lists', () => {
  it('nests to the depth the job actually decomposes to', () => {
    const tree = buildListTree([
      item({ id: 'c', label: 'Cabinets', parentId: 'b' }),
      item({ id: 'a', label: 'Clean house' }),
      item({ id: 'b', label: 'Kitchen', parentId: 'a' }),
    ]);

    expect(outline(tree)).toEqual(['Clean house', '  Kitchen', '    Cabinets']);
  });

  it('orders siblings by position, not by arrival', () => {
    const tree = buildListTree([
      item({ id: 'b', label: 'Second', position: 1 }),
      item({ id: 'a', label: 'First', position: 0 }),
      item({ id: 'c', label: 'Third', position: 2 }),
    ]);

    expect(outline(tree)).toEqual(['First', 'Second', 'Third']);
  });

  it('surfaces an orphan rather than losing it', () => {
    // The parent can be deleted on another phone while this one is offline.
    const tree = buildListTree([item({ id: 'b', label: 'Kitchen', parentId: 'gone' })]);

    // Wrong indent beats a chore that silently vanishes.
    expect(outline(tree)).toEqual(['Kitchen']);
  });

  it('does not hang on a cycle', () => {
    const tree = buildListTree([
      item({ id: 'a', label: 'A', parentId: 'b' }),
      item({ id: 'b', label: 'B', parentId: 'a' }),
    ]);

    // Nothing is a root, so the guard has to break in — the test passing at
    // all is the assertion.
    expect(outline(tree).length).toBeGreaterThanOrEqual(0);
  });

  it('treats a row that is its own parent as a root', () => {
    const tree = buildListTree([item({ id: 'a', label: 'Odd', parentId: 'a' })]);
    expect(outline(tree)).toEqual(['Odd']);
  });
});

describe('ticking a heading', () => {
  const nested = [
    item({ id: 'a', label: 'Clean house' }),
    item({ id: 'b', label: 'Kitchen', parentId: 'a' }),
    item({ id: 'c', label: 'Cabinets', parentId: 'b' }),
    item({ id: 'z', label: 'Set the table' }),
  ];

  it('takes everything underneath with it', () => {
    expect(descendantIds(nested, 'a').sort()).toEqual(['b', 'c']);
  });

  it('leaves the rest of the list alone', () => {
    expect(descendantIds(nested, 'z')).toEqual([]);
    expect(descendantIds(nested, 'b')).toEqual(['c']);
  });
});

describe('list progress', () => {
  it('counts jobs, not headings', () => {
    // "Clean house" is a heading; counting it would make 1 of 3 read as 1 of 4.
    const progress = listProgress([
      item({ id: 'a', label: 'Clean house' }),
      item({ id: 'b', label: 'Kitchen', parentId: 'a', done: true }),
      item({ id: 'c', label: 'Bathroom', parentId: 'a' }),
      item({ id: 'z', label: 'Set the table' }),
    ]);

    expect(progress).toEqual({ done: 1, total: 3 });
  });

  it('counts a flat list straight through', () => {
    expect(
      listProgress([
        item({ id: 'a', label: 'One', done: true }),
        item({ id: 'b', label: 'Two', done: true }),
      ]),
    ).toEqual({ done: 2, total: 2 });
  });
});

describe('shopping list sections', () => {
  const shop = (label: string, category: string | null, position = 0) =>
    item({ id: label, label, list: 'shopping', category, position });

  it('walks the shop in aisle order, not alphabetically', () => {
    const groups = groupShopping([
      shop('butter', 'Dairy & Eggs'),
      shop('sage', 'Spices & Seasonings'),
      shop('onions', 'Fruits & Vegetables'),
    ]);

    expect(groups.map((g) => g.category)).toEqual([
      'Fruits & Vegetables',
      'Dairy & Eggs',
      'Spices & Seasonings',
    ]);
  });

  it('keeps the party-only section with the groceries', () => {
    const groups = groupShopping([shop('foil', 'Supplies'), shop('butter', 'Dairy & Eggs')]);
    expect(groups.map((g) => g.category)).toEqual(['Dairy & Eggs', 'Supplies']);
  });

  it('puts an uncategorised line last, under its own heading', () => {
    const groups = groupShopping([shop('mystery', null), shop('butter', 'Dairy & Eggs')]);
    expect(groups.map((g) => g.category)).toEqual(['Dairy & Eggs', 'Other']);
  });

  it('sorts a category a person typed after the known ones', () => {
    const groups = groupShopping([
      shop('ice', 'Liquor store'),
      shop('mystery', null),
      shop('butter', 'Dairy & Eggs'),
    ]);
    expect(groups.map((g) => g.category)).toEqual(['Dairy & Eggs', 'Liquor store', 'Other']);
  });

  it('drops empty sections', () => {
    const groups = groupShopping([shop('butter', 'Dairy & Eggs')]);
    expect(groups).toHaveLength(1);
  });
});
