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

// How much a match is worth by *where* it lands. A title hit should always beat
// a hit buried in a step, so searching "dip" surfaces "Spinach Dip" ahead of a
// recipe whose steps say "dip the bread in the egg".
const FIELD_WEIGHT: Record<string, number> = {
  title: 100,
  tag: 60,
  category: 55,
  cuisine: 50,
  ingredient: 40,
  source: 30,
  chef: 30,
  section: 25,
  description: 20,
  notes: 15,
  step: 10,
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-word test: "dip" matches "Spinach Dip" but not "dipping".
function hasWholeWord(lower: string, term: string): boolean {
  return new RegExp(`\\b${escapeRe(term)}\\b`).test(lower);
}

/**
 * A relevance score for ranking. Every query term must appear somewhere (AND
 * semantics) — a missing term returns -1 (no match). Otherwise each term scores
 * by its best field, with a bonus for whole-word hits, plus phrase bonuses when
 * the whole query lands in the title.
 */
function scoreRecipe(r: Recipe, ts: string[]): number {
  const segs = segments(r);
  const titleLower = r.title.toLowerCase();
  const phrase = ts.join(' ');
  let total = 0;

  for (const term of ts) {
    let best = 0;
    for (const s of segs) {
      const lower = s.text.toLowerCase();
      if (!lower.includes(term)) continue;
      let w = FIELD_WEIGHT[s.where] ?? 10;
      if (hasWholeWord(lower, term)) w += 40;
      if (s.where === 'title' && lower.startsWith(term)) w += 15;
      if (w > best) best = w;
    }
    if (best === 0) return -1; // this term appears nowhere → not a match
    total += best;
  }

  if (titleLower === phrase) total += 200;
  else if (titleLower.includes(phrase)) total += 80;
  if (titleLower.startsWith(phrase)) total += 40;

  return total;
}

/** Recipes matching every query word, ranked most-relevant first. */
export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const q = query.trim();
  if (!q) return recipes;
  const ts = terms(q);
  return recipes
    .map((r, i) => ({ r, i, score: scoreRecipe(r, ts) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score || a.i - b.i) // ties keep store order
    .map((x) => x.r);
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
