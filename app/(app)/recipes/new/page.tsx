'use client';

import { Breadcrumbs } from '@/components/aftertaste/Breadcrumbs';
import { RecipeForm } from '@/components/aftertaste/recipe-form/RecipeForm';

export default function NewRecipePage() {
  const breadcrumbs = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Recipes', href: '/recipes' },
    { label: 'New Recipe' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Create Recipe
      </h1>
      <Breadcrumbs items={breadcrumbs} className="mb-5" />
      <RecipeForm />
    </div>
  );
}
