import { describe, expect, it } from 'vitest';
import { orderedCourses, multiplierLabel } from '@/lib/party-types';
import { asDishStatus, asListName, asNoteScope } from '@/lib/party-clone';

describe('menu courses', () => {
  it('reads down the menu in serving order, not alphabetically', () => {
    expect(orderedCourses(['Dessert', 'Apps', 'Mains'])).toEqual(['Apps', 'Mains', 'Dessert']);
  });

  it('puts a course the party invented after the known ones', () => {
    expect(orderedCourses(['Snacks for later', 'Mains', 'Apps'])).toEqual([
      'Apps',
      'Mains',
      'Snacks for later',
    ]);
  });

  it('lists each course once however many dishes are in it', () => {
    expect(orderedCourses(['Sides', 'Sides', 'Sides'])).toEqual(['Sides']);
  });
});

describe('multiplier badge', () => {
  it('says nothing when a recipe is made as written', () => {
    expect(multiplierLabel(1)).toBe('');
  });

  it('marks a scaled dish', () => {
    expect(multiplierLabel(1.5)).toBe('1.5×');
    expect(multiplierLabel(2)).toBe('2×');
  });

  it('does not print float noise', () => {
    expect(multiplierLabel(1 / 3)).toBe('0.33×');
  });
});

describe('narrowing values that came back from the database', () => {
  it('falls back to a sensible member rather than trusting the column', () => {
    expect(asDishStatus('maybe')).toBe('maybe');
    expect(asDishStatus('nonsense')).toBe('confirmed');
    expect(asListName('prep')).toBe('prep');
    expect(asListName('nonsense')).toBe('shopping');
    expect(asNoteScope('dish')).toBe('dish');
    expect(asNoteScope('nonsense')).toBe('party');
  });
});
