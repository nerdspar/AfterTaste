'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RatingStars } from '../RatingStars';
import { IconButton } from '../IconButton';
import { useFavorites } from '../FavoritesProvider';
import { useRecipeStore } from '../RecipeStoreProvider';
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
      action: () => showToast('Recipe duplicated (coming soon)'),
    },
    {
      label: 'Share',
      icon: ShareIcon,
      action: async () => {
        const url = window.location.href;
        try {
          await navigator.clipboard.writeText(url);
          showToast('Link copied to clipboard');
        } catch {
          showToast('Could not copy link');
        }
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
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="inline-block text-xs font-semibold text-primary-600 dark:text-primary-400">
                {recipe.category}
              </span>

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

            <RatingStars
              rating={recipe.rating}
              count={recipe.ratingCount}
              size="md"
              className="mb-3"
            />

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
