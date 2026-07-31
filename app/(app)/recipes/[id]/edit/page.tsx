'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/aftertaste/Breadcrumbs';
import { RecipeForm } from '@/components/aftertaste/recipe-form/RecipeForm';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = use(params);
  const { getRecipe } = useRecipeStore();
  const recipe = getRecipe(id);

  if (!recipe) {
    notFound();
  }

  const breadcrumbs = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Recipes', href: '/recipes' },
    { label: recipe.title, href: `/recipes/${recipe.id}` },
    { label: 'Edit' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Edit Recipe
      </h1>
      <Breadcrumbs items={breadcrumbs} className="mb-5" />
      <RecipeForm recipe={recipe} />
    </div>
  );
}
