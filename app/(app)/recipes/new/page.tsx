'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/aftertaste/Breadcrumbs';
import {
  RecipeForm,
  DUPLICATE_KEY,
} from '@/components/aftertaste/recipe-form/RecipeForm';
import { IMPORT_KEY } from '@/components/aftertaste/ImportRecipeModal';
import type { ParsedRecipe } from '@/lib/recipe-parser';
import type { Recipe } from '@/data/sample/recipes';

function NewRecipeContent() {
  const searchParams = useSearchParams();
  const isImport = searchParams.get('import') === '1';
  const isDuplicate = searchParams.get('duplicate') === '1';
  const [imported, setImported] = useState<ParsedRecipe | undefined>();
  const [duplicate, setDuplicate] = useState<Recipe | undefined>();

  useEffect(() => {
    if (isImport) {
      try {
        const raw = sessionStorage.getItem(IMPORT_KEY);
        if (raw) {
          setImported(JSON.parse(raw));
          sessionStorage.removeItem(IMPORT_KEY);
        }
      } catch {}
    }
  }, [isImport]);

  useEffect(() => {
    if (isDuplicate) {
      try {
        const raw = sessionStorage.getItem(DUPLICATE_KEY);
        if (raw) {
          setDuplicate(JSON.parse(raw));
          sessionStorage.removeItem(DUPLICATE_KEY);
        }
      } catch {}
    }
  }, [isDuplicate]);

  const breadcrumbs = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Recipes', href: '/recipes' },
    { label: isImport ? 'Import Recipe' : 'New Recipe' },
  ];

  if ((isImport && !imported) || (isDuplicate && !duplicate)) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {isImport ? 'Import Recipe' : 'Duplicate Recipe'}
        </h1>
        <Breadcrumbs items={breadcrumbs} className="mb-5" />
        <div className="animate-pulse max-w-3xl space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-2/3" />
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        {isImport
          ? 'Import Recipe'
          : isDuplicate
            ? 'Duplicate Recipe'
            : 'Create Recipe'}
      </h1>
      <Breadcrumbs items={breadcrumbs} className="mb-5" />
      <RecipeForm imported={imported} duplicate={duplicate} />
    </div>
  );
}

export default function NewRecipePage() {
  return (
    <Suspense>
      <NewRecipeContent />
    </Suspense>
  );
}
