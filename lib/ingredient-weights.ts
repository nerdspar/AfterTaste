// How much an ingredient actually weighs.
//
// A cup is a volume, not a weight, so "1 cup" is ~120 g of flour, ~30 g of
// spinach and ~340 g of honey. Treating every cup as 240 g (water) is what
// made the estimator read 480 g for two cups of spinach. The same goes for
// countable things: "3 cloves garlic" is ~9 g, not 3 × some default.
//
// Numbers follow the usual reference weights (USDA / King Arthur). They are
// approximations by nature — an estimate is allowed to be roughly right, and
// being roughly right beats being confidently wrong.

export interface IngredientWeight {
  /** Grams in one cup of this ingredient. */
  perCup?: number;
  /** Grams in one of this ingredient, for things counted rather than measured. */
  perItem?: number;
}

// Ordered: the FIRST pattern that matches wins, so specific entries come
// before the generic ones they'd otherwise be swallowed by ("brown sugar"
// before "sugar", "almond flour" before "flour").
const TABLE: [RegExp, IngredientWeight][] = [
  // ---- fats and oils ----
  [/\bbutter\b/, { perCup: 227 }],
  [/\b(olive|vegetable|canola|coconut|sesame|avocado)?\s*oil\b/, { perCup: 216 }],
  [/\bshortening\b/, { perCup: 205 }],

  // ---- flours and dry baking ----
  [/\balmond flour|almond meal\b/, { perCup: 96 }],
  [/\bcoconut flour\b/, { perCup: 112 }],
  [/\bwhole wheat flour\b/, { perCup: 113 }],
  [/\bbread flour\b/, { perCup: 127 }],
  [/\bcake flour\b/, { perCup: 114 }],
  [/\bcornmeal|polenta\b/, { perCup: 122 }],
  [/\bcornstarch|corn ?starch\b/, { perCup: 128 }],
  [/\bflour\b/, { perCup: 120 }],
  [/\bcocoa\b/, { perCup: 85 }],
  [/\bbaking (powder|soda)\b/, { perCup: 220 }],
  [/\b(rolled|quick|old.fashioned)? ?oats\b/, { perCup: 90 }],
  [/\bbread ?crumbs\b/, { perCup: 108 }],
  [/\bpanko\b/, { perCup: 60 }],

  // ---- sugars and syrups ----
  [/\bbrown sugar\b/, { perCup: 213 }],
  [/\b(powdered|confectioners?|icing) sugar\b/, { perCup: 120 }],
  [/\bsugar\b/, { perCup: 200 }],
  [/\bhoney\b/, { perCup: 340 }],
  [/\b(maple )?syrup\b/, { perCup: 322 }],
  [/\bmolasses\b/, { perCup: 337 }],

  // ---- dairy ----
  [/\b(heavy |whipping |double )?cream\b/, { perCup: 238 }],
  [/\bhalf.and.half\b/, { perCup: 242 }],
  [/\bsour cream\b/, { perCup: 230 }],
  [/\b(greek )?yogurt\b/, { perCup: 245 }],
  [/\bcottage cheese\b/, { perCup: 226 }],
  [/\bricotta\b/, { perCup: 246 }],
  [/\b(parmesan|pecorino|romano)\b/, { perCup: 100 }],
  [/\b(shredded|grated|crumbled) .*cheese\b/, { perCup: 113 }],
  [/\bcheese\b/, { perCup: 113 }],
  [/\bmilk\b/, { perCup: 244 }],

  // ---- liquids ----
  [/\b(broth|stock|water|juice|wine|vinegar|beer)\b/, { perCup: 240 }],
  [/\b(soy sauce|tamari)\b/, { perCup: 255 }],
  [/\b(tomato )?(sauce|passata|puree|purée)\b/, { perCup: 245 }],
  [/\bketchup\b/, { perCup: 240 }],
  [/\bmayo(nnaise)?\b/, { perCup: 220 }],
  [/\bpeanut butter|nut butter|tahini\b/, { perCup: 258 }],

  // ---- grains, pasta, legumes ----
  [/\b(cooked )?rice\b/, { perCup: 185 }],
  [/\bquinoa\b/, { perCup: 170 }],
  [/\b(pasta|spaghetti|penne|macaroni|noodles)\b/, { perCup: 100 }],
  [/\b(lentils|chickpeas|garbanzo)\b/, { perCup: 164 }],
  [/\bbeans\b/, { perCup: 172 }],

  // ---- leafy greens and herbs: very light per cup ----
  [/\b(spinach|arugula|rocket|kale|chard|watercress)\b/, { perCup: 30, perItem: 30 }],
  [/\blettuce|salad greens|mixed greens\b/, { perCup: 36 }],
  [/\b(basil|parsley|cilantro|coriander|dill|mint|chives|herbs?)\b/, { perCup: 25 }],

  // ---- vegetables (chopped, per cup) + typical whole-item weights ----
  [/\bgarlic\b/, { perCup: 136, perItem: 3 }], // per clove
  [/\bshallot\b/, { perCup: 160, perItem: 40 }],
  [/\b(green onion|scallion|spring onion)\b/, { perCup: 100, perItem: 15 }],
  [/\bonion\b/, { perCup: 160, perItem: 150 }],
  [/\b(bell pepper|capsicum)\b/, { perCup: 149, perItem: 119 }],
  [/\b(jalape|serrano|chili|chilli|chile)\w*\b/, { perCup: 90, perItem: 14 }],
  [/\bmushrooms?\b/, { perCup: 70, perItem: 18 }],
  [/\bcarrots?\b/, { perCup: 128, perItem: 61 }],
  [/\bcelery\b/, { perCup: 101, perItem: 40 }],
  [/\b(cherry|grape) tomato\w*\b/, { perCup: 149, perItem: 17 }],
  [/\btomato\w*\b/, { perCup: 180, perItem: 123 }],
  [/\bpotato\w*\b/, { perCup: 150, perItem: 213 }],
  [/\bzucchini|courgette\b/, { perCup: 124, perItem: 196 }],
  [/\bcucumber\b/, { perCup: 133, perItem: 201 }],
  [/\beggplant|aubergine\b/, { perCup: 82, perItem: 458 }],
  [/\bbroccoli|cauliflower\b/, { perCup: 91, perItem: 500 }],
  [/\b(corn|peas)\b/, { perCup: 145, perItem: 90 }],
  [/\bcabbage\b/, { perCup: 89, perItem: 900 }],
  [/\bginger\b/, { perCup: 96, perItem: 30 }],
  [/\bavocado\b/, { perCup: 146, perItem: 150 }],

  // ---- fruit ----
  [/\blemon\b/, { perCup: 244, perItem: 84 }],
  [/\blime\b/, { perCup: 242, perItem: 67 }],
  [/\borange\b/, { perCup: 248, perItem: 131 }],
  [/\bbanana\b/, { perCup: 150, perItem: 118 }],
  [/\bapple\b/, { perCup: 125, perItem: 182 }],
  [/\bberries|strawberr|blueberr|raspberr\w*\b/, { perCup: 145 }],

  // ---- nuts, seeds, chocolate ----
  [/\balmonds?\b/, { perCup: 143 }],
  [/\bwalnuts?|pecans?\b/, { perCup: 117 }],
  [/\bchocolate chips?\b/, { perCup: 170 }],

  // ---- proteins (countable) ----
  [/\begg whites?\b/, { perItem: 33 }],
  [/\begg yolks?\b/, { perItem: 17 }],
  [/\beggs?\b/, { perItem: 50 }],
  [/\bchicken breasts?\b/, { perItem: 174 }],
  [/\bchicken thighs?\b/, { perItem: 82 }],
  [/\b(drumsticks?|chicken wings?)\b/, { perItem: 88 }],
  [/\bbacon\b/, { perItem: 28 }],
  [/\bsausages?\b/, { perItem: 75 }],

  // ---- small stuff that is counted ----
  [/\bbay (leaf|leaves)\b/, { perItem: 0.2 }],
  [/\btortillas?\b/, { perItem: 45 }],
  [/\bbread\b/, { perCup: 45, perItem: 28 }], // a slice
  [/\bsalt\b/, { perCup: 273 }],
];

/** Normalized for matching: lowercase, punctuation to spaces. */
function normalize(name: string): string {
  return ` ${name.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

/** Reference weights for an ingredient name, or an empty object if unknown. */
export function weightsFor(name: string): IngredientWeight {
  const n = normalize(name);
  for (const [pattern, weight] of TABLE) {
    if (pattern.test(n)) return weight;
  }
  return {};
}

// Lines that name an ingredient without committing to an amount. Counting
// these as a real quantity is how "salt, to taste" became 100 g of salt.
const NEGLIGIBLE =
  /\b(to taste|as needed|as desired|if desired|optional|for (serving|garnish|dusting|greasing|brushing|drizzling|frying|the pan)|plus more|for garnish|garnish)\b/i;

/** True when a line is a seasoning-to-taste or garnish rather than an amount. */
export function isNegligible(line: string): boolean {
  return NEGLIGIBLE.test(line);
}
