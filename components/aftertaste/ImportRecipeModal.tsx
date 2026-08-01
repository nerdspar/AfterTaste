'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  XIcon,
  GlobeIcon,
  FileTextIcon,
  UploadIcon,
  LoaderIcon,
  SoupIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { parseRecipeFromText, parseRecipeFromHtml } from '@/lib/recipe-parser';
import type { ParsedRecipe } from '@/lib/recipe-parser';
import { useRecipeStore } from './RecipeStoreProvider';
import { importCroutonFiles } from '@/lib/crouton-import';
import { usePref, PREF_CLIPBOARD } from '@/lib/prefs';

interface ImportRecipeModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
}

const IMPORT_KEY = 'aftertaste-import-recipe';

type Tab = 'url' | 'text' | 'file' | 'crouton';

const tabs: { key: Tab; label: string; icon: typeof GlobeIcon }[] = [
  { key: 'url', label: 'URL', icon: GlobeIcon },
  { key: 'text', label: 'Text', icon: FileTextIcon },
  { key: 'file', label: 'File', icon: UploadIcon },
  { key: 'crouton', label: 'Crouton', icon: SoupIcon },
];

const inputClasses = cn(
  'w-full h-10 px-3 rounded-lg text-sm',
  'border border-gray-200 bg-white',
  'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
  'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/40',
  'transition-colors',
);

export function ImportRecipeModal({ open, onClose, initialTab }: ImportRecipeModalProps) {
  const router = useRouter();
  const { addRecipes } = useRecipeStore();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? 'url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [croutonResult, setCroutonResult] = useState<{
    added: number;
    total: number;
  } | null>(null);
  const [clipboardDetected, setClipboardDetected] = useState(false);
  const clipboardPref = usePref(PREF_CLIPBOARD, true);
  const fileRef = useRef<HTMLInputElement>(null);
  const croutonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setError('');
      setCroutonResult(null);
      setClipboardDetected(false);
      if (initialTab) setActiveTab(initialTab);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, initialTab]);

  // Auto-detect a recipe link on the clipboard and prefill the URL field.
  useEffect(() => {
    if (!open || !clipboardPref || activeTab !== 'url') return;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.clipboard?.readText) return;
        const text = (await navigator.clipboard.readText())?.trim();
        const match = text?.match(/^https?:\/\/\S+$/);
        if (!cancelled && match) {
          setUrl((prev) => prev || match[0]);
          setClipboardDetected(true);
        }
      } catch {
        // clipboard permission denied / unavailable — ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clipboardPref, activeTab]);

  async function handleCroutonUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setError('');
    setCroutonResult(null);
    setLoading(true);
    try {
      const recipes = await importCroutonFiles(files);
      if (recipes.length === 0) {
        setError(
          "No recipes found — pick your Crouton export (.zip) or its .crumb files.",
        );
        return;
      }
      // Recipes save to your account in the background (in batches); this is
      // the number newly added (skipping duplicates already in your box).
      const added = addRecipes(recipes);
      setCroutonResult({ added, total: recipes.length });
    } catch {
      setError('Could not read that file. Is it a Crouton export?');
    } finally {
      setLoading(false);
    }
  }

  function navigateWithData(data: ParsedRecipe) {
    sessionStorage.setItem(IMPORT_KEY, JSON.stringify(data));
    onClose();
    router.push('/recipes/new?import=1');
  }

  async function handleUrlImport() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/import-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to import');
        return;
      }
      navigateWithData(data.recipe);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleTextImport() {
    if (!text.trim()) return;
    setError('');
    const trimmed = text.trim();
    const htmlParsed = trimmed.includes('<') ? parseRecipeFromHtml(trimmed) : null;
    const parsed = htmlParsed ?? parseRecipeFromText(trimmed);
    navigateWithData(parsed);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;

      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(content);
          const parsed: ParsedRecipe = {
            title: json.title || json.name,
            description: json.description,
            image: json.image,
            servings:
              typeof json.servings === 'number'
                ? json.servings
                : parseInt(json.servings, 10) || undefined,
            prepTimeMinutes:
              typeof json.prepTimeMinutes === 'number'
                ? json.prepTimeMinutes
                : parseInt(json.prepTime, 10) || undefined,
            cookTimeMinutes:
              typeof json.cookTimeMinutes === 'number'
                ? json.cookTimeMinutes
                : parseInt(json.cookTime, 10) || undefined,
            calories:
              typeof json.calories === 'number'
                ? json.calories
                : parseInt(json.calories, 10) || undefined,
            cuisine: json.cuisine,
            category: json.category,
            ingredients: json.ingredients,
            instructions: json.instructions,
          };
          navigateWithData(parsed);
        } catch {
          setError('Could not parse JSON file.');
        }
      } else {
        const parsed = parseRecipeFromText(content);
        navigateWithData(parsed);
      }
    };
    reader.readAsText(file);
  }

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          'relative w-full max-w-lg max-h-[85vh] overflow-y-auto',
          'rounded-2xl border border-gray-200 bg-white shadow-xl p-5',
          'dark:border-gray-700 dark:bg-slate-900',
          'animate-in fade-in zoom-in-95 duration-200',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Import Recipe
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setError('');
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* URL tab */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paste a recipe URL and we&apos;ll extract the title, ingredients,
              instructions, and more.
            </p>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
              placeholder="https://www.example.com/recipe/..."
              className={inputClasses}
              autoFocus
            />
            {clipboardDetected && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 -mt-1">
                <ClipboardCheckIcon className="w-3.5 h-3.5" />
                Pulled a link from your clipboard
              </p>
            )}
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={handleUrlImport}
              disabled={loading || !url.trim()}
            >
              {loading ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import from URL'
              )}
            </Button>
          </div>
        )}

        {/* Text tab */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paste a recipe as plain text, or paste the page source from a
              recipe website (right-click &rarr; View Page Source &rarr;
              Select All &rarr; Copy).
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Chicken Stir Fry\n\nIngredients:\n- 2 chicken breasts\n- 1 cup broccoli\n- 2 tbsp soy sauce\n\nInstructions:\n1. Cut chicken into strips\n2. Heat oil in a wok\n3. Stir fry chicken and vegetables`}
              rows={10}
              className={cn(inputClasses, 'h-auto py-2.5 font-mono text-xs')}
              autoFocus
            />
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={handleTextImport}
              disabled={!text.trim()}
            >
              Import from Text
            </Button>
          </div>
        )}

        {/* File tab */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Upload a recipe file. Supports <code>.txt</code> (plain text) and{' '}
              <code>.json</code> (structured data).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.json,.text"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                'w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors',
                'border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500',
                'bg-gray-50/50 dark:bg-gray-800/20',
              )}
            >
              <UploadIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Click to choose a file
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                .txt or .json
              </span>
            </button>
          </div>
        )}

        {/* Crouton tab — bulk import */}
        {activeTab === 'crouton' && (
          <div className="space-y-4">
            {croutonResult ? (
              <div className="flex flex-col items-center text-center py-4">
                <CheckCircle2Icon className="w-10 h-10 text-emerald-500 mb-3" />
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Imported {croutonResult.added}{' '}
                  {croutonResult.added === 1 ? 'recipe' : 'recipes'}
                </p>
                {croutonResult.added < croutonResult.total && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Skipped {croutonResult.total - croutonResult.added} already
                    in your collection
                  </p>
                )}
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full mt-5"
                  onClick={() => {
                    onClose();
                    router.push('/recipes');
                  }}
                >
                  View recipes
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  In Crouton, export your recipes (Settings &rarr; Export) and
                  upload the <code>.zip</code> here — or select individual{' '}
                  <code>.crumb</code> files. All of them import at once.
                </p>
                <input
                  ref={croutonRef}
                  type="file"
                  accept=".zip,.crumb"
                  multiple
                  onChange={handleCroutonUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => croutonRef.current?.click()}
                  disabled={loading}
                  className={cn(
                    'w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors',
                    'border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500',
                    'bg-gray-50/50 dark:bg-gray-800/20 disabled:opacity-60',
                  )}
                >
                  {loading ? (
                    <>
                      <LoaderIcon className="w-6 h-6 text-primary-500 animate-spin" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Importing your recipes…
                      </span>
                    </>
                  ) : (
                    <>
                      <SoupIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Choose your Crouton export
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        .zip or .crumb files
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export { IMPORT_KEY };
