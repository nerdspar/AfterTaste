'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { HeartIcon, ClockIcon, FlameIcon } from 'lucide-react';
import { RatingStars } from '../RatingStars';
import { Button } from '../Button';
import { useFavorites } from '../FavoritesProvider';
import type { Recipe } from '@/data/sample/recipes';

interface RecipeCardProps {
  recipe: Recipe;
  className?: string;
}

export function RecipeCard({ recipe, className }: RecipeCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(recipe.id);

  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white overflow-hidden',
        'dark:border-gray-700/40 dark:bg-slate-900',
        'hover:-translate-y-0.5 transition-all duration-150',
        'group',
        className,
      )}
    >
      {/* Image */}
      <div className="relative h-36">
        <Image
          src={recipe.image}
          alt={recipe.title}
          fill
          className="object-cover dark:brightness-90"
          sizes="(max-width: 768px) 100vw, 300px"
        />

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(recipe.id);
          }}
          className={cn(
            'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center',
            'bg-white/90 dark:bg-gray-900/80',
            'hover:scale-110 transition-transform',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30',
          )}
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <HeartIcon
            className={cn(
              'w-4 h-4',
              favorited
                ? 'fill-red-500 text-red-500'
                : 'text-gray-500 dark:text-gray-400',
            )}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <RatingStars
          rating={recipe.rating}
          count={recipe.ratingCount}
          className="mb-1.5"
        />

        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 leading-snug">
          {recipe.title}
        </h3>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span className="flex items-center gap-1 tabular-nums">
            <ClockIcon className="w-3.5 h-3.5" />
            {recipe.cookTime}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <FlameIcon className="w-3.5 h-3.5" />
            {recipe.calories} kcal
          </span>
        </div>

        <Link href={`/recipes/${recipe.id}`}>
          <Button variant="outline" size="sm" fullWidth>
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
}
