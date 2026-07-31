'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  PencilIcon,
  TagsIcon,
  CalendarPlusIcon,
  CopyIcon,
  ShareIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react';
import { useRecipeStore } from './RecipeStoreProvider';
import { TagsRatingsModal } from './recipe-detail/TagsRatingsModal';
import { DeleteRecipeDialog } from './recipe-detail/DeleteRecipeDialog';
import type { Recipe } from '@/data/sample/recipes';

const MENU_WIDTH = 208;
const MENU_HEIGHT = 280;

interface MenuState {
  recipe: Recipe;
  x: number;
  y: number;
}

interface RecipeActionsContextValue {
  openMenu: (recipe: Recipe, x: number, y: number) => void;
}

const RecipeActionsContext = createContext<RecipeActionsContextValue | null>(
  null,
);

interface ActionItem {
  label: string;
  icon: LucideIcon;
  destructive?: boolean;
  run: (recipe: Recipe) => void;
}

export function RecipeActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { deleteRecipe } = useRecipeStore();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [tagsRecipe, setTagsRecipe] = useState<Recipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openMenu = useCallback((recipe: Recipe, x: number, y: number) => {
    setMenu({ recipe, x, y });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [menu, closeMenu]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const actions: ActionItem[] = [
    {
      label: 'Edit Recipe',
      icon: PencilIcon,
      run: (r) => router.push(`/recipes/${r.id}/edit`),
    },
    {
      label: 'Edit Tags & Ratings',
      icon: TagsIcon,
      run: (r) => setTagsRecipe(r),
    },
    {
      label: 'Add to Meal Plan',
      icon: CalendarPlusIcon,
      run: (r) => router.push(`/meal-planner?add=${r.id}`),
    },
    {
      label: 'Duplicate',
      icon: CopyIcon,
      run: () => setToast('Recipe duplicated (coming soon)'),
    },
    {
      label: 'Share',
      icon: ShareIcon,
      run: async (r) => {
        try {
          await navigator.clipboard.writeText(
            `${window.location.origin}/recipes/${r.id}`,
          );
          setToast('Link copied to clipboard');
        } catch {
          setToast('Could not copy link');
        }
      },
    },
    {
      label: 'Delete Recipe',
      icon: Trash2Icon,
      destructive: true,
      run: (r) => setDeleteTarget(r),
    },
  ];

  function handleConfirmDelete() {
    if (deleteTarget) {
      try {
        deleteRecipe(deleteTarget.id);
      } catch {}
    }
    setDeleteTarget(null);
  }

  const left = menu
    ? Math.max(8, Math.min(menu.x, window.innerWidth - MENU_WIDTH - 8))
    : 0;
  const top = menu
    ? Math.max(8, Math.min(menu.y, window.innerHeight - MENU_HEIGHT - 8))
    : 0;

  return (
    <RecipeActionsContext.Provider value={{ openMenu }}>
      {children}

      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeMenu();
            }}
          />
          <div
            role="menu"
            style={{ left, top, width: MENU_WIDTH }}
            className={cn(
              'fixed z-50 rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
              'dark:border-gray-700 dark:bg-slate-900',
              'animate-in fade-in zoom-in-95 duration-100',
            )}
          >
            {actions.map((action, i) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  const r = menu.recipe;
                  closeMenu();
                  action.run(r);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                  action.destructive
                    ? cn(
                        'mt-1 border-t border-gray-100 pt-2.5 dark:border-gray-800',
                        'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10',
                      )
                    : cn(
                        'text-gray-700 hover:bg-gray-50',
                        'dark:text-gray-300 dark:hover:bg-gray-800',
                      ),
                  i === 0 && 'rounded-t-lg',
                )}
              >
                <action.icon
                  className={cn(
                    'w-4 h-4',
                    action.destructive
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-gray-400 dark:text-gray-500',
                  )}
                />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}

      {tagsRecipe && (
        <TagsRatingsModal
          recipe={tagsRecipe}
          open
          onClose={() => setTagsRecipe(null)}
        />
      )}

      {deleteTarget && (
        <DeleteRecipeDialog
          recipeTitle={deleteTarget.title}
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </RecipeActionsContext.Provider>
  );
}

export function useRecipeActions() {
  const ctx = useContext(RecipeActionsContext);
  if (!ctx)
    throw new Error(
      'useRecipeActions must be used within RecipeActionsProvider',
    );
  return ctx;
}
