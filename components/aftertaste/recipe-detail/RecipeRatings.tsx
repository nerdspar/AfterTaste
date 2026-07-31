'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PencilIcon } from 'lucide-react';
import { TagsRatingsModal } from './TagsRatingsModal';
import type { Recipe } from '@/data/sample/recipes';

function Pips({ value, max }: { value: number; max: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            'w-2.5 h-2.5 rounded-full',
            i < value ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700',
          )}
        />
      ))}
    </div>
  );
}

function NotRated() {
  return (
    <span className="text-xs text-gray-400 dark:text-gray-500">Not rated</span>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-1.5">
        {label}
      </p>
      <div className="h-5 flex items-center">{children}</div>
    </div>
  );
}

interface RecipeRatingsProps {
  recipe: Recipe;
}

export function RecipeRatings({ recipe }: RecipeRatingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'w-full text-left rounded-2xl border border-gray-200 bg-white p-4',
          'dark:border-gray-700/40 dark:bg-slate-900',
          'hover:border-primary-300 dark:hover:border-primary-500/40',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30',
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Your Ratings
          </h3>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 dark:text-primary-400">
            <PencilIcon className="w-3.5 h-3.5" />
            Edit
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
          <Metric label="Ease of Cooking">
            {recipe.ease > 0 ? <Pips value={recipe.ease} max={5} /> : <NotRated />}
          </Metric>
          <Metric label="Taste">
            {recipe.taste > 0 ? (
              <Pips value={recipe.taste} max={5} />
            ) : (
              <NotRated />
            )}
          </Metric>
          <Metric label="Cleanup">
            {recipe.cleanup > 0 ? (
              <Pips value={recipe.cleanup} max={5} />
            ) : (
              <NotRated />
            )}
          </Metric>
          <Metric label="Cost">
            {recipe.cost > 0 ? (
              <span className="text-sm font-bold">
                <span className="text-gray-900 dark:text-gray-100">
                  {'$'.repeat(recipe.cost)}
                </span>
                <span className="text-gray-200 dark:text-gray-700">
                  {'$'.repeat(3 - recipe.cost)}
                </span>
              </span>
            ) : (
              <NotRated />
            )}
          </Metric>
          <Metric label="Make Again">
            {recipe.makeAgain === true ? (
              <span className="text-sm font-semibold text-emerald-500">Yes</span>
            ) : recipe.makeAgain === false ? (
              <span className="text-sm font-semibold text-red-400">No</span>
            ) : (
              <NotRated />
            )}
          </Metric>
          <Metric label="Times Remade">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {recipe.remade}
              <span className="text-gray-400 dark:text-gray-500 font-medium">
                ×
              </span>
            </span>
          </Metric>
        </div>
      </button>

      <TagsRatingsModal
        recipe={recipe}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
