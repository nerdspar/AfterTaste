'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { RecipePlaceholder } from '../RecipePlaceholder';
import { hasRecipePhoto } from '@/lib/recipe-image';
import Link from 'next/link';
import {
  HeartIcon,
  ClockIcon,
  FlameIcon,
  GlobeIcon,
  UsersIcon,
} from 'lucide-react';
import { RatingStars } from '../RatingStars';
import { recipePersonalRating } from '@/lib/recipe-rating';
import { recipeTimeLabel } from '@/lib/recipe-time';
import { useFavorites } from '../FavoritesProvider';
import { useRecipeActions } from '../RecipeActionsProvider';
import { useLongPress } from '@/lib/useLongPress';
import type { Recipe } from '@/data/sample/recipes';

interface RecipeListItemProps {
  recipe: Recipe;
  className?: string;
}

export function RecipeListItem({ recipe, className }: RecipeListItemProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(recipe.id);
  const { openMenu } = useRecipeActions();
  const longPress = useLongPress({
    onLongPress: ({ clientX, clientY }) => openMenu(recipe, clientX, clientY),
  });

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      {...longPress}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5',
        'dark:border-gray-700/40 dark:bg-slate-900',
        'hover:border-primary-300 dark:hover:border-primary-500/40 transition-colors',
        'group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/40',
        'select-none',
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
        {hasRecipePhoto(recipe.image) ? (
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            className="object-cover dark:brightness-90"
            sizes="64px"
          />
        ) : (
          <RecipePlaceholder className="absolute inset-0 w-full h-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
            {recipe.category}
          </span>
          {recipe.cuisine && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 min-w-0">
              <GlobeIcon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{recipe.cuisine}</span>
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
          {recipe.title}
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          <RatingStars rating={recipePersonalRating(recipe)} />
          {recipeTimeLabel(recipe) && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              <ClockIcon className="w-3.5 h-3.5" />
              {recipeTimeLabel(recipe)}
            </span>
          )}
          {recipe.servings > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              <UsersIcon className="w-3.5 h-3.5" />
              {recipe.servings}
            </span>
          )}
          {recipe.calories > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              <FlameIcon className="w-3.5 h-3.5" />
              {recipe.calories} kcal
            </span>
          )}
        </div>
      </div>

      {/* Favorite */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(recipe.id);
        }}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30',
        )}
        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <HeartIcon
          className={cn(
            'w-4 h-4',
            favorited
              ? 'fill-red-500 text-red-500'
              : 'text-gray-400 dark:text-gray-500',
          )}
        />
      </button>
    </Link>
  );
}
