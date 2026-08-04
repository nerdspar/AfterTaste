// Shared recipe search. Matches a query against everything meaningful in a
// recipe — title, tags, ingredients, steps, notes, cuisine, source, chef — so
// searching "sherry" or "dry until firm" finds the recipe even when the phrase
// only appears deep inside it. Multi-word queries are AND-ed (every word must
// appear somewhere). Used by both the header typeahead and the recipes list.

import type { Recipe } from '@/data/sample/recipes';

export interface SearchSegment {
  where: string; // human label: "ingredient", "step", "tag", …
  text: string;
}

/** Every searchable piece of a recipe, labelled by where it came from. */
function segments(r: Recipe): SearchSegment[] {
  const segs: SearchSegment[] = [{ where: 'title', text: r.title }];
  for (const t of r.tags ?? []) segs.push({ where: 'tag', text: t });
  for (const i of r.ingredients ?? []) {
    if (i.section) segs.push({ where: 'section', text: i.section });
    else segs.push({ where: 'ingredient', text: `${i.quantity} ${i.name}`.trim() });
  }
  for (const s of r.instructions ?? []) {
    if (s.section) segs.push({ where: 'section', text: s.section });
    else if (s.body) segs.push({ where: 'step', text: s.body });
  }
  if (r.description) segs.push({ where: 'description', text: r.description });
  if (r.recipeNotes) segs.push({ where: 'notes', text: r.recipeNotes });
  if (r.myNotes) segs.push({ where: 'notes', text: r.myNotes });
  if (r.cuisine) segs.push({ where: 'cuisine', text: r.cuisine });
  segs.push({ where: 'category', text: r.category });
  if (r.source) segs.push({ where: 'source', text: r.source });
  if (r.chef?.name) segs.push({ where: 'chef', text: r.chef.name });
  return segs;
}

function terms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** True when every query word appears somewhere in the recipe. */
export function matchesQuery(r: Recipe, query: string): boolean {
  const ts = terms(query);
  if (ts.length === 0) return true;
  const haystack = segments(r)
    .map((s) => s.text)
    .join(' \n ')
    .toLowerCase();
  return ts.every((t) => haystack.includes(t));
}

export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const q = query.trim();
  if (!q) return recipes;
  return recipes.filter((r) => matchesQuery(r, q));
}

/**
 * Where inside the recipe the query matched, for a typeahead hint — prefers a
 * body match (ingredient/step/tag/notes) over the title, since the title is
 * already shown. Returns null when only the title matched.
 */
export function matchSnippet(
  r: Recipe,
  query: string,
): { where: string; text: string } | null {
  const ts = terms(query);
  if (ts.length === 0) return null;
  const segs = segments(r).filter(
    (s) => s.where !== 'title' && s.where !== 'category',
  );
  // A segment that contains the most query terms (ties → the earliest one).
  let best: SearchSegment | null = null;
  let bestHits = 0;
  for (const s of segs) {
    const lower = s.text.toLowerCase();
    const hits = ts.filter((t) => lower.includes(t)).length;
    if (hits > bestHits) {
      best = s;
      bestHits = hits;
    }
  }
  if (!best || bestHits === 0) return null;
  return { where: best.where, text: snippetAround(best.text, ts) };
}

// A short excerpt of `text` centred on the first matching term.
function snippetAround(text: string, ts: string[], radius = 32): string {
  const lower = text.toLowerCase();
  let at = -1;
  for (const t of ts) {
    const idx = lower.indexOf(t);
    if (idx !== -1 && (at === -1 || idx < at)) at = idx;
  }
  if (at === -1 || text.length <= radius * 2) return text.trim();
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}
