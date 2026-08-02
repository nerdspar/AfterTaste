import {
  LayoutDashboardIcon,
  BookOpenIcon,
  CalendarIcon,
  ShoppingCartIcon,
  UtensilsIcon,
  LineChartIcon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react';

// Every place the bottom bar / More menu can send you. `short` is the compact
// label under a tab icon; `label` is the fuller sidebar/menu name.
export interface NavDest {
  id: string;
  label: string;
  short: string;
  href: string;
  Icon: LucideIcon;
  /** Only offered when nutrition tracking is enabled. */
  requiresNutrition?: boolean;
}

export const NAV_DESTS: NavDest[] = [
  { id: 'home', label: 'Dashboard', short: 'Home', href: '/dashboard', Icon: LayoutDashboardIcon },
  { id: 'recipes', label: 'My Recipes', short: 'Recipes', href: '/recipes', Icon: BookOpenIcon },
  { id: 'planner', label: 'Meal Planner', short: 'Planner', href: '/meal-planner', Icon: CalendarIcon },
  { id: 'grocery', label: 'Grocery List', short: 'Grocery', href: '/grocery-list', Icon: ShoppingCartIcon },
  { id: 'foodlog', label: 'Food Log', short: 'Food Log', href: '/food-log', Icon: UtensilsIcon, requiresNutrition: true },
  { id: 'insights', label: 'Insights', short: 'Insights', href: '/insights', Icon: LineChartIcon },
  { id: 'settings', label: 'Settings', short: 'Settings', href: '/settings', Icon: SettingsIcon },
];

export const NAV_BY_ID: Record<string, NavDest> = Object.fromEntries(
  NAV_DESTS.map((d) => [d.id, d]),
);
