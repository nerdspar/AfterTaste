'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/aftertaste/Card';
import { Button } from '@/components/aftertaste/Button';
import { cn } from '@/lib/utils';
import { PlusIcon, TrashIcon, ImageIcon } from 'lucide-react';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import type { Recipe, Ingredient, Instruction } from '@/data/sample/recipes';
import type { ParsedRecipe } from '@/lib/recipe-parser';

interface RecipeFormProps {
  recipe?: Recipe;
  imported?: ParsedRecipe;
}

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Dessert'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const SOURCES = [
  'Cooking Class',
  'Internet',
  'Cookbook',
  'Family Recipe',
  'Friend Recommendation',
  'Original',
  'AI Generated',
];
const COOKING_CLASS_TYPES = [
  'Light & Fresh',
  'Taco Tuesday',
  'Fusion Feast',
  'Cozy Comfort Food',
  'Feeling Fancy',
  'Date Night In',
  'Pasta Party',
  'Salad Celebration',
];

const inputClasses = cn(
  'w-full h-10 px-3 rounded-lg text-sm',
  'border border-gray-200 bg-white',
  'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
  'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/40',
  'transition-colors',
);

const selectClasses = cn(
  'h-10 px-3 rounded-lg text-sm',
  'border border-gray-200 bg-white',
  'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
  'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
);

const labelClasses =
  'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5';

function generateId(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) + `-${Date.now().toString(36)}`
  );
}

function resolveCategory(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const match = CATEGORIES.find(
    (c) => c.toLowerCase() === value.toLowerCase(),
  );
  return match ?? fallback;
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export function RecipeForm({ recipe, imported }: RecipeFormProps) {
  const isEditing = !!recipe;
  const router = useRouter();
  const { addRecipe, updateRecipe } = useRecipeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const init = imported ?? {};

  const [title, setTitle] = useState(recipe?.title ?? init.title ?? '');
  const [category, setCategory] = useState(
    recipe?.category ?? resolveCategory(init.category, 'Dinner'),
  );
  const [cuisine, setCuisine] = useState(recipe?.cuisine ?? init.cuisine ?? '');
  const [description, setDescription] = useState(
    recipe?.description ?? init.description ?? '',
  );
  const [image, setImage] = useState(recipe?.image ?? init.image ?? '');
  const [servings, setServings] = useState(
    recipe?.servings ?? init.servings ?? 4,
  );
  const [prepTime, setPrepTime] = useState(
    recipe?.prepTimeMinutes ?? init.prepTimeMinutes ?? 15,
  );
  const [cookTime, setCookTime] = useState(
    recipe?.cookTimeMinutes ?? init.cookTimeMinutes ?? 30,
  );
  const [calories, setCalories] = useState(
    recipe?.calories ?? init.calories ?? 400,
  );
  const [difficulty, setDifficulty] = useState(
    recipe?.difficulty ?? 'Medium',
  );
  const [source, setSource] = useState(recipe?.source ?? 'Original');
  const [cookingClassType, setCookingClassType] = useState(
    recipe?.cookingClassType ?? 'Cozy Comfort Food',
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients ??
      init.ingredients ?? [{ name: '', quantity: '', image: '' }],
  );
  const [instructions, setInstructions] = useState<Instruction[]>(
    recipe?.instructions ??
      init.instructions ?? [
        { step: '01', title: '', body: '', videoThumb: '' },
      ],
  );
  const [imageError, setImageError] = useState('');

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');

    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Image must be under 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function updateIngredient(
    index: number,
    field: keyof Ingredient,
    value: string,
  ) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
    );
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: '', quantity: '', image: '' }]);
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInstruction(
    index: number,
    field: keyof Instruction,
    value: string,
  ) {
    setInstructions((prev) =>
      prev.map((inst, i) =>
        i === index ? { ...inst, [field]: value } : inst,
      ),
    );
  }

  function addInstruction() {
    setInstructions((prev) => [
      ...prev,
      {
        step: String(prev.length + 1).padStart(2, '0'),
        title: '',
        body: '',
        videoThumb: '',
      },
    ]);
  }

  function removeInstruction(index: number) {
    setInstructions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((inst, i) => ({
          ...inst,
          step: String(i + 1).padStart(2, '0'),
        })),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const totalTime = prepTime + cookTime;
    const formatTime = (mins: number) => {
      if (mins >= 60) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m} mins` : `${h}h`;
      }
      return `${mins} mins`;
    };

    const validIngredients = ingredients.filter((i) => i.name.trim());
    const validInstructions = instructions
      .filter((i) => i.body.trim())
      .map((inst, i) => ({
        ...inst,
        step: String(i + 1).padStart(2, '0'),
        title: inst.title || `Step ${i + 1}`,
      }));

    const recipeData: Recipe = {
      id: isEditing ? recipe.id : generateId(title),
      title: title.trim(),
      category,
      image:
        image ||
        'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&h=400&fit=crop',
      rating: recipe?.rating ?? 0,
      ratingCount: recipe?.ratingCount ?? 0,
      cookTime: formatTime(cookTime),
      cookTimeMinutes: cookTime,
      prepTimeMinutes: prepTime,
      totalTimeMinutes: totalTime,
      servings,
      calories,
      difficulty,
      sweetness: recipe?.sweetness ?? 0,
      isFavorite: recipe?.isFavorite ?? false,
      description: description.trim(),
      ingredients: validIngredients,
      instructions: validInstructions,
      chef: recipe?.chef ?? {
        name: 'You',
        avatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face',
        recipeCount: 1,
        rating: 5.0,
      },
      source,
      cuisine: cuisine.trim() || 'American',
      cookingClassType,
      ease: recipe?.ease ?? 3,
      taste: recipe?.taste ?? 3,
      cleanup: recipe?.cleanup ?? 3,
      makeAgain: recipe?.makeAgain ?? false,
      remade: recipe?.remade ?? 0,
    };

    if (isEditing) {
      updateRecipe(recipe.id, recipeData);
      router.push(`/recipes/${recipe.id}`);
    } else {
      addRecipe(recipeData);
      router.push(`/recipes/${recipeData.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      {/* Basic Info */}
      <Card>
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
          Basic Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelClasses}>
              Recipe Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fluffy Banana Pancakes"
              className={inputClasses}
              required
            />
          </div>

          <div>
            <label className={labelClasses}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of your recipe..."
              rows={3}
              className={cn(inputClasses, 'h-auto py-2.5')}
            />
          </div>

          {/* Image upload */}
          <div>
            <label className={labelClasses}>Photo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {image ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt="Recipe preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white/90 text-xs font-medium text-gray-700 hover:bg-white transition-colors"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="px-3 py-1.5 rounded-lg bg-white/90 text-xs font-medium text-red-500 hover:bg-white transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors',
                  'border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500',
                  'bg-gray-50/50 dark:bg-gray-800/20',
                )}
              >
                <ImageIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Click to upload a photo
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  Max 2 MB
                </span>
              </button>
            )}
            {imageError && (
              <p className="text-xs text-red-500 mt-1">{imageError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClasses}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={cn(selectClasses, 'w-full')}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Cuisine</label>
              <input
                type="text"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="e.g. Italian"
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={cn(selectClasses, 'w-full')}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelClasses}>Prep (mins)</label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                min={0}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Cook (mins)</label>
              <input
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(Number(e.target.value))}
                min={0}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Servings</label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                min={1}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Calories</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                min={0}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClasses}>Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={cn(selectClasses, 'w-full')}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Class Type</label>
              <select
                value={cookingClassType}
                onChange={(e) => setCookingClassType(e.target.value)}
                className={cn(selectClasses, 'w-full')}
              >
                {COOKING_CLASS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Ingredients */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Ingredients
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addIngredient}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={ing.name}
                onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                placeholder="Ingredient name"
                className={cn(inputClasses, 'flex-1')}
              />
              <input
                type="text"
                value={ing.quantity}
                onChange={(e) =>
                  updateIngredient(i, 'quantity', e.target.value)
                }
                placeholder="Qty"
                className={cn(inputClasses, 'w-28')}
              />
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
              >
                <TrashIcon className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Instructions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Instructions
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addInstruction}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Step
          </Button>
        </div>
        <div className="space-y-4">
          {instructions.map((inst, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30"
            >
              <span className="text-xs font-bold text-primary-500 tabular-nums pt-2.5 flex-shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={inst.title}
                  onChange={(e) =>
                    updateInstruction(i, 'title', e.target.value)
                  }
                  placeholder="Step title (optional)"
                  className={inputClasses}
                />
                <textarea
                  value={inst.body}
                  onChange={(e) =>
                    updateInstruction(i, 'body', e.target.value)
                  }
                  placeholder="Describe this step..."
                  rows={2}
                  className={cn(inputClasses, 'h-auto py-2.5')}
                />
              </div>
              <button
                type="button"
                onClick={() => removeInstruction(i)}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0 self-start"
              >
                <TrashIcon className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="lg">
          {isEditing ? 'Save Changes' : 'Create Recipe'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
