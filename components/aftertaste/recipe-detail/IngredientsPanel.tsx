'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';
import Image from 'next/image';
import { Card } from '../Card';
import { Button } from '../Button';
import type { Ingredient } from '@/data/sample/recipes';

interface IngredientsPanelProps {
  ingredients: Ingredient[];
}

export function IngredientsPanel({ ingredients }: IngredientsPanelProps) {
  const [servings, setServings] = useState(2);

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          Ingredients
        </h3>
        <button className="flex items-center gap-1 h-7 px-2.5 rounded-full border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          {servings} servings
          <ChevronDownIcon className="w-3 h-3" />
        </button>
      </div>

      {/* Ingredient rows */}
      <div className="space-y-1 mb-4">
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
              {ing.quantity}
            </span>
          </div>
        ))}
      </div>

      <Button variant="primary" fullWidth>
        View Details
      </Button>
    </Card>
  );
}
