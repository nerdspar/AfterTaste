// Last year's lessons, pointed at this year's plan.
//
// This is the point of cloning. The note that matters is not "Friendsgiving
// 2025" — it is the line someone wrote at 11pm saying we made way too much
// butter, or that the oven could not keep up. A copy that brings the menu but
// loses that is just a faster way to repeat the same evening.
//
// So notes arrive unapplied and have to be dealt with: ticked off once this
// year's plan reflects them, or kept visible until they are. And they attach
// to what they are about — a dish, an ingredient, or the party as a whole —
// so the reminder turns up where the decision gets made rather than on a page
// nobody opens.

import { ingredientKey } from '@/lib/party-shopping';
import type { PartyNoteView } from '@/lib/party-types';

/** Notes still waiting to be dealt with, in their listed order. */
export function unapplied(notes: PartyNoteView[]): PartyNoteView[] {
  return notes.filter((n) => !n.applied).sort((a, b) => a.position - b.position);
}

/** Notes about one dish. */
export function notesForDish(notes: PartyNoteView[], dishId: string): PartyNoteView[] {
  return notes
    .filter((n) => n.scope === 'dish' && n.target === dishId)
    .sort((a, b) => a.position - b.position);
}

/**
 * Notes about one ingredient, matched by name rather than by id.
 *
 * Deliberately loose, and deliberately not a row reference: next year's butter
 * is a different line on a different list, and a note that only matched an id
 * would detach the moment it became useful. Matching is on the same key the
 * shopping list merges on, so "unsalted butter" and "butter" find each other.
 */
export function notesForIngredient(
  notes: PartyNoteView[],
  label: string,
): PartyNoteView[] {
  const key = ingredientKey(label);
  if (!key) return [];
  return notes
    .filter((n) => {
      if (n.scope !== 'ingredient' || !n.target) return false;
      const target = ingredientKey(n.target);
      if (!target) return false;
      // Either way round: the note may be more specific than the line, or less.
      return target === key || target.includes(key) || key.includes(target);
    })
    .sort((a, b) => a.position - b.position);
}
