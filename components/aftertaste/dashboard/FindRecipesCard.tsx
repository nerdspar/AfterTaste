'use client';

import { useState } from 'react';
import { SparklesIcon } from 'lucide-react';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { Button } from '../Button';
import { SectionHeader } from '../SectionHeader';
import { dishTypeChips, timeChips, dietChips } from '@/data/sample/recipes';

export function FindRecipesCard() {
  const [selectedDish, setSelectedDish] = useState<string>('Breakfast');
  const [selectedTime, setSelectedTime] = useState<string>('30 Mins');
  const [selectedDiet, setSelectedDiet] = useState<string>('Keto');

  return (
    <Card>
      <SectionHeader title="Find Recipes in Seconds" actionLabel="More details" />

      {/* Dish Type */}
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Dish Type
        </p>
        <div className="flex flex-wrap gap-2">
          {dishTypeChips.map((chip) => (
            <Chip
              key={chip}
              label={chip}
              selected={selectedDish === chip}
              onClick={() => setSelectedDish(chip)}
            />
          ))}
        </div>
      </div>

      {/* Time */}
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Time
        </p>
        <div className="flex flex-wrap gap-2">
          {timeChips.map((chip) => (
            <Chip
              key={chip}
              label={chip}
              selected={selectedTime === chip}
              onClick={() => setSelectedTime(chip)}
            />
          ))}
        </div>
      </div>

      {/* Diet */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Diet
        </p>
        <div className="flex flex-wrap gap-2">
          {dietChips.map((chip) => (
            <Chip
              key={chip}
              label={chip}
              selected={selectedDiet === chip}
              onClick={() => setSelectedDiet(chip)}
            />
          ))}
        </div>
      </div>

      <Button variant="primary" size="lg" fullWidth className="gap-2">
        <SparklesIcon className="w-4 h-4" />
        Generate Recipe
      </Button>
    </Card>
  );
}
