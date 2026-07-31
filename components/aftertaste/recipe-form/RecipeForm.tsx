'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/aftertaste/Card';
import { Button } from '@/components/aftertaste/Button';
import { cn } from '@/lib/utils';
import { PlusIcon, TrashIcon, ImageIcon, PlayIcon } from 'lucide-react';
import { useRecipeStore } from '@/components/aftertaste/RecipeStoreProvider';
import { isVideoSource } from '@/lib/media';
import type { Recipe, Ingredient, Instruction } from '@/data/sample/recipes';
import type { ParsedRecipe } from '@/lib/recipe-parser';

interface RecipeFormProps {
  recipe?: Recipe;
  imported?: ParsedRecipe;
  /** Seed a brand-new recipe with the content of an existing one (Duplicate). */
  duplicate?: Recipe;
}

/** sessionStorage key used to hand a recipe to the "new" page for duplication. */
export const DUPLICATE_KEY = 'aftertaste-duplicate-recipe';

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const SOURCES = [
  'Cooking Class',
  'Internet',
  'Cookbook',
  'Family Recipe',
  'Friend Recommendation',
  'Original',
  'AI Generated',
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
const MAX_VIDEO_SIZE = 10 * 1024 * 1024;

export function RecipeForm({ recipe, imported, duplicate }: RecipeFormProps) {
  const isEditing = !!recipe;
  const router = useRouter();
  const { addRecipe, updateRecipe } = useRecipeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepFileInputRef = useRef<HTMLInputElement>(null);

  const init = imported ?? {};
  // Editing reads from `recipe`; duplicating seeds the same content fields from
  // `duplicate` but saves as a brand-new recipe (fresh id, ratings, tags).
  const base = recipe ?? duplicate;

  const [title, setTitle] = useState(
    recipe?.title ??
      (duplicate ? `${duplicate.title} (Copy)` : (init.title ?? '')),
  );
  const [category, setCategory] = useState(
    base?.category ?? resolveCategory(init.category, 'Dinner'),
  );
  const [cuisine, setCuisine] = useState(base?.cuisine ?? init.cuisine ?? '');
  const [description, setDescription] = useState(
    base?.description ?? init.description ?? '',
  );
  const [image, setImage] = useState(base?.image ?? init.image ?? '');
  const [servings, setServings] = useState(
    base?.servings ?? init.servings ?? 4,
  );
  const [prepTime, setPrepTime] = useState(
    base?.prepTimeMinutes ?? init.prepTimeMinutes ?? 15,
  );
  const [cookTime, setCookTime] = useState(
    base?.cookTimeMinutes ?? init.cookTimeMinutes ?? 30,
  );
  const [calories, setCalories] = useState(
    base?.calories ?? init.calories ?? 400,
  );
  const [source, setSource] = useState(base?.source ?? 'Original');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    base?.ingredients ??
      init.ingredients ?? [{ name: '', quantity: '', image: '' }],
  );
  const [instructions, setInstructions] = useState<Instruction[]>(
    base?.instructions ??
      init.instructions ?? [
        { step: '01', title: '', body: '', videoThumb: '' },
      ],
  );
  const [imageError, setImageError] = useState('');
  const [stepUploadIndex, setStepUploadIndex] = useState<number | null>(null);
  const [stepImageError, setStepImageError] = useState('');
  const [submitError, setSubmitError] = useState('');

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

  function openStepMediaPicker(index: number) {
    setStepImageError('');
    setStepUploadIndex(index);
    stepFileInputRef.current?.click();
  }

  function handleStepMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const index = stepUploadIndex;
    e.target.value = '';
    if (!file || index === null) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setStepImageError('Please select an image or video file.');
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      setStepImageError('Video must be under 10 MB.');
      return;
    }
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      setStepImageError('Image must be under 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateInstruction(index, 'videoThumb', reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function removeStepMedia(index: number) {
    updateInstruction(index, 'videoThumb', '');
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
      rating: recipe?.rating ?? init.rating ?? 0,
      ratingCount: recipe?.ratingCount ?? init.ratingCount ?? 0,
      cookTime: formatTime(cookTime),
      cookTimeMinutes: cookTime,
      prepTimeMinutes: prepTime,
      totalTimeMinutes: totalTime,
      servings,
      calories,
      difficulty: recipe?.difficulty ?? 'Medium',
      cost: recipe?.cost ?? 0,
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
      cookingClassType: recipe?.cookingClassType ?? 'Cozy Comfort Food',
      ease: recipe?.ease ?? 0,
      taste: recipe?.taste ?? 0,
      cleanup: recipe?.cleanup ?? 0,
      makeAgain: recipe?.makeAgain ?? null,
      remade: recipe?.remade ?? 0,
      tags: recipe?.tags ?? [],
      createdAt: recipe?.createdAt ?? Date.now(),
    };

    try {
      setSubmitError('');
      if (isEditing) {
        updateRecipe(recipe.id, recipeData);
        router.push(`/recipes/${recipe.id}`);
      } else {
        addRecipe(recipeData);
        router.push(`/recipes/${recipeData.id}`);
      }
    } catch {
      setSubmitError(
        'Could not save — a step photo or video may be too large for browser storage. Try a smaller file.',
      );
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
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">
          Instructions
        </h2>
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
                {/* Per-step photo / video */}
                {inst.videoThumb ? (
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                    {isVideoSource(inst.videoThumb) ? (
                      <>
                        <video
                          src={inst.videoThumb}
                          className="absolute inset-0 w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-6 h-6 rounded-full bg-white/85 flex items-center justify-center">
                            <PlayIcon className="w-3 h-3 text-gray-900 fill-gray-900 ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={inst.videoThumb}
                        alt="Step preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeStepMedia(i)}
                      aria-label="Remove step media"
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 opacity-0 hover:opacity-100 transition-all"
                    >
                      <TrashIcon className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openStepMediaPicker(i)}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs',
                      'border border-dashed border-gray-300 text-gray-500',
                      'hover:border-primary-400 hover:text-primary-500',
                      'dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500',
                      'transition-colors',
                    )}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Add photo/video
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeInstruction(i)}
                aria-label="Remove step"
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0 self-start"
              >
                <TrashIcon className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
        {/* Shared hidden input for per-step photo/video uploads */}
        <input
          ref={stepFileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleStepMediaUpload}
          className="hidden"
        />
        {stepImageError && (
          <p className="text-xs text-red-500 mt-2">{stepImageError}</p>
        )}
        <button
          type="button"
          onClick={addInstruction}
          className={cn(
            'mt-4 w-full h-11 rounded-xl border-2 border-dashed',
            'flex items-center justify-center gap-1.5 text-sm font-medium',
            'border-gray-200 text-gray-500 hover:border-primary-400 hover:text-primary-500',
            'dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-500',
            'transition-colors',
          )}
        >
          <PlusIcon className="w-4 h-4" />
          Add Step
        </button>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        {submitError && (
          <p className="text-sm text-red-500">{submitError}</p>
        )}
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
      </div>
    </form>
  );
}
