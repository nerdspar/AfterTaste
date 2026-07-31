'use client';

import { useState, useEffect } from 'react';
import { XIcon, StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../Button';
import { useRecipeStore } from '../RecipeStoreProvider';
import { computePersonalRating } from '@/lib/recipe-rating';
import type { Recipe } from '@/data/sample/recipes';

interface TagsRatingsModalProps {
  recipe: Recipe;
  open: boolean;
  onClose: () => void;
}

// 15-minute increments up to 3 hours.
const COOK_TIME_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 15);

function formatCookTime(mins: number): string {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m} mins` : `${h}h`;
  }
  return `${mins} mins`;
}

function snapCookTime(mins: number): number {
  const snapped = Math.round(mins / 15) * 15;
  return Math.min(180, Math.max(15, snapped || 15));
}

const COST_OPTIONS = [
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
];

function ScoreSelector({
  label,
  value,
  onChange,
  max = 5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
        {label}
      </label>
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => {
          const score = i + 1;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                'w-9 h-9 rounded-lg text-sm font-bold transition-colors',
                score <= value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700',
              )}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TagsRatingsModal({
  recipe,
  open,
  onClose,
}: TagsRatingsModalProps) {
  const { updateRecipe } = useRecipeStore();
  const [ease, setEase] = useState(recipe.ease);
  const [taste, setTaste] = useState(recipe.taste);
  const [cleanup, setCleanup] = useState(recipe.cleanup);
  const [cost, setCost] = useState(recipe.cost);
  const [cookMinutes, setCookMinutes] = useState(
    snapCookTime(recipe.cookTimeMinutes),
  );
  const [makeAgain, setMakeAgain] = useState(recipe.makeAgain);
  const [remade, setRemade] = useState(recipe.remade);

  useEffect(() => {
    setEase(recipe.ease);
    setTaste(recipe.taste);
    setCleanup(recipe.cleanup);
    setCost(recipe.cost);
    setCookMinutes(snapCookTime(recipe.cookTimeMinutes));
    setMakeAgain(recipe.makeAgain);
    setRemade(recipe.remade);
  }, [recipe]);

  const overallRating = computePersonalRating(taste, ease, cleanup);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  function handleSave() {
    try {
      updateRecipe(recipe.id, {
        ease,
        taste,
        cleanup,
        cost,
        cookTimeMinutes: cookMinutes,
        cookTime: formatCookTime(cookMinutes),
        totalTimeMinutes: recipe.prepTimeMinutes + cookMinutes,
        makeAgain,
        remade,
      });
    } catch {
      // Ratings are tiny; a storage write failure here is unexpected. Close
      // rather than trap the user in the modal.
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-md max-h-[85vh] overflow-y-auto',
          'rounded-2xl border border-gray-200 bg-white shadow-xl p-5',
          'dark:border-gray-700 dark:bg-slate-900',
          'animate-in fade-in zoom-in-95 duration-200',
        )}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Edit Tags & Ratings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Overall rating — auto-calculated from taste, ease & cleanup */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3 dark:bg-gray-800/40">
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Overall Rating
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Auto-calculated from taste, ease &amp; cleanup
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <StarIcon className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {overallRating.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Personal scores */}
          <ScoreSelector label="Ease of Cooking" value={ease} onChange={setEase} />
          <ScoreSelector label="Taste" value={taste} onChange={setTaste} />
          <ScoreSelector label="Cleanup" value={cleanup} onChange={setCleanup} />

          {/* Cost */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Cost
            </label>
            <div className="flex gap-2">
              {COST_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCost(opt.value)}
                  className={cn(
                    'flex-1 h-10 rounded-lg text-sm font-bold transition-colors',
                    cost === opt.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cook time */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Cook Time
            </label>
            <select
              value={cookMinutes}
              onChange={(e) => setCookMinutes(Number(e.target.value))}
              className={cn(
                'w-full h-10 px-3 rounded-lg text-sm',
                'border border-gray-200 bg-white text-gray-900',
                'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
              )}
            >
              {COOK_TIME_OPTIONS.map((mins) => (
                <option key={mins} value={mins}>
                  {formatCookTime(mins)}
                </option>
              ))}
            </select>
          </div>

          {/* Make again toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Would Make Again?
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMakeAgain(true)}
                className={cn(
                  'flex-1 h-10 rounded-lg text-sm font-medium transition-colors',
                  makeAgain
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setMakeAgain(false)}
                className={cn(
                  'flex-1 h-10 rounded-lg text-sm font-medium transition-colors',
                  !makeAgain
                    ? 'bg-red-400 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
                )}
              >
                No
              </button>
            </div>
          </div>

          {/* Times remade */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Times Remade
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRemade(Math.max(0, remade - 1))}
                className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold text-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                -
              </button>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums w-8 text-center">
                {remade}
              </span>
              <button
                type="button"
                onClick={() => setRemade(remade + 1)}
                className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold text-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="flex-1"
            onClick={handleSave}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
