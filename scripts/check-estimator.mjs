#!/usr/bin/env node
// Regression check for the two halves of the nutrition estimator: how much an
// ingredient line weighs, and which food record it matches.
//
// scoreMatch() is the part of the estimator most likely to be retuned, and the
// failure mode is silent: a plausible-looking number built on the wrong record.
// So each case below pins a real query against the real candidate list the food
// APIs returned for it, and asserts which record must win.
//
// The candidate sets are captured, not fetched, so this runs offline and gives
// the same answer every time -- which is the point. Verifying against the live
// APIs is a separate, slower exercise.
//
// Usage: node scripts/check-estimator.mjs
// Exits non-zero on the first regression, and prints the ranking that produced it.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, renameSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

// lib/ is server-only TypeScript using "@/" path aliases, and the repo has no
// test runner, so compile the two modules we need and rewrite the aliases.
function buildScoreMatch() {
  const out = mkdtempSync(join(tmpdir(), 'aftertaste-match-'));
  try {
    execFileSync('npx', [
      'tsc', 'lib/food-db.ts', 'lib/nutrition-estimate.ts', 'lib/ingredient-weights.ts',
      'lib/nutrition-lines.ts',
      '--outDir', out, '--module', 'esnext', '--target', 'es2022',
      '--moduleResolution', 'bundler', '--skipLibCheck',
    ], { cwd: repo, stdio: 'pipe' });
  } catch {
    // tsc reports the unresolved "@/" aliases and still emits; a genuinely
    // broken build surfaces below as a failed import.
  }
  for (const f of readdirSync(out)) {
    if (f.endsWith('.js')) renameSync(join(out, f), join(out, f.replace(/\.js$/, '.mjs')));
  }
  const entry = join(out, 'nutrition-estimate.mjs');
  writeFileSync(entry, readFileSync(entry, 'utf8')
    .replace("'@/lib/food-db'", "'./food-db.mjs'")
    .replace("'@/lib/ingredient-weights'", "'./ingredient-weights.mjs'")
    .replaceAll("'@/lib/nutrition-lines'", "'./nutrition-lines.mjs'"));
  return { entry, cleanup: () => rmSync(out, { recursive: true, force: true }) };
}


// Line sizing. These matter because they fail quietly: a line we cannot size
// drops out of the total, and one sized against the wrong unit is never
// flagged. The package-size cases are ordinary American recipe formatting.
const SIZING = [
  { line: ['1 (15 oz) can', 'black beans, drained and rinsed'], grams: 425.3,
    why: 'the bracket is the package size; parsed in place it hid the unit and the line went unmatched' },
  { line: ['1 (14.5 oz) can', 'diced tomatoes'], grams: 411.1,
    why: 'without it this silently became one 123 g tomato' },
  { line: ['2 (15 oz) cans', 'chickpeas'], grams: 850.5, why: 'count x package size' },
  { line: ['1 (8 oz) package', 'cream cheese'], grams: 226.8, why: 'stated size beats the 250 g default' },
  { line: ['1 (14 fl oz) can', 'coconut milk'], grams: 427.0, why: 'fluid ounces go through the ingredient density' },
  { line: ['1 can', 'black beans'], grams: 400, why: 'a can with no stated size falls back to the container' },
  { line: ['1 lb', 'carrots (about 2 cups chopped)'], grams: 453.6,
    why: 'an explicit mass still wins over a descriptive bracket' },
  { line: ['2 cups', 'flour (sifted)'], grams: 240, why: 'a non-numeric bracket is not a size' },
  { line: ['3', 'cloves garlic'], grams: 9, why: 'a clove is a piece of the ingredient, not a package' },
  { line: ['2 cups', 'fresh spinach'], grams: 60, why: 'a cup of spinach is 30 g, not 240' },
  { line: ['1 cup', 'honey'], grams: 340, why: 'and a cup of honey is 340' },
  { line: ['2', 'onions'], grams: 300, why: 'plural names must still find a weight' },
  { line: ['', 'salt, to taste'], grams: 0, why: 'named but never measured' },
];

const CASES = [
  {
    query: "onion",
    expect: /^Onions, Raw$/,
    why: "the branded bagel is a perfect name match and a 7x calorie error",
    candidates: [
      { name: "Onions, Raw", kcal: 40, sodium: 4 },
      { name: "Denny'S, Onion Rings", kcal: 385, sodium: 780 },
      { name: "Onions, Dehydrated Flakes", kcal: 349, sodium: 21 },
      { name: "Onions, Red, Raw", kcal: 44, sodium: 1 },
      { name: "Onions, Sweet, Raw", kcal: 32, sodium: 8 },
      { name: "Onions, Welsh, Raw", kcal: 34, sodium: 17 },
    ],
  },
  {
    query: "garlic",
    expect: /^Garlic, Raw$/,
    why: "not garlic powder or garlic bread",
    candidates: [
      { name: "Garlic, Raw", kcal: 143, sodium: null },
      { name: "Garlic Bread, Frozen", kcal: 350, sodium: 544 },
      { name: "Spices, Garlic Powder", kcal: 331, sodium: 60 },
      { name: "Pizza Hut, Breadstick, Parmesan Garlic", kcal: 343, sodium: 539 },
      { name: "Fast Foods, Breadstick, Soft, Prepared With Garlic And Parmesan Cheese", kcal: 343, sodium: 539 },
      { name: "Hormel Always Tender, Pork Loin Filets, Lemon Garlic-Flavored", kcal: 118, sodium: 590 },
    ],
  },
  {
    query: "black pepper",
    expect: /^Spices, Pepper, Black$/,
    why: "query coverage must outrank the raw bonus, or a raw banana pepper wins",
    candidates: [
      { name: "Spices, Pepper, Black", kcal: 251, sodium: 20 },
      { name: "Pepper, Banana, Raw", kcal: 27, sodium: 13 },
      { name: "Peppers, Ancho, Dried", kcal: 281, sodium: 43 },
      { name: "Peppers, Hungarian, Raw", kcal: 29, sodium: 1 },
      { name: "Peppers, Jalapeno, Raw", kcal: 29, sodium: 3 },
      { name: "Peppers, Pasilla, Dried", kcal: 345, sodium: 89 },
    ],
  },
  {
    query: "chicken breast",
    expect: /Raw$/,
    why: "not the oven-roasted deli roll at 883 mg sodium/100 g",
    candidates: [
      { name: "Chicken Breast Tenders, Breaded, Uncooked", kcal: 263, sodium: 536 },
      { name: "Chicken Breast, Roll, Oven-Roasted", kcal: 134, sodium: 883 },
      { name: "Chicken, Breast, Boneless, Skinless, Raw", kcal: 106, sodium: 66 },
      { name: "Chicken, Breast, Meat And Skin, Raw", kcal: 127, sodium: 48 },
      { name: "Chicken Breast Tenders, Breaded, Cooked, Microwaved", kcal: 252, sodium: 446 },
      { name: "Oscar Mayer, Chicken Breast (Honey Glazed)", kcal: 109, sodium: 1440 },
      { name: "Chicken Breast, Deli, Rotisserie Seasoned, Sliced, Prepackaged", kcal: 98, sodium: 1030 },
      { name: "Chicken Breast, Fat-Free, Mesquite Flavor, Sliced", kcal: 80, sodium: 1040 },
    ],
  },
  {
    query: "butter",
    expect: /^Butter, Salted$/,
    why: "not clarified ghee at 900 kcal/100 g",
    candidates: [
      { name: "Butter, Clarified Butter (Ghee)", kcal: 900, sodium: 0 },
      { name: "Butter, Salted", kcal: 717, sodium: 643 },
      { name: "Croissants, Butter", kcal: 406, sodium: 384 },
      { name: "Almond Butter, Creamy", kcal: 645, sodium: 1 },
      { name: "Butter Oil, Anhydrous", kcal: 876, sodium: 2 },
      { name: "Butter, Whipped, With Salt", kcal: 731, sodium: 583 },
      { name: "Butter, Without Salt", kcal: 717, sodium: 11 },
    ],
  },
  {
    query: "spinach",
    expect: /^Spinach, Raw$/,
    why: "the generic must beat the branded bag",
    candidates: [
      { name: "Spinach Souffle", kcal: 172, sodium: 566 },
      { name: "Spinach, Baby", kcal: 27, sodium: 111 },
      { name: "Spinach, Mature", kcal: 28, sodium: 107 },
      { name: "Spinach, Raw", kcal: 23, sodium: 79 },
      { name: "Malabar Spinach, Cooked", kcal: 23, sodium: 55 },
      { name: "Spaghetti, Spinach, Cooked", kcal: 130, sodium: 14 },
      { name: "Spaghetti, Spinach, Dry", kcal: 372, sodium: 36 },
    ],
  },
  {
    query: "spaghetti",
    expect: /Dry$/,
    why: "not spaghetti squash, and not cooked pasta at a third the density",
    candidates: [
      { name: "Denny'S, Spaghetti And Meatballs", kcal: 170, sodium: 351 },
      { name: "Spaghetti, Spinach, Cooked", kcal: 130, sodium: 14 },
      { name: "Spaghetti, Spinach, Dry", kcal: 372, sodium: 36 },
      { name: "Squash, Winter, Spaghetti, Raw", kcal: 31, sodium: 17 },
      { name: "Olive Garden, Spaghetti With Meat Sauce", kcal: 121, sodium: 209 },
      { name: "Olive Garden, Spaghetti With Pomodoro Sauce", kcal: 102, sodium: 183 },
      { name: "Restaurant, Family Style, Spaghetti And Meatballs", kcal: 170, sodium: 351 },
    ],
  },
  {
    query: "parmesan cheese",
    expect: /^Cheese, Parmesan, Grated$/,
    why: "USDA inverts names, so a prefix match favours the fat-free topping",
    candidates: [
      { name: "Cheese, Parmesan, Grated", kcal: 420, sodium: 1800 },
      { name: "Cheese, Parmesan, Hard", kcal: 392, sodium: 1180 },
      { name: "Cheese, Parmesan, Shredded", kcal: 415, sodium: 1700 },
      { name: "Cheese, Parmesan, Grated, Refrigerated", kcal: 403, sodium: 1050 },
      { name: "Cheese, Parmesan, Low Sodium", kcal: 451, sodium: 63 },
      { name: "Parmesan Cheese Topping, Fat Free", kcal: 370, sodium: 1150 },
      { name: "Cheese, Parmesan, Dry Grated, Reduced Fat", kcal: 265, sodium: 1530 },
    ],
  },
  {
    query: "eggs",
    expect: /Egg Whole$/,
    why: "not the white at 55 kcal or the yolk at 334",
    candidates: [
      { name: "Eggs, Grade A, Large, Egg White", kcal: 55, sodium: null },
      { name: "Eggs, Grade A, Large, Egg Whole", kcal: 148, sodium: 129 },
      { name: "Eggs, Grade A, Large, Egg Yolk", kcal: 334, sodium: null },
      { name: "Bagels, Egg", kcal: 278, sodium: 505 },
      { name: "Bread, Egg", kcal: 287, sodium: 380 },
    ],
  },
  {
    query: "chicken broth",
    expect: /Ready-To-Serve$/,
    why: "not bouillon cubes at 24,000 mg sodium/100 g",
    candidates: [
      { name: "Chicken, Canned, No Broth", kcal: 185, sodium: 482 },
      { name: "Chicken, Canned, Meat Only, With Broth", kcal: 165, sodium: 503 },
      { name: "Soup, Chicken Broth Cubes, Dry", kcal: 198, sodium: 24000 },
      { name: "Soup, Chicken Broth Or Bouillon, Dry", kcal: 267, sodium: 23900 },
      { name: "Soup, Chicken Broth, Canned, Condensed", kcal: 31, sodium: 621 },
      { name: "Soup, Chicken Broth, Ready-To-Serve", kcal: 6, sodium: 371 },
      { name: "Soup, Chicken Broth, Low Sodium, Canned", kcal: 16, sodium: 30 },
    ],
  },
  {
    query: "avocado",
    expect: /^Avocados, Raw/,
    why: "not avocado oil at 884 kcal/100 g",
    candidates: [
      { name: "Oil, Avocado", kcal: 884, sodium: 0 },
      { name: "Avocados, Raw, California", kcal: 167, sodium: 8 },
      { name: "Avocados, Raw, Florida", kcal: 120, sodium: 2 },
      { name: "Avocado, Hass, Peeled, Raw", kcal: 223, sodium: 0 },
      { name: "Avocados, Raw, All Commercial Varieties", kcal: 160, sodium: 7 },
      { name: "Avocado Chunks, Avocado", brand: "Whole Foods Market, Inc.", kcal: 167, sodium: 0 },
    ],
  },
  {
    query: "sour cream",
    expect: /^Cream, Sour/,
    why: "not the light tub, which understates fat by a third",
    candidates: [
      { name: "Cream, Sour, Cultured", kcal: 198, sodium: 31 },
      { name: "Sour Cream, Light", kcal: 136, sodium: 83 },
      { name: "Cream, Sour, Full Fat", kcal: 196, sodium: 50 },
      { name: "Sour Cream, Fat Free", kcal: 74, sodium: 141 },
      { name: "Sour Cream, Imitation, Cultured", kcal: 208, sodium: 102 },
      { name: "Sour Cream, Reduced Fat", kcal: 181, sodium: 70 },
    ],
  },
  {
    query: "chocolate chips",
    expect: /^Chocolate Chips$/,
    why: "not a marshmallow cookie that merely contains them",
    candidates: [
      { name: "Cookies, Chocolate Chip, Dry Mix", kcal: 497, sodium: 290 },
      { name: "Cookies, Chocolate Chip, Refrigerated Dough", kcal: 451, sodium: 321 },
      { name: "Cookies, Chocolate Chip Sandwich, With Creme Filling", kcal: 425, sodium: 279 },
      { name: "Cookies, Chocolate Chip, Refrigerated Dough, Baked", kcal: 492, sodium: 232 },
      { name: "Cookies, Marshmallow, With Rice Cereal And Chocolate Chips", kcal: 435, sodium: 341 },
      { name: "Pillsbury, Chocolate Chip Cookies, Refrigerated Dough", kcal: 450, sodium: 326 },
      { name: "Chocolate Chips", brand: "Raley'S", kcal: 467, sodium: 0 },
    ],
  },
  {
    query: "black beans",
    expect: /^Beans, Black, Mature Seeds, Raw$/,
    why: "a bare mention means dry beans, not the tin",
    candidates: [
      { name: "Beans, Black, Mature Seeds, Raw", kcal: 341, sodium: 5 },
      { name: "Restaurant, Latino, Black Bean Soup", kcal: 103, sodium: 311 },
      { name: "Soup, Black Bean, Canned, Condensed", kcal: 91, sodium: 970 },
      { name: "Beans, Black Turtle, Mature Seeds, Canned", kcal: 91, sodium: 384 },
      { name: "Beans, Black Turtle, Mature Seeds, Raw", kcal: 339, sodium: 9 },
      { name: "Beans, Black, Canned, Sodium Added, Drained And Rinsed", kcal: 118, sodium: 218 },
    ],
  },
  {
    query: "quinoa",
    expect: /^Quinoa, Uncooked$/,
    why: "recipes measure grains dry, not cooked",
    candidates: [
      { name: "Quinoa, Cooked", kcal: 120, sodium: 7 },
      { name: "Quinoa, Uncooked", kcal: 368, sodium: 5 },
      { name: "Flour, Quinoa", kcal: 385, sodium: 6 },
      { name: "Pasta, Gluten-Free, Corn Flour And Quinoa Flour, Cooked, Ancient Harvest", kcal: 152, sodium: 4 },
      { name: "Quinoa", brand: "Sunrise Natural Foods", kcal: 375, sodium: 21 },
    ],
  },
  {
    query: "sweet potato",
    expect: /^Sweet Potato, Cooked, Boiled, Without Skin$/,
    why: "not the leaves, and not the canned tin",
    candidates: [
      { name: "Sweet Potato Leaves, Raw", kcal: 42, sodium: 6 },
      { name: "Sweet Potato, Canned, Mashed", kcal: 101, sodium: 75 },
      { name: "Babyfood, Corn And Sweet Potatoes, Strained", kcal: 68, sodium: 14 },
      { name: "Babyfood, Juice, Apple-Sweet Potato", kcal: 47, sodium: 5 },
      { name: "Babyfood, Vegetables, Sweet Potatoes Strained", kcal: 57, sodium: 22 },
      { name: "Babyfood, Vegetables, Sweet Potatoes, Junior", kcal: 60, sodium: 18 },
      { name: "Snacks, Sweet Potato Chips, Unsalted", kcal: 532, sodium: 35 },
      { name: "Sweet Potato Puffs, Frozen, Unprepared", kcal: 161, sodium: 250 },
      { name: "Sweet Potato, Cooked, Boiled, Without Skin", kcal: 76, sodium: 27 },
    ],
  },
  {
    query: "milk",
    expect: /^Milk, Sheep, Fluid$/,
    why: "a weak spot worth pinning: USDA returns no plain cow's milk for this query, so the bar is simply that a liquid milk beats dried buttermilk powder at 387 kcal/100 g",
    candidates: [
      { name: "Crackers, Milk", kcal: 446, sodium: 687 },
      { name: "Milk Dessert, Frozen, Milk-Fat Free, Chocolate", kcal: 167, sodium: 97 },
      { name: "Protein Supplement, Milk Based, Muscle Milk, Powder", kcal: 411, sodium: 329 },
      { name: "Beverages, Rice Milk, Unsweetened", kcal: 47, sodium: 39 },
      { name: "Candies, Milk Chocolate", kcal: 535, sodium: 79 },
      { name: "Milk And Cereal Bar", kcal: 413, sodium: 319 },
      { name: "Milk, Buttermilk, Dried", kcal: 387, sodium: 517 },
      { name: "Milk, Sheep, Fluid", kcal: 108, sodium: 44 },
      { name: "Milk", brand: "Elmhurst Milk & Cream Co.Inc.", kcal: 55, sodium: 55 },
    ],
  },
  {
    query: "mozzarella cheese",
    expect: /^Cheese, Mozzarella/,
    why: "not the cheese substitute",
    candidates: [
      { name: "Cheese Substitute, Mozzarella", kcal: 248, sodium: 685 },
      { name: "Cheese, Mozzarella, Nonfat", kcal: 141, sodium: 743 },
      { name: "Cheese, Mozzarella, Low Sodium", kcal: 280, sodium: 16 },
      { name: "Cheese, Mozzarella, Whole Milk", kcal: 299, sodium: 486 },
      { name: "Denny'S, Mozzarella Cheese Sticks", kcal: 324, sodium: 1010 },
      { name: "Cheese, Mozzarella, Part Skim Milk", kcal: 254, sodium: 619 },
    ],
  },
  {
    query: "olive oil",
    expect: /^Oil, Olive/,
    why: "not a corn/peanut/olive blend",
    candidates: [
      { name: "Oil, Corn, Peanut, And Olive", kcal: 884, sodium: 0 },
      { name: "Oil, Olive, Salad Or Cooking", kcal: 884, sodium: 2 },
      { name: "Mayonnaise, Reduced Fat, With Olive Oil", kcal: 361, sodium: 800 },
      { name: "Anchovies, Canned In Olive Oil, With Salt, Drained", kcal: 206, sodium: 5400 },
      { name: "Oil, Canola", kcal: 884, sodium: 0 },
      { name: "Oil, Almond", kcal: 884, sodium: 0 },
    ],
  },
  {
    query: "ground beef",
    expect: /^Beef, (Grass-Fed, )?Ground/,
    why: "cleanFoodName must keep 'ground', or this becomes cured dried beef",
    candidates: [
      { name: "Beef, Grass-Fed, Ground, Raw", kcal: 198, sodium: 68 },
      { name: "Beef, Ground, Patties, Frozen, Cooked, Broiled", kcal: 295, sodium: 77 },
      { name: "Beef, Ground, Unspecified Fat Content, Cooked", kcal: 240, sodium: 85 },
      { name: "On The Border, Soft Taco With Ground Beef, Cheese And Lettuce", kcal: 229, sodium: 646 },
      { name: "Beef, Ground, 70% Lean Meat / 30% Fat, Raw", kcal: 332, sodium: 66 },
    ],
  },
];

const { entry, cleanup } = buildScoreMatch();
let scoreMatch, gramsForLine;
try {
  ({ scoreMatch, gramsForLine } = await import(pathToFileURL(entry).href));
} finally {
  cleanup();
}

let failed = 0;

console.log('Line sizing');
for (const { line: [quantity, name], grams, why } of SIZING) {
  const got = gramsForLine(quantity, name, null);
  if (got != null && Math.abs(got - grams) < 1.5) {
    console.log(`  ok  ${`${quantity} ${name}`.trim().padEnd(46)} ${got.toFixed(1).padStart(7)} g`);
    continue;
  }
  failed++;
  console.log(`\nFAIL  ${`${quantity} ${name}`.trim()}`);
  console.log(`      expected ~${grams} g, got ${got == null ? 'null (line could not be sized)' : `${got.toFixed(1)} g`}`);
  console.log(`      ${why}\n`);
}

console.log('\nFood matching');
for (const { query, expect, why, candidates } of CASES) {
  const ranked = candidates
    .map((c) => ({ c, score: scoreMatch(query, { name: c.name, brand: c.brand, per100: {} }) }))
    .sort((a, b) => b.score - a.score);
  const winner = ranked[0].c;
  if (expect.test(winner.name)) {
    console.log(`  ok  ${query.padEnd(18)} -> ${winner.name}`);
    continue;
  }
  failed++;
  console.log(`\nFAIL  ${query}`);
  console.log(`      expected ${expect} -- ${why}`);
  console.log(`      got "${winner.name}" (${winner.kcal} kcal, ${winner.sodium ?? '?'} mg sodium per 100 g)`);
  for (const { c, score } of ranked) {
    console.log(`        ${score.toFixed(1).padStart(7)}  ${c.name}${c.brand ? ` [${c.brand}]` : ''}`);
  }
}

const total = CASES.length + SIZING.length;
console.log(`\n${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
