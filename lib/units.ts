// Converting a recipe between imperial and metric.
//
// Scope is deliberately literal: volume becomes volume, weight becomes weight,
// and °F becomes °C. What it does NOT do is turn "1 cup flour" into "120 g" —
// that needs to know what the ingredient is and how densely it packs, and a
// wrong guess there is a ruined cake. lib/ingredient-weights has those
// densities if that is ever wanted, but it is a different feature and should
// not happen behind a switch labelled "Measurement units".
//
// Amounts are rounded the way a cook would say them: a cup is 236.59 ml, and
// every recipe in the world calls that 240.

import { formatAmount } from '@/lib/quantity';

export type UnitSystem = 'imperial' | 'metric';

// --- what we can recognise -------------------------------------------------

/** Imperial volume units, in millilitres. */
const IMPERIAL_VOLUME_ML: Record<string, number> = {
  cup: 236.588, cups: 236.588,
  tbsp: 14.787, tbsps: 14.787, tablespoon: 14.787, tablespoons: 14.787,
  tsp: 4.929, tsps: 4.929, teaspoon: 4.929, teaspoons: 4.929,
  'fl oz': 29.574, floz: 29.574,
  pint: 473.176, pints: 473.176,
  quart: 946.353, quarts: 946.353,
  gallon: 3785.41, gallons: 3785.41,
};

/** Imperial mass units, in grams. */
const IMPERIAL_MASS_G: Record<string, number> = {
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
};

/** Metric volume units, in millilitres. */
const METRIC_VOLUME_ML: Record<string, number> = {
  ml: 1, milliliter: 1, milliliters: 1, millilitre: 1, millilitres: 1,
  cl: 10, dl: 100,
  l: 1000, liter: 1000, liters: 1000, litre: 1000, litres: 1000,
};

/** Metric mass units, in grams. */
const METRIC_MASS_G: Record<string, number> = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
};

// Longest first, so "fl oz" is matched before "oz" and "tablespoons" before
// "tablespoon". Without that, "1 fl oz" converts as an ounce of weight.
const ALL_UNITS = [
  ...Object.keys(IMPERIAL_VOLUME_ML),
  ...Object.keys(IMPERIAL_MASS_G),
  ...Object.keys(METRIC_VOLUME_ML),
  ...Object.keys(METRIC_MASS_G),
].sort((a, b) => b.length - a.length);

const UNIT_ALTERNATION = ALL_UNITS.map((u) => u.replace(/ /g, '\\s*')).join('|');

// A number (decimal, fraction, mixed, or unicode fraction) followed by a unit.
const MEASUREMENT_RE = new RegExp(
  String.raw`(\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?(?:\s+\d+\/\d+)?|\d+\/\d+|[½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])\s*(${UNIT_ALTERNATION})\b\.?`,
  'gi',
);

const FRACTION_VALUES: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6,
};

function parseNumber(raw: string): number | null {
  const s = raw.trim();
  if (FRACTION_VALUES[s] !== undefined) return FRACTION_VALUES[s];
  // A range converts at its midpoint would be wrong — take the low end and
  // let the caller's own range text carry the rest.
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// --- how the result reads --------------------------------------------------

/** Metric volume, rounded to something a jug actually shows. */
function formatMl(ml: number): string {
  if (ml >= 1000) {
    const l = ml / 1000;
    return `${Number(l.toFixed(l >= 10 ? 1 : 2))} L`;
  }
  if (ml >= 100) return `${Math.round(ml / 10) * 10} ml`;
  if (ml >= 20) return `${Math.round(ml / 5) * 5} ml`;
  return `${Math.round(ml)} ml`;
}

/** Metric mass, rounded the way scales are read. */
function formatG(g: number): string {
  if (g >= 1000) {
    const kg = g / 1000;
    return `${Number(kg.toFixed(kg >= 10 ? 1 : 2))} kg`;
  }
  if (g >= 100) return `${Math.round(g / 10) * 10} g`;
  if (g >= 20) return `${Math.round(g / 5) * 5} g`;
  return `${Math.round(g)} g`;
}

// Going the other way lands between the marks: 240 ml is 1.014 cups, and
// "1.01 cup" is not a thing anyone has ever measured. Imperial cooking is
// fractional, so snap to the nearest fraction the measuring set actually has —
// eighths for cups, quarters for spoons and weights.
function snapTo(value: number, denominator: number): number {
  return Math.round(value * denominator) / denominator;
}

/** Imperial volume, in the largest unit that doesn't read as a tiny fraction. */
function formatImperialVolume(ml: number): string {
  if (ml >= IMPERIAL_VOLUME_ML.cup * 0.9) {
    const cups = snapTo(ml / IMPERIAL_VOLUME_ML.cup, 8);
    return `${formatAmount(cups)} cup${cups === 1 ? '' : 's'}`;
  }
  if (ml >= IMPERIAL_VOLUME_ML.tbsp * 0.9) {
    return `${formatAmount(snapTo(ml / IMPERIAL_VOLUME_ML.tbsp, 4))} tbsp`;
  }
  return `${formatAmount(snapTo(ml / IMPERIAL_VOLUME_ML.tsp, 4))} tsp`;
}

function formatImperialMass(g: number): string {
  if (g >= IMPERIAL_MASS_G.lb * 0.9) {
    return `${formatAmount(snapTo(g / IMPERIAL_MASS_G.lb, 4))} lb`;
  }
  return `${formatAmount(snapTo(g / IMPERIAL_MASS_G.oz, 4))} oz`;
}

// --- the conversion itself -------------------------------------------------

/**
 * Convert every measurement in a quantity string to the given system. Text
 * around the numbers is left as written, and anything we don't recognise —
 * "3 cloves", "1 pinch", "to taste" — passes through untouched, because a unit
 * we can't convert is not a unit we should be rewriting.
 */
export function convertQuantity(quantity: string, to: UnitSystem): string {
  if (!quantity) return quantity;

  return quantity.replace(MEASUREMENT_RE, (whole, rawNum: string, rawUnit: string) => {
    const n = parseNumber(rawNum);
    if (n === null) return whole;
    const unit = rawUnit.toLowerCase().replace(/\s+/g, ' ').trim();
    // "fl oz" may arrive as "floz" or "fl  oz".
    const key = unit.replace(/^fl\s*oz$/, 'fl oz');

    if (to === 'metric') {
      if (IMPERIAL_VOLUME_ML[key]) return formatMl(n * IMPERIAL_VOLUME_ML[key]);
      if (IMPERIAL_MASS_G[key]) return formatG(n * IMPERIAL_MASS_G[key]);
      return whole; // already metric, or not ours
    }
    if (METRIC_VOLUME_ML[key]) return formatImperialVolume(n * METRIC_VOLUME_ML[key]);
    if (METRIC_MASS_G[key]) return formatImperialMass(n * METRIC_MASS_G[key]);
    return whole;
  });
}

// Oven temperatures, which is where getting this wrong actually ruins dinner.
// Only explicit F/C is touched — a bare "350°" is ambiguous and left alone.
const TEMP_RE = /(-?\d+(?:\.\d+)?)\s*(?:°\s*|\s+degrees?\s+)?(?:°)?\s*\b([FC])\b/g;

/** Round to the nearest 5 — no oven dial is more precise than that. */
const roundOven = (t: number) => Math.round(t / 5) * 5;

/**
 * Convert oven temperatures inside free text (instruction steps).
 * Kept separate from quantities because it runs over sentences, not amounts.
 */
export function convertTemperatures(text: string, to: UnitSystem): string {
  if (!text) return text;
  return text.replace(TEMP_RE, (whole, rawNum: string, scale: string) => {
    const n = Number(rawNum);
    if (!Number.isFinite(n)) return whole;
    const isF = scale.toUpperCase() === 'F';
    if (to === 'metric') {
      if (!isF) return whole;
      return `${roundOven(((n - 32) * 5) / 9)}°C`;
    }
    if (isF) return whole;
    return `${roundOven((n * 9) / 5 + 32)}°F`;
  });
}

/** Both conversions, for text that may contain either. */
export function convertText(text: string, to: UnitSystem): string {
  return convertTemperatures(convertQuantity(text, to), to);
}
