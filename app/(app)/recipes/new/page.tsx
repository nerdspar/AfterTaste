'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/aftertaste/Breadcrumbs';
import { RecipeForm } from '@/components/aftertaste/recipe-form/RecipeForm';
import { IMPORT_KEY } from '@/components/aftertaste/ImportRecipeModal';
import type { ParsedRecipe } from '@/lib/recipe-parser';

function NewRecipeContent() {
  const searchParams = useSearchParams();
  const isImport = searchParams.get('import') === '1';
  const [imported, setImported] = useState<ParsedRecipe | undefined>();

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

  const breadcrumbs = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Recipes', href: '/recipes' },
    { label: isImport ? 'Import Recipe' : 'New Recipe' },
  ];

  if (isImport && !imported) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Import Recipe
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
        {isImport ? 'Import Recipe' : 'Create Recipe'}
      </h1>
      <Breadcrumbs items={breadcrumbs} className="mb-5" />
      <RecipeForm imported={imported} />
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
