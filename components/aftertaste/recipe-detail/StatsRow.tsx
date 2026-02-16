import { cn } from '@/lib/utils';
import {
  ClockIcon,
  ZapIcon,
  FlameIcon,
  DropletIcon,
  ArrowRightIcon,
} from 'lucide-react';
import Image from 'next/image';
import type { Recipe } from '@/data/sample/recipes';

interface StatsRowProps {
  recipe: Recipe;
}

interface StatTile {
  icon: React.ComponentType<{ className?: string }>;
  labelTop: string;
  labelBottom: string;
  isSweetness?: boolean;
  sweetnessLevel?: number;
}

export function StatsRow({ recipe }: StatsRowProps) {
  const stats: StatTile[] = [
    { icon: ClockIcon, labelTop: recipe.cookTime, labelBottom: 'Cook Time' },
    { icon: ZapIcon, labelTop: recipe.difficulty, labelBottom: 'Difficulty' },
    {
      icon: FlameIcon,
      labelTop: `${recipe.calories} kcal`,
      labelBottom: 'Calories',
    },
    {
      icon: DropletIcon,
      labelTop: '',
      labelBottom: 'Sweetness',
      isSweetness: true,
      sweetnessLevel: recipe.sweetness,
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Stat tiles */}
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {stats.map((stat) => (
          <div
            key={stat.labelBottom}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5',
              'dark:border-gray-700/40 dark:bg-slate-900',
            )}
          >
            <stat.icon className="w-4 h-4 text-secondary-500 dark:text-secondary-400 flex-shrink-0" />
            <div>
              {stat.isSweetness ? (
                <div className="flex items-center gap-1 mb-0.5">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-2 h-2 rounded-full',
                        i < (stat.sweetnessLevel ?? 0)
                          ? 'bg-primary-500'
                          : 'bg-gray-200 dark:bg-gray-600',
                      )}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-tight">
                  {stat.labelTop}
                </p>
              )}
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {stat.labelBottom}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chef card */}
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5',
          'dark:border-gray-700/40 dark:bg-slate-900',
        )}
      >
        <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={recipe.chef.avatar}
            alt={recipe.chef.name}
            fill
            className="object-cover"
            sizes="36px"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {recipe.chef.name}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {recipe.chef.recipeCount} recipes
          </p>
        </div>
        <button className="w-7 h-7 rounded-full bg-primary-500 hover:bg-primary-600 flex items-center justify-center transition-colors flex-shrink-0">
          <ArrowRightIcon className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
