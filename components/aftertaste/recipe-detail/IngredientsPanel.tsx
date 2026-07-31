'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, CheckIcon, ListPlusIcon, XIcon } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { IngredientIcon } from '../IngredientIcon';
import { useGroceryStore } from '../GroceryStoreProvider';
import { guessGroceryCategory } from '@/lib/grocery-category';
import type { Ingredient } from '@/data/sample/recipes';

type ScaleMode = 'amount' | 'serving';

interface IngredientsPanelProps {
  ingredients: Ingredient[];
  baseServings: number;
  scaleMode: ScaleMode;
  scaleValue: number;
  onScaleModeChange: (mode: ScaleMode) => void;
  onScaleValueChange: (value: number) => void;
  recipeId: string;
  recipeTitle: string;
}

function scaleQuantity(quantity: string, multiplier: number): string {
  return quantity.replace(/[\d.\/]+/g, (match) => {
    if (match.includes('/')) {
      const [num, den] = match.split('/');
      const val = (Number(num) / Number(den)) * multiplier;
      const rounded = Math.round(val * 100) / 100;
      if (rounded === Math.round(rounded)) return String(Math.round(rounded));
      // Try to express as simple fraction
      if (Math.abs(rounded - 1 / 4) < 0.01) return '1/4';
      if (Math.abs(rounded - 1 / 3) < 0.01) return '1/3';
      if (Math.abs(rounded - 1 / 2) < 0.01) return '1/2';
      if (Math.abs(rounded - 2 / 3) < 0.01) return '2/3';
      if (Math.abs(rounded - 3 / 4) < 0.01) return '3/4';
      return String(rounded);
    }
    const val = Number(match) * multiplier;
    const rounded = Math.round(val * 100) / 100;
    if (rounded === Math.round(rounded)) return String(Math.round(rounded));
    return String(rounded);
  });
}

export function IngredientsPanel({
  ingredients,
  baseServings,
  scaleMode,
  scaleValue,
  onScaleModeChange,
  onScaleValueChange,
  recipeId,
  recipeTitle,
}: IngredientsPanelProps) {
  const multiplier =
    scaleMode === 'amount' ? scaleValue : scaleValue / baseServings;

  const currentServings =
    scaleMode === 'amount'
      ? Math.round(baseServings * scaleValue)
      : Math.round(scaleValue);

  const sliderMin = scaleMode === 'amount' ? 0.5 : 1;
  const sliderMax = scaleMode === 'amount' ? 8 : baseServings * 8;
  const sliderStep = scaleMode === 'amount' ? 0.5 : 1;

  const [scaleOpen, setScaleOpen] = useState(false);

  const { addItems } = useGroceryStore();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  const allSelected = selected.size === ingredients.length;

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(t);
  }, [feedback]);

  function enterSelectMode() {
    setScaleOpen(false);
    setSelected(new Set(ingredients.map((_, i) => i)));
    setSelectMode(true);
  }

  function enterSelectModeWith(index: number) {
    setScaleOpen(false);
    setSelected(new Set([index]));
    setSelectMode(true);
  }

  function cancelSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function toggleSelected(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === ingredients.length
        ? new Set()
        : new Set(ingredients.map((_, i) => i)),
    );
  }

  function confirmAdd() {
    const chosen = ingredients.filter((_, i) => selected.has(i));
    const added = addItems(
      chosen.map((ing) => ({
        name: ing.name,
        quantity: scaleQuantity(ing.quantity, multiplier),
        category: guessGroceryCategory(ing.name),
        recipeId,
        recipeTitle,
      })),
    );
    setFeedback(
      added > 0
        ? `Added ${added} ${added === 1 ? 'item' : 'items'} to grocery list`
        : 'Already on your grocery list',
    );
    cancelSelectMode();
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          {selectMode ? 'Add to grocery list' : 'Ingredients'}
        </h3>
        {selectMode ? (
          <IconButton
            aria-label="Cancel selection"
            size="sm"
            onClick={cancelSelectMode}
          >
            <XIcon className="w-[18px] h-[18px]" />
          </IconButton>
        ) : (
          <div className="flex items-center gap-1.5">
            {ingredients.length > 0 && (
              <IconButton
                aria-label="Add ingredients to grocery list"
                size="sm"
                onClick={enterSelectMode}
              >
                <ListPlusIcon className="w-[18px] h-[18px]" />
              </IconButton>
            )}
            <button
              type="button"
              onClick={() => setScaleOpen((o) => !o)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100',
                'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
              )}
            >
              <span className="tabular-nums">
                {currentServings}{' '}
                {currentServings === 1 ? 'serving' : 'servings'}
              </span>
              <ChevronDownIcon
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  scaleOpen && 'rotate-180',
                )}
              />
            </button>
          </div>
        )}
      </div>

      {/* Select-all toolbar */}
      {selectMode && (
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {selected.size} selected
          </span>
        </div>
      )}

      {/* Collapsible scale section */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          scaleOpen ? 'grid-rows-[1fr] opacity-100 mb-4' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'rounded-xl border border-gray-200 bg-gray-50 p-3',
              'dark:border-gray-700/40 dark:bg-gray-800/40',
            )}
          >
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Scale
            </p>

            {/* Mode toggle */}
            <div className="flex items-center gap-1 mb-3">
              <button
                type="button"
                onClick={() => {
                  onScaleModeChange('amount');
                  onScaleValueChange(1);
                }}
                className={cn(
                  'h-7 px-3 rounded-full text-xs font-medium transition-colors',
                  scaleMode === 'amount'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600',
                )}
              >
                Amount
              </button>
              <button
                type="button"
                onClick={() => {
                  onScaleModeChange('serving');
                  onScaleValueChange(baseServings);
                }}
                className={cn(
                  'h-7 px-3 rounded-full text-xs font-medium transition-colors',
                  scaleMode === 'serving'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600',
                )}
              >
                Serving
              </button>
            </div>

            {/* Slider + number input */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={scaleValue}
                onChange={(e) => onScaleValueChange(Number(e.target.value))}
                className="flex-1 h-1.5 accent-primary-500 cursor-pointer"
              />
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={scaleValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= sliderMin && v <= sliderMax) {
                    onScaleValueChange(v);
                  }
                }}
                className={cn(
                  'w-16 h-8 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm tabular-nums',
                  'dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
                )}
              />
              <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {scaleMode === 'amount' ? 'x' : 'servings'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ingredient rows */}
      <div className="space-y-1">
        {ingredients.map((ing, i) => {
          const isSelected = selected.has(i);
          const content = (
            <>
              {selectMode ? (
                <span
                  className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isSelected
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-gray-300 dark:border-gray-600',
                  )}
                >
                  {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                </span>
              ) : (
                <IngredientIcon
                  name={ing.name}
                  className="w-7 h-7 flex-shrink-0 border border-gray-100 dark:border-gray-700"
                />
              )}
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 text-left">
                {ing.name}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                {scaleQuantity(ing.quantity, multiplier)}
              </span>
            </>
          );

          return selectMode ? (
            <button
              key={ing.name}
              type="button"
              onClick={() => toggleSelected(i)}
              className="flex w-full items-center gap-3 h-11 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              {content}
            </button>
          ) : (
            <button
              key={ing.name}
              type="button"
              onClick={() => enterSelectModeWith(i)}
              title="Add to grocery list"
              className="flex w-full items-center gap-3 h-11 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Add to grocery list footer */}
      {selectMode && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={confirmAdd}
            disabled={selected.size === 0}
          >
            <ListPlusIcon className="w-4 h-4" />
            Add {selected.size > 0 ? selected.size : ''} to grocery list
          </Button>
        </div>
      )}

      {/* Confirmation */}
      {feedback && !selectMode && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckIcon className="w-3.5 h-3.5" />
          {feedback}
        </div>
      )}
    </Card>
  );
}
