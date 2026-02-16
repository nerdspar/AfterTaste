'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { ClockIcon, FlameIcon } from 'lucide-react';
import { todaysMeals } from '@/data/sample/recipes';

export function TodaysMeals() {
  return (
    <div className="space-y-3">
      {todaysMeals.map((meal) => {
        const content = (
          <div
            className={cn(
              'flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3',
              'dark:border-gray-700/40 dark:bg-slate-900',
              'hover:border-primary-300 dark:hover:border-primary-500/40',
              'transition-colors',
              meal.recipeId && 'cursor-pointer',
            )}
          >
            {/* Image */}
            <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src={meal.image}
                alt={meal.title}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-primary-500 dark:text-primary-400">
                {meal.mealType}
              </span>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {meal.title}
              </h4>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {meal.time}
                </span>
                <span className="flex items-center gap-1">
                  <FlameIcon className="w-3 h-3" />
                  {meal.calories} kcal
                </span>
              </div>
            </div>
          </div>
        );

        return meal.recipeId ? (
          <Link key={meal.id} href={`/recipes/${meal.recipeId}`}>
            {content}
          </Link>
        ) : (
          <div key={meal.id}>{content}</div>
        );
      })}

      <Link
        href="/meal-planner"
        className="block text-center text-xs font-medium text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 transition-colors pt-1"
      >
        View Full Meal Plan
      </Link>
    </div>
  );
}
