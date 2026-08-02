// Dashboard section registry. Pure constants (no 'use client') so both the
// server (loadUserProfile) and client components can import them. The order
// here is the default order; users can reorder (within a column) and hide
// sections, stored as a list of visible ids in the `dashboardSections` pref
// (empty = this default).

export type DashboardColumn = 'main' | 'rail';

export interface DashboardSectionMeta {
  id: string;
  /** Human label shown in the settings customizer. */
  label: string;
  /** One-line hint of what the section shows. */
  hint: string;
  /** Which desktop column the section lives in (single column on mobile). */
  column: DashboardColumn;
}

export const DASHBOARD_SECTIONS: DashboardSectionMeta[] = [
  { id: 'categoryTiles', label: 'Browse by Category', hint: 'Quick category shortcuts', column: 'main' },
  { id: 'recentlyViewed', label: 'Recently Viewed', hint: 'Recipes you opened lately', column: 'main' },
  { id: 'recentlyAdded', label: 'Recently Added', hint: 'Your newest recipes', column: 'main' },
  { id: 'suggested', label: 'Suggested Recipes', hint: 'Picks for the time of day', column: 'main' },
  { id: 'todaysMeals', label: "Today's Meals", hint: 'Your meal plan for today', column: 'rail' },
  { id: 'groceryList', label: 'Grocery List', hint: 'A peek at your list', column: 'rail' },
];

export const DEFAULT_DASHBOARD_SECTIONS = DASHBOARD_SECTIONS.map((s) => s.id);

export const DASHBOARD_SECTION_BY_ID: Record<string, DashboardSectionMeta> =
  Object.fromEntries(DASHBOARD_SECTIONS.map((s) => [s.id, s]));
