'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TagsIcon,
  CopyIcon,
  CalendarPlusIcon,
  ShareIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RatingStars } from '../RatingStars';
import { IconButton } from '../IconButton';
import type { Recipe } from '@/data/sample/recipes';

interface RecipeHeroProps {
  recipe: Recipe;
}

const menuItems = [
  { label: 'Edit Recipe', icon: PencilIcon },
  { label: 'Edit Tags & Ratings', icon: TagsIcon },
  { label: 'Duplicate', icon: CopyIcon },
  { label: 'Add to Meal Plan', icon: CalendarPlusIcon },
  { label: 'Share', icon: ShareIcon },
];

export function RecipeHero({ recipe }: RecipeHeroProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="inline-block text-xs font-semibold text-primary-600 dark:text-primary-400">
            {recipe.category}
          </span>

          {/* Actions menu */}
          <div className="relative flex-shrink-0" ref={menuRef}>
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
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700',
                      'hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
                      'transition-colors',
                    )}
                  >
                    <item.icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
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
  );
}
