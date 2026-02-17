import { cn } from '@/lib/utils';
import { ClockIcon, ZapIcon, FlameIcon, UsersIcon } from 'lucide-react';
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

export function StatsRow({ recipe, servings }: StatsRowProps) {
  return (
    <div className="flex items-stretch gap-2 flex-wrap">
      {/* Total Time – with Prep / Cook sub-entries */}
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5',
          'dark:border-gray-700/40 dark:bg-slate-900',
        )}
      >
        <ClockIcon className="w-4 h-4 text-secondary-500 dark:text-secondary-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-tight">
            {formatMinutes(recipe.totalTimeMinutes)}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Total Time</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
              Prep {formatMinutes(recipe.prepTimeMinutes)}
            </span>
            <span className="text-gray-300 dark:text-gray-600 text-[10px]">|</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
              Cook {formatMinutes(recipe.cookTimeMinutes)}
            </span>
          </div>
        </div>
      </div>

      {/* Difficulty */}
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5',
          'dark:border-gray-700/40 dark:bg-slate-900',
        )}
      >
        <ZapIcon className="w-4 h-4 text-secondary-500 dark:text-secondary-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
            {recipe.difficulty}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Difficulty</p>
        </div>
      </div>

      {/* Calories */}
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5',
          'dark:border-gray-700/40 dark:bg-slate-900',
        )}
      >
        <FlameIcon className="w-4 h-4 text-secondary-500 dark:text-secondary-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-tight">
            {recipe.calories} kcal
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Calories</p>
        </div>
      </div>

      {/* Servings */}
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5',
          'dark:border-gray-700/40 dark:bg-slate-900',
        )}
      >
        <UsersIcon className="w-4 h-4 text-secondary-500 dark:text-secondary-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-tight">
            {servings}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Servings</p>
        </div>
      </div>
    </div>
  );
}
