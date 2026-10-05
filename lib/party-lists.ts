// Shaping a party's lists for display.
//
// Three lists share one table — shopping, what the house needs doing, and what
// can be cooked ahead — because the note keeps them on one page and they get
// reordered and re-scoped constantly. What differs is only how they read:
// shopping wants supermarket order, the other two want nesting.
//
// The nesting matters more than it looks: "Clean house › Kitchen › Cabinets"
// is how the job actually decomposes, and a flat list of twenty chores is the
// thing people stop opening.

import { GROCERY_CATEGORIES } from '@/lib/grocery-category';
import type { PartyListItemView } from '@/lib/party-types';

/**
 * Category order for a party's shopping list: the grocery sections, then the
 * things a party needs that a recipe never does.
 */
export const PARTY_CATEGORIES = [...GROCERY_CATEGORIES, 'Supplies'] as const;

const UNCATEGORISED = 'Other';

export interface ListNode {
  item: PartyListItemView;
  children: ListNode[];
}

/**
 * Nest items under their parents, deepest-first within each level.
 *
 * An item whose parent is missing surfaces as a root rather than disappearing:
 * losing a chore silently is worse than showing it at the wrong indent, and a
 * parent can be deleted while a phone is offline.
 */
export function buildListTree(items: PartyListItemView[]): ListNode[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const childrenOf = new Map<string, PartyListItemView[]>();
  const roots: PartyListItemView[] = [];

  for (const item of items) {
    const parent = item.parentId ? byId.get(item.parentId) : undefined;
    // A self-parent or a missing parent both mean "no parent".
    if (!parent || parent.id === item.id) {
      roots.push(item);
      continue;
    }
    const siblings = childrenOf.get(parent.id);
    if (siblings) siblings.push(item);
    else childrenOf.set(parent.id, [item]);
  }

  const byPosition = (a: PartyListItemView, b: PartyListItemView) =>
    a.position - b.position || a.label.localeCompare(b.label);

  // `seen` guards against a cycle, which no UI should be able to create but
  // which would otherwise hang the render rather than show a wrong indent.
  const build = (item: PartyListItemView, seen: Set<string>): ListNode => {
    const kids = seen.has(item.id) ? [] : (childrenOf.get(item.id) ?? []);
    const next = new Set(seen).add(item.id);
    return {
      item,
      children: [...kids].sort(byPosition).map((k) => build(k, next)),
    };
  };

  return [...roots].sort(byPosition).map((r) => build(r, new Set()));
}

export interface CategoryGroup {
  category: string;
  items: PartyListItemView[];
}

/**
 * Group shopping lines into supermarket sections.
 *
 * Empty sections are dropped — unlike the menu's courses, a missing aisle is
 * not information, it is just a shorter walk.
 */
export function groupShopping(items: PartyListItemView[]): CategoryGroup[] {
  const groups = new Map<string, PartyListItemView[]>();
  for (const item of items) {
    const key = item.category?.trim() || UNCATEGORISED;
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const rank = (c: string) => {
    const i = (PARTY_CATEGORIES as readonly string[]).indexOf(c);
    // A category someone typed sorts after the known ones, "Other" last.
    return i >= 0 ? i : c === UNCATEGORISED ? 1000 : 500;
  };

  return [...groups.entries()]
    .map(([category, list]) => ({
      category,
      items: [...list].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => rank(a.category) - rank(b.category) || a.category.localeCompare(b.category));
}

/**
 * How far through a list you are, counting only the things that are actually
 * jobs: a row with children is a heading, and counting it would make the
 * number drift as the list is reorganised rather than as work gets done.
 */
export function listProgress(items: PartyListItemView[]): { done: number; total: number } {
  const hasChildren = new Set(
    items.map((i) => i.parentId).filter((id): id is string => id !== null),
  );
  const leaves = items.filter((i) => !hasChildren.has(i.id));
  return { done: leaves.filter((i) => i.done).length, total: leaves.length };
}

/**
 * Whether ticking a row should tick everything under it.
 *
 * "Clean house" being done means the kitchen is done. Returns every id to
 * change, so the caller can apply it in one optimistic pass.
 */
export function descendantIds(items: PartyListItemView[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const i of items) {
    if (!i.parentId || i.parentId === i.id) continue;
    const kids = childrenOf.get(i.parentId);
    if (kids) kids.push(i.id);
    else childrenOf.set(i.parentId, [i.id]);
  }

  const out: string[] = [];
  const walk = (id: string, seen: Set<string>) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const kid of childrenOf.get(id) ?? []) {
      out.push(kid);
      walk(kid, seen);
    }
  };
  walk(rootId, new Set());
  return out;
}
