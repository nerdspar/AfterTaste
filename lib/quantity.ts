// Scaling ingredient quantities. A quantity is free text ("1 1/2 tbsp",
// "½ cup", "20g/ 1 1/2 tbsp"), so scaling means finding every amount inside
// the string, multiplying it, and writing it back in a form a cook can read.
//
// Amounts reach us in every shape the importers produce: unicode fractions
// (½, ⅜) from recipe sites and Crouton, ASCII fractions (1/2), mixed numbers
// with or without a space (1 1/2, 1½), and plain decimals.

/** Every vulgar fraction we might have to read, and what it's worth. */
const FRACTION_VALUES: Record<string, number> = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅐': 1 / 7,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
  '⅑': 1 / 9,
  '⅒': 1 / 10,
};

const GLYPHS = Object.keys(FRACTION_VALUES).join('');

// One pass over the string picks out amounts. Order matters: the longest
// shapes come first so "1 1/2" is read as one amount and not as "1" then
// "1/2". A "/" only counts as a fraction bar between digits, which keeps the
// separator in "20g/ 1 1/2 tbsp" from being eaten.
const AMOUNT_RE = new RegExp(
  [
    `\\d+\\s+\\d+/\\d+`, // mixed, ASCII:   "1 1/2"
    `\\d+\\s*[${GLYPHS}]`, // mixed, unicode: "1½", "1 ½"
    `\\d+/\\d+`, // fraction:       "1/2"
    `[${GLYPHS}]`, // lone glyph:     "½"
    `\\d+(?:\\.\\d+)?`, // plain number:   "2", "0.5"
  ].join('|'),
  'g',
);

const MIXED_GLYPH_RE = new RegExp(`^(\\d+)\\s*([${GLYPHS}])$`);

/** The value of one amount token, or null if it isn't a number after all. */
function parseAmount(token: string): number | null {
  const mixed = token.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const den = Number(mixed[3]);
    return den ? Number(mixed[1]) + Number(mixed[2]) / den : null;
  }

  const mixedGlyph = token.match(MIXED_GLYPH_RE);
  if (mixedGlyph) {
    return Number(mixedGlyph[1]) + FRACTION_VALUES[mixedGlyph[2]];
  }

  const fraction = token.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const den = Number(fraction[2]);
    return den ? Number(fraction[1]) / den : null;
  }

  if (token in FRACTION_VALUES) return FRACTION_VALUES[token];

  const n = Number(token);
  return Number.isFinite(n) ? n : null;
}

// Denominators a kitchen actually measures in, smallest first so the simplest
// form wins — 0.5 becomes ½ rather than 4/8.
const DENOMINATORS = [2, 3, 4, 6, 8];

const GLYPH_FOR: Record<string, string> = {
  '1/2': '½',
  '1/3': '⅓',
  '2/3': '⅔',
  '1/4': '¼',
  '3/4': '¾',
  '1/6': '⅙',
  '5/6': '⅚',
  '1/8': '⅛',
  '3/8': '⅜',
  '5/8': '⅝',
  '7/8': '⅞',
};

/**
 * A number as a cook would write it: a whole number where possible, otherwise
 * a vulgar fraction ("1½", "⅜"), falling back to a decimal for anything that
 * isn't near a kitchen fraction.
 */
export function formatAmount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';

  // Round first, so float drift — (1/3) * 3 — reads as 1 and not 0.99.
  const twoDp = Math.round(n * 100) / 100;
  if (Number.isInteger(twoDp)) return String(twoDp);

  const whole = Math.floor(n);
  const fraction = n - whole;
  for (const den of DENOMINATORS) {
    const num = Math.round(fraction * den);
    if (num <= 0 || num >= den) continue; // a whole number; handled above
    if (Math.abs(fraction - num / den) > 0.02) continue;
    const glyph = GLYPH_FOR[`${num}/${den}`];
    if (!glyph) continue;
    return whole > 0 ? `${whole}${glyph}` : glyph;
  }

  // Not close to anything a measuring spoon has — a decimal is more honest.
  return String(twoDp);
}

/**
 * Scale every amount in a quantity string. Text around the numbers (units,
 * notes, separators) is left exactly as it was, and a range like "1-2 tbsp"
 * scales at both ends because each number is scaled in place.
 */
export function scaleQuantity(quantity: string, multiplier: number): string {
  // At 1x, leave the text as written rather than reformatting what the recipe
  // author (or the importer) chose.
  if (multiplier === 1) return quantity;

  return quantity.replace(AMOUNT_RE, (token) => {
    const value = parseAmount(token);
    if (value === null) return token;
    return formatAmount(value * multiplier) || token;
  });
}
