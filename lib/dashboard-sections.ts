// Dashboard section registry. Pure constants (no 'use client') so both the
// server (loadUserProfile) and client components can import them. The order
// here is the default order; users can reorder and hide sections, stored as a
// list of visible ids in the `dashboardSections` pref (empty = this default).

export interface DashboardSectionMeta {
  id: string;
  /** Human label shown in the settings customizer. */
  label: string;
  /** One-line hint of what the section shows. */
  hint: string;
}

export const DASHBOARD_SECTIONS: DashboardSectionMeta[] = [
  { id: 'categoryTiles', label: 'Browse by Category', hint: 'Quick category shortcuts' },
  { id: 'recentlyViewed', label: 'Recently Viewed', hint: 'Recipes you opened lately' },
  { id: 'recentlyAdded', label: 'Recently Added', hint: 'Your newest recipes' },
  { id: 'suggested', label: 'Suggested Recipes', hint: 'Picks for the time of day' },
  { id: 'todaysMeals', label: "Today's Meals", hint: 'Your meal plan for today' },
  { id: 'groceryList', label: 'Grocery List', hint: 'A peek at your list' },
];

export const DEFAULT_DASHBOARD_SECTIONS = DASHBOARD_SECTIONS.map((s) => s.id);

export const DASHBOARD_SECTION_BY_ID: Record<string, DashboardSectionMeta> =
  Object.fromEntries(DASHBOARD_SECTIONS.map((s) => [s.id, s]));
