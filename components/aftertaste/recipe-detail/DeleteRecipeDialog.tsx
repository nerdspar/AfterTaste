'use client';

import { useEffect } from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../Button';

interface DeleteRecipeDialogProps {
  recipeTitle: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteRecipeDialog({
  recipeTitle,
  open,
  onClose,
  onConfirm,
}: DeleteRecipeDialogProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-recipe-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          'relative w-full max-w-sm',
          'rounded-2xl border border-gray-200 bg-white shadow-xl p-5',
          'dark:border-gray-700 dark:bg-slate-900',
          'animate-in fade-in zoom-in-95 duration-200',
        )}
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
            <TriangleAlertIcon className="h-5 w-5 text-red-500" />
          </div>
          <div className="min-w-0">
            <h2
              id="delete-recipe-title"
              className="text-base font-bold text-gray-900 dark:text-gray-100"
            >
              Delete recipe?
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {recipeTitle}
              </span>{' '}
              will be permanently removed. This can&apos;t be undone.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="flex-1 bg-red-500 hover:bg-red-600 focus-visible:ring-red-500/30"
            onClick={onConfirm}
          >
            Delete
          </Button>
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
