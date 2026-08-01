'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { RecipePlaceholder } from '../RecipePlaceholder';
import { hasRecipePhoto } from '@/lib/recipe-image';
import { useRouter } from 'next/navigation';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TagsIcon,
  CopyIcon,
  CalendarPlusIcon,
  ShareIcon,
  HeartIcon,
  Trash2Icon,
  StarIcon,
  GlobeIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { recipePersonalRating } from '@/lib/recipe-rating';
import { RatingStars } from '../RatingStars';
import { IconButton } from '../IconButton';
import { useFavorites } from '../FavoritesProvider';
import { useRecipeStore } from '../RecipeStoreProvider';
import { DUPLICATE_KEY } from '../recipe-form/RecipeForm';
import { shareOrCopy } from '@/lib/share';
import { TagsRatingsModal } from './TagsRatingsModal';
import { DeleteRecipeDialog } from './DeleteRecipeDialog';
import type { Recipe } from '@/data/sample/recipes';

interface RecipeHeroProps {
  recipe: Recipe;
}

export function RecipeHero({ recipe }: RecipeHeroProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { deleteRecipe } = useRecipeStore();
  const favorited = isFavorite(recipe.id);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string) {
    setToast(msg);
    setMenuOpen(false);
  }

  function handleConfirmDelete() {
    setDeleteDialogOpen(false);
    // Removing the recipe unmounts this page; the detail route redirects to
    // the recipe list once the recipe is gone.
    deleteRecipe(recipe.id);
  }

  const menuItems: Array<{
    label: string;
    icon: LucideIcon;
    destructive?: boolean;
    action: () => void | Promise<void>;
  }> = [
    {
      label: favorited ? 'Remove from Favorites' : 'Add to Favorites',
      icon: HeartIcon,
      action: () => {
        toggleFavorite(recipe.id);
        showToast(favorited ? 'Removed from favorites' : 'Added to favorites');
      },
    },
    {
      label: 'Edit Recipe',
      icon: PencilIcon,
      action: () => {
        setMenuOpen(false);
        router.push(`/recipes/${recipe.id}/edit`);
      },
    },
    {
      label: 'Edit Tags & Ratings',
      icon: TagsIcon,
      action: () => {
        setMenuOpen(false);
        setTagsModalOpen(true);
      },
    },
    {
      label: 'Add to Meal Plan',
      icon: CalendarPlusIcon,
      action: () => {
        setMenuOpen(false);
        router.push(`/meal-planner?add=${recipe.id}`);
      },
    },
    {
      label: 'Duplicate',
      icon: CopyIcon,
      action: () => {
        setMenuOpen(false);
        try {
          sessionStorage.setItem(DUPLICATE_KEY, JSON.stringify(recipe));
        } catch {}
        router.push('/recipes/new?duplicate=1');
      },
    },
    {
      label: 'Share',
      icon: ShareIcon,
      action: async () => {
        setMenuOpen(false);
        const result = await shareOrCopy({
          title: recipe.title,
          text: `Check out this recipe: ${recipe.title}`,
          url: window.location.href,
        });
        if (result === 'copied') showToast('Link copied to clipboard');
        else if (result === 'error') showToast('Could not share');
      },
    },
    {
      label: 'Delete Recipe',
      icon: Trash2Icon,
      destructive: true,
      action: () => {
        setMenuOpen(false);
        setDeleteDialogOpen(true);
      },
    },
  ];

  return (
    <>
      <div className="relative">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Image */}
          <div className="relative w-full md:w-72 h-48 md:h-52 rounded-2xl overflow-hidden flex-shrink-0">
            {hasRecipePhoto(recipe.image) ? (
              <Image
                src={recipe.image}
                alt={recipe.title}
                fill
                className="object-cover dark:brightness-90"
                sizes="(max-width: 768px) 100vw, 288px"
                priority
              />
            ) : (
              <RecipePlaceholder className="absolute inset-0 w-full h-full" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="inline-flex items-center rounded-full bg-primary-500/10 px-2 py-0.5 text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                  {recipe.category}
                </span>
                {recipe.cuisine && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <GlobeIcon className="w-3 h-3" />
                    {recipe.cuisine}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Favorite button */}
                <IconButton
                  aria-label={
                    favorited
                      ? 'Remove from favorites'
                      : 'Add to favorites'
                  }
                  size="sm"
                  onClick={() => {
                    toggleFavorite(recipe.id);
                    setToast(
                      favorited
                        ? 'Removed from favorites'
                        : 'Added to favorites',
                    );
                  }}
                >
                  <HeartIcon
                    className={cn(
                      'w-[18px] h-[18px]',
                      favorited ? 'fill-red-500 text-red-500' : '',
                    )}
                  />
                </IconButton>

                {/* Actions menu */}
                <div className="relative" ref={menuRef}>
                  <IconButton
                    aria-label="Recipe actions"
                    size="sm"
                    onClick={() => setMenuOpen((prev) => !prev)}
                  >
                    <EllipsisVerticalIcon className="w-[18px] h-[18px]" />
                  </IconButton>

                  {menuOpen && (
                    <div
                      className={cn(
                        'absolute right-0 top-full mt-1 z-30 w-52',
                        'rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
                        'dark:border-gray-700 dark:bg-slate-900',
                      )}
                    >
                      {menuItems.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.action}
                          className={cn(
                            'flex w-full items-center gap-2.5 px-3 py-2 text-sm',
                            'transition-colors',
                            item.destructive
                              ? cn(
                                  'mt-1 border-t border-gray-100 pt-2.5 dark:border-gray-800',
                                  'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10',
                                )
                              : cn(
                                  'text-gray-700 hover:bg-gray-50',
                                  'dark:text-gray-300 dark:hover:bg-gray-800',
                                ),
                          )}
                        >
                          <item.icon
                            className={cn(
                              'w-4 h-4',
                              item.destructive
                                ? 'text-red-500 dark:text-red-400'
                                : 'text-gray-400 dark:text-gray-500',
                            )}
                          />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 mb-2">
              {recipe.title}
            </h2>

            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <RatingStars rating={recipePersonalRating(recipe)} size="md" />
              {recipe.ratingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <StarIcon className="w-3 h-3 fill-gray-400 text-gray-400 dark:fill-gray-500 dark:text-gray-500" />
                  Community {recipe.rating.toFixed(1)} ·{' '}
                  {recipe.ratingCount.toLocaleString()} ratings
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
              {recipe.description}
            </p>
          </div>
        </div>

        {/* Toast notification */}
        {toast && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(100%+8px)] z-40 px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            {toast}
          </div>
        )}
      </div>

      {/* Tags & Ratings modal */}
      <TagsRatingsModal
        recipe={recipe}
        open={tagsModalOpen}
        onClose={() => setTagsModalOpen(false)}
      />

      {/* Delete confirmation dialog */}
      <DeleteRecipeDialog
        recipeTitle={recipe.title}
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
