import { describe, expect, it } from 'vitest';
import { unapplied, notesForDish, notesForIngredient } from '@/lib/party-notes';
import type { PartyNoteView } from '@/lib/party-types';

const note = (
  over: Partial<PartyNoteView> & Pick<PartyNoteView, 'id' | 'text'>,
): PartyNoteView => ({
  scope: 'party',
  target: null,
  applied: false,
  position: 0,
  ...over,
});

describe('lessons still waiting to be dealt with', () => {
  it('leaves out the ones already reflected in this year', () => {
    const notes = [
      note({ id: 'a', text: 'Too much butter' }),
      note({ id: 'b', text: 'Start the gravy earlier', applied: true }),
    ];

    expect(unapplied(notes).map((n) => n.text)).toEqual(['Too much butter']);
  });

  it('keeps them in the order they were written', () => {
    const notes = [
      note({ id: 'b', text: 'Second', position: 1 }),
      note({ id: 'a', text: 'First', position: 0 }),
    ];

    expect(unapplied(notes).map((n) => n.text)).toEqual(['First', 'Second']);
  });
});

describe('notes about a dish', () => {
  const notes = [
    note({ id: 'a', text: 'Needs the big tin', scope: 'dish', target: 'd1' }),
    note({ id: 'b', text: 'Other dish', scope: 'dish', target: 'd2' }),
    note({ id: 'c', text: 'About the party', scope: 'party' }),
  ];

  it('finds only its own', () => {
    expect(notesForDish(notes, 'd1').map((n) => n.text)).toEqual(['Needs the big tin']);
  });

  it('does not sweep up party-wide notes', () => {
    expect(notesForDish(notes, 'd3')).toEqual([]);
  });
});

describe('notes about an ingredient', () => {
  // The real one: "we made way too much butter (1 stick is probably plenty)".
  const butter = note({
    id: 'a',
    text: '1 stick is probably plenty',
    scope: 'ingredient',
    target: 'butter',
  });

  it('finds this year\'s line for last year\'s note', () => {
    expect(notesForIngredient([butter], 'butter')).toHaveLength(1);
  });

  it('matches when the line is more specific than the note', () => {
    // Next year's recipe says "unsalted butter"; the lesson still applies.
    expect(notesForIngredient([butter], 'unsalted butter')).toHaveLength(1);
  });

  it('matches when the note is more specific than the line', () => {
    const salted = note({
      id: 'b',
      text: 'Get the good salted butter',
      scope: 'ingredient',
      target: 'salted butter',
    });
    expect(notesForIngredient([salted], 'butter')).toHaveLength(1);
  });

  it('ignores the parenthetical the shopping list also strips', () => {
    const n = note({ id: 'c', text: 'Plenty', scope: 'ingredient', target: 'butter (softened)' });
    expect(notesForIngredient([n], 'butter')).toHaveLength(1);
  });

  it('does not attach to an unrelated line', () => {
    expect(notesForIngredient([butter], 'chicken broth')).toEqual([]);
  });

  it('ignores notes that are not about an ingredient', () => {
    const dishNote = note({ id: 'd', text: 'Butter the tin', scope: 'dish', target: 'butter' });
    expect(notesForIngredient([dishNote], 'butter')).toEqual([]);
  });

  it('survives an empty or junk target', () => {
    const empty = note({ id: 'e', text: 'Hmm', scope: 'ingredient', target: '!!!' });
    expect(notesForIngredient([empty], 'butter')).toEqual([]);
    expect(notesForIngredient([butter], '')).toEqual([]);
  });
});
