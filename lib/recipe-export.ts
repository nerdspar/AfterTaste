import type { Recipe } from '@/data/sample/recipes';

/** Download all recipes as a JSON file (re-importable via the File tab). */
export function exportRecipesJson(recipes: Recipe[]): void {
  if (typeof document === 'undefined') return;
  const payload = {
    app: 'AfterTaste',
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aftertaste-recipes-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
