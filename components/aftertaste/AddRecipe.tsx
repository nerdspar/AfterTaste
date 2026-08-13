'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, DownloadIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserPrefs } from './UserPrefsProvider';
import { ImportRecipeModal } from './ImportRecipeModal';

// Mobile "add a recipe" affordance. Its placement is a user preference:
//   'header' — a "+" that sits inline in the page's title row
//   'fab'    — a floating button pinned bottom-right above the tab bar
//   'off'    — hidden (add lives only in the More sheet)
// Either button opens a small sheet: Create recipe / Import recipe. Desktop is
// unaffected (add lives in the sidebar), so this is md:hidden throughout.
export function AddRecipe() {
  const { prefs } = useUserPrefs();
  const style = prefs.addButton;
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  if (style === 'off') return null;

  const createRecipe = () => {
    setSheetOpen(false);
    router.push('/recipes/new');
  };
  const importRecipe = () => {
    setSheetOpen(false);
    setImportOpen(true);
  };

  return (
    <>
      {style === 'fab' ? (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Add recipe"
          className={cn(
            'fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full md:hidden',
            'bottom-[calc(5rem+env(safe-area-inset-bottom))]',
            'bg-primary-500 text-white shadow-lg shadow-primary-500/40 ring-1 ring-white/15',
            'transition-transform active:scale-95',
          )}
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Add recipe"
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full md:hidden',
            'bg-primary-500 text-white shadow-sm transition-colors hover:bg-primary-600',
          )}
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      )}

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Add a recipe
              </h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={createRecipe}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800/60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                <PlusIcon className="h-4 w-4" />
              </span>
              <span className="flex-1">Create recipe</span>
            </button>
            <button
              type="button"
              onClick={importRecipe}
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3.5 text-left text-sm text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-100 dark:hover:bg-gray-800/60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <DownloadIcon className="h-4 w-4" />
              </span>
              <span className="flex-1">Import recipe</span>
            </button>
          </div>
        </div>
      )}

      <ImportRecipeModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
