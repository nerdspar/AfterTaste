'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ShareIcon } from 'lucide-react';
import { RatingStars } from '../RatingStars';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import type { Recipe } from '@/data/sample/recipes';

interface RecipeHeroProps {
  recipe: Recipe;
}

export function RecipeHero({ recipe }: RecipeHeroProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Image */}
      <div className="relative w-full md:w-72 h-48 md:h-52 rounded-2xl overflow-hidden flex-shrink-0">
        <Image
          src={recipe.image}
          alt={recipe.title}
          fill
          className="object-cover dark:brightness-90"
          sizes="(max-width: 768px) 100vw, 288px"
          priority
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <span className="inline-block text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1.5">
          {recipe.category}
        </span>

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 mb-2">
          {recipe.title}
        </h2>

        <RatingStars
          rating={recipe.rating}
          count={recipe.ratingCount}
          size="md"
          className="mb-3"
        />

        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
          {recipe.description}{' '}
          <button className="text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 font-medium">
            Read more
          </button>
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="md">
            Start Cooking
          </Button>
          <Button variant="secondary" size="md">
            Ask AI
          </Button>
          <Button variant="outline" size="md">
            Meal Plan
          </Button>
          <IconButton aria-label="Share">
            <ShareIcon className="w-[18px] h-[18px]" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
