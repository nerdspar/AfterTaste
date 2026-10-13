// Used by app/api/export: a Next.js route file may only export its handlers.

/** Every /api/uploads file the data points at (recipe photos, step media, your avatar). */
export function uploadsReferenced(recipes: unknown[], me: unknown): string[] {
  const found = new Set<string>();
  const re = /\/api\/uploads\/[A-Za-z0-9._-]+/g;
  for (const m of JSON.stringify([recipes, me]).matchAll(re)) found.add(m[0]);
  return [...found].sort();
}
