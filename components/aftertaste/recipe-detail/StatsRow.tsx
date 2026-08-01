import { cn } from '@/lib/utils';
import {
  ClockIcon,
  FlameIcon,
  UsersIcon,
  BookmarkIcon,
  type LucideIcon,
} from 'lucide-react';
import type { Recipe } from '@/data/sample/recipes';

interface StatsRowProps {
  recipe: Recipe;
  servings: number;
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Compact form for the prep/cook subtext (e.g. "15m", "1h 30m").
function compactMinutes(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function StatTile({
  icon: Icon,
  value,
  sub,
}: {
  icon: LucideIcon;
  value: string;
  sub: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 min-w-0',
        'dark:border-gray-700/40 dark:bg-slate-900',
      )}
    >
      <Icon className="w-4 h-4 text-secondary-500 dark:text-secondary-400 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-tight break-words">
          {value}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight break-words">
          {sub}
        </p>
      </div>
    </div>
  );
}

export function StatsRow({ recipe, servings }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatTile
        icon={ClockIcon}
        value={formatMinutes(recipe.totalTimeMinutes)}
        sub={`${compactMinutes(recipe.prepTimeMinutes)} prep · ${compactMinutes(recipe.cookTimeMinutes)} cook`}
      />
      <StatTile icon={BookmarkIcon} value={recipe.source} sub="Source" />
      <StatTile
        icon={FlameIcon}
        value={`${recipe.calories} kcal`}
        sub="Per serving"
      />
      <StatTile icon={UsersIcon} value={String(servings)} sub="Servings" />
    </div>
  );
}
