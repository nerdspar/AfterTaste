// Runtime-swappable accent color. Tailwind's `primary-*` colors resolve to
// `rgb(var(--primary-*) / <alpha-value>)`, so changing these CSS variables
// recolors the whole app (opacity modifiers like `primary-500/10` still work).

export interface AccentShades {
  lighter: string;
  light: string;
  main: string;
  dark: string;
  darker: string;
}

export interface AccentPreset {
  id: string;
  name: string;
  shades: AccentShades;
}

export const ACCENT_STORAGE_KEY = 'aftertaste-accent';
export const DEFAULT_ACCENT_ID = 'orange';

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'orange', name: 'Orange', shades: { lighter: '#ffedd5', light: '#fb923c', main: '#f97316', dark: '#ea580c', darker: '#c2410c' } },
  { id: 'rose', name: 'Rose', shades: { lighter: '#ffe4e6', light: '#fb7185', main: '#f43f5e', dark: '#e11d48', darker: '#be123c' } },
  { id: 'amber', name: 'Amber', shades: { lighter: '#fef3c7', light: '#fbbf24', main: '#f59e0b', dark: '#d97706', darker: '#b45309' } },
  { id: 'emerald', name: 'Emerald', shades: { lighter: '#d1fae5', light: '#34d399', main: '#10b981', dark: '#059669', darker: '#047857' } },
  { id: 'teal', name: 'Teal', shades: { lighter: '#ccfbf1', light: '#2dd4bf', main: '#14b8a6', dark: '#0d9488', darker: '#0f766e' } },
  { id: 'blue', name: 'Blue', shades: { lighter: '#dbeafe', light: '#60a5fa', main: '#3b82f6', dark: '#2563eb', darker: '#1d4ed8' } },
  { id: 'violet', name: 'Violet', shades: { lighter: '#ede9fe', light: '#a78bfa', main: '#8b5cf6', dark: '#7c3aed', darker: '#6d28d9' } },
  { id: 'pink', name: 'Pink', shades: { lighter: '#fce7f3', light: '#f472b6', main: '#ec4899', dark: '#db2777', darker: '#be185d' } },
];

const VAR_NAMES: Record<keyof AccentShades, string> = {
  lighter: '--primary-lighter',
  light: '--primary-light',
  main: '--primary-main',
  dark: '--primary-dark',
  darker: '--primary-darker',
};

const SHADE_KEYS = Object.keys(VAR_NAMES) as (keyof AccentShades)[];

export function hexToChannels(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function getPreset(id: string | null | undefined): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
}

/** CSS declarations for the default accent, injected server-side into :root. */
export function accentVarsCss(preset: AccentPreset): string {
  return SHADE_KEYS.map(
    (k) => `${VAR_NAMES[k]}: ${hexToChannels(preset.shades[k])};`,
  ).join(' ');
}

/** Apply an accent at runtime and remember it. */
export function applyAccent(id: string): void {
  if (typeof document === 'undefined') return;
  const preset = getPreset(id);
  const root = document.documentElement;
  SHADE_KEYS.forEach((k) => {
    root.style.setProperty(VAR_NAMES[k], hexToChannels(preset.shades[k]));
  });
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, id);
  } catch {}
}

export function getSavedAccentId(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_ACCENT_ID;
  return localStorage.getItem(ACCENT_STORAGE_KEY) || DEFAULT_ACCENT_ID;
}

/** Self-contained script string that applies the saved accent before paint. */
export function accentInitScript(): string {
  const map: Record<string, Record<string, string>> = {};
  for (const p of ACCENT_PRESETS) {
    map[p.id] = {};
    SHADE_KEYS.forEach((k) => {
      map[p.id][VAR_NAMES[k]] = hexToChannels(p.shades[k]);
    });
  }
  return `try{var a=localStorage.getItem('${ACCENT_STORAGE_KEY}');var m=${JSON.stringify(
    map,
  )};if(a&&m[a]){var s=m[a];for(var k in s){document.documentElement.style.setProperty(k,s[k]);}}}catch(e){}`;
}
