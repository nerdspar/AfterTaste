// The shapes the party screens work in. Client-safe: no prisma, no server
// imports, so both the server loader and the React components can use them.

export type DishStatus = 'idea' | 'maybe' | 'confirmed';
export type PartyListName = 'shopping' | 'todo' | 'prep';
export type NoteScope = 'party' | 'dish' | 'ingredient';

export interface PartyGuestView {
  id: string;
  name: string;
  dietary: string | null;
  confirmed: boolean;
}

export interface PartyDishView {
  id: string;
  course: string;
  position: number;
  recipeId: string | null;
  name: string;
  multiplier: number;
  instances: number;
  equipment: string | null;
  status: DishStatus;
  broughtById: string | null;
}

export interface PartyTaskView {
  id: string;
  label: string;
  dayOffset: number;
  /** "16:30", or null while it has no time yet. */
  at: string | null;
  durationMin: number;
  passive: boolean;
  resource: string;
  ovenTempF: number | null;
  dishId: string | null;
  instance: number;
  assigneeId: string | null;
  done: boolean;
  position: number;
  /** Which list this step came from, when it came from one. */
  fromList: PartyListName | null;
}

export interface PartyListItemView {
  id: string;
  list: PartyListName;
  label: string;
  parentId: string | null;
  quantity: string | null;
  category: string | null;
  store: string | null;
  dishId: string | null;
  edited: boolean;
  done: boolean;
  position: number;
  /** Set when this line is also a step in the run of show. */
  taskId: string | null;
}

export interface PartyNoteView {
  id: string;
  text: string;
  scope: NoteScope;
  target: string | null;
  applied: boolean;
  position: number;
}

export interface PartyView {
  id: string;
  title: string;
  subtitle: string | null;
  /** Local YYYY-MM-DD. */
  date: string;
  serveTime: string;
  notes: string;
  clonedFromId: string | null;
  guests: PartyGuestView[];
  dishes: PartyDishView[];
  tasks: PartyTaskView[];
  items: PartyListItemView[];
  partyNotes: PartyNoteView[];
}

/** A party as the index and the meal planner need it — no children loaded. */
export interface PartySummary {
  id: string;
  title: string;
  date: string;
  serveTime: string;
  dishCount: number;
  guestCount: number;
}

/**
 * The courses a menu is grouped by. Free text in the database so a party can
 * invent one, but these are offered first and sort in this order.
 */
export const COURSES = ['Apps', 'Mains', 'Sides', 'Dessert', 'Drinks'] as const;

/** Courses in menu order, with anything unrecognised after the known ones. */
export function orderedCourses(dishCourses: string[]): string[] {
  const known = COURSES.filter((c) => dishCourses.includes(c));
  const extra = [...new Set(dishCourses)]
    .filter((c) => !(COURSES as readonly string[]).includes(c))
    .sort();
  return [...known, ...extra];
}

/** "1.5" → "1.5×", "1" → "" (no badge when a recipe is made as written). */
export function multiplierLabel(multiplier: number): string {
  if (!multiplier || multiplier === 1) return '';
  const n = Number(multiplier.toFixed(2));
  return `${n}×`;
}
