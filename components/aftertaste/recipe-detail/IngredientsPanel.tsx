'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ChevronDownIcon } from 'lucide-react';
import { Card } from '../Card';
import type { Ingredient } from '@/data/sample/recipes';

type ScaleMode = 'amount' | 'serving';

interface IngredientsPanelProps {
  ingredients: Ingredient[];
  baseServings: number;
  scaleMode: ScaleMode;
  scaleValue: number;
  onScaleModeChange: (mode: ScaleMode) => void;
  onScaleValueChange: (value: number) => void;
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

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          Ingredients
        </h3>
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
            {currentServings} {currentServings === 1 ? 'serving' : 'servings'}
          </span>
          <ChevronDownIcon
            className={cn(
              'w-3.5 h-3.5 transition-transform duration-200',
              scaleOpen && 'rotate-180',
            )}
          />
        </button>
      </div>

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
        {ingredients.map((ing) => (
          <div
            key={ing.name}
            className="flex items-center gap-3 h-11 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
          >
            <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700">
              <Image
                src={ing.image}
                alt={ing.name}
                fill
                className="object-cover"
                sizes="28px"
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">
              {ing.name}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {scaleQuantity(ing.quantity, multiplier)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
