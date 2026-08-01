export interface Recipe {
  id: string;
  title: string;
  category: string;
  image: string;
  rating: number;
  ratingCount: number;
  cookTime: string;
  cookTimeMinutes: number;
  prepTimeMinutes: number;
  totalTimeMinutes: number;
  servings: number;
  calories: number;
  difficulty: string;
  cost: number; // 1=$, 2=$$, 3=$$$
  isFavorite: boolean;
  description: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  chef: Chef;
  source: string;
  cuisine: string;
  cookingClassType: string;
  ease: number; // 1-5
  taste: number; // 1-5
  cleanup: number; // 1-5
  makeAgain: boolean | null; // null = not set
  remade: number; // 0-10+
  tags?: string[]; // free-form keywords for search/filter
  createdAt?: number; // epoch ms when the recipe was added
  sourceUrl?: string; // original web link (e.g. from an imported recipe)
}

export interface Ingredient {
  name: string;
  quantity: string;
  image: string;
}

export interface Instruction {
  step: string;
  title: string;
  body: string;
  videoThumb: string;
  /**
   * When defined, this item is a SECTION HEADER (its value is the section
   * title, e.g. "Dough"), not a step — step numbering restarts after it.
   * Steps leave this undefined.
   */
  section?: string;
}

export interface Chef {
  name: string;
  avatar: string;
  recipeCount: number;
  rating: number;
}

export interface Category {
  label: string;
  icon: string;
  slug: string;
}

export const categories: Category[] = [
  { label: 'Breakfast', icon: '🥞', slug: 'breakfast' },
  { label: 'Lunch', icon: '🥗', slug: 'lunch' },
  { label: 'Dinner', icon: '🍝', slug: 'dinner' },
  { label: 'Snack', icon: '🍿', slug: 'snack' },
  { label: 'Dessert', icon: '🍰', slug: 'dessert' },
  { label: 'Favorites', icon: '❤️', slug: 'favorites' },
];

export const recommendedRecipes: Recipe[] = [
  {
    id: 'fluffy-banana-pancakes',
    title: 'Fluffy Banana Oat Pancakes with Cinnamon & Fresh Berries',
    category: 'Breakfast',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=400&fit=crop',
    rating: 4.8,
    ratingCount: 234,
    cookTime: '30 mins',
    cookTimeMinutes: 30,
    prepTimeMinutes: 15,
    totalTimeMinutes: 45,
    servings: 4,
    calories: 1253,
    difficulty: 'Medium',
    cost: 1,
    isFavorite: true,
    description:
      'Start your morning with these light, fluffy banana oat pancakes topped with warm cinnamon and a burst of fresh berries. Perfect for a cozy weekend breakfast that the whole family will love.',
    ingredients: [
      { name: 'Bananas', quantity: '2 ripe', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=60&h=60&fit=crop' },
      { name: 'Rolled oats', quantity: '1 cup', image: 'https://images.unsplash.com/photo-1614961233913-a5113b4a4983?w=60&h=60&fit=crop' },
      { name: 'Baking powder', quantity: '1 tsp', image: 'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=60&h=60&fit=crop' },
      { name: 'Cinnamon', quantity: '1/2 tsp', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=60&h=60&fit=crop' },
      { name: 'Eggs', quantity: '2 large', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=60&h=60&fit=crop' },
      { name: 'Milk', quantity: '1/2 cup', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=60&h=60&fit=crop' },
      { name: 'Fresh berries', quantity: '1 cup', image: 'https://images.unsplash.com/photo-1563746098251-d35aef196e83?w=60&h=60&fit=crop' },
      { name: 'Maple syrup', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1589820296156-2454bb8a6ad1?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Blend the Batter',
        body: 'Combine bananas, oats, eggs, milk, baking powder, and cinnamon in a blender. Blend until smooth and let the batter rest for 5 minutes.',
        videoThumb: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Heat the Pan',
        body: 'Heat a non-stick pan over medium heat. Lightly grease with butter or coconut oil. The pan is ready when a drop of water sizzles.',
        videoThumb: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Cook the Pancakes',
        body: 'Pour 1/4 cup of batter for each pancake. Cook until bubbles form on the surface (about 2-3 minutes), then flip and cook for another 1-2 minutes until golden.',
        videoThumb: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Maria Santos',
      avatar: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80&h=80&fit=crop&crop=face',
      recipeCount: 142,
      rating: 4.9,
    },
    source: 'Internet',
    cuisine: 'American',
    cookingClassType: 'Cozy Comfort Food',
    ease: 4,
    taste: 5,
    cleanup: 3,
    makeAgain: true,
    remade: 4,
  },
  {
    id: 'mediterranean-bowl',
    title: 'Mediterranean Quinoa Bowl with Lemon Tahini Dressing',
    category: 'Lunch',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
    rating: 4.6,
    ratingCount: 189,
    cookTime: '25 mins',
    cookTimeMinutes: 25,
    prepTimeMinutes: 10,
    totalTimeMinutes: 35,
    servings: 2,
    calories: 520,
    difficulty: 'Easy',
    cost: 2,
    isFavorite: false,
    description:
      'A vibrant, nutrient-packed bowl featuring fluffy quinoa, roasted vegetables, and a creamy lemon tahini dressing.',
    ingredients: [
      { name: 'Quinoa', quantity: '1 cup', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=60&h=60&fit=crop' },
      { name: 'Cherry tomatoes', quantity: '1 cup halved', image: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=60&h=60&fit=crop' },
      { name: 'Cucumber', quantity: '1 medium diced', image: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=60&h=60&fit=crop' },
      { name: 'Kalamata olives', quantity: '1/3 cup', image: 'https://images.unsplash.com/photo-1593030103066-0093718e7177?w=60&h=60&fit=crop' },
      { name: 'Feta cheese', quantity: '1/2 cup crumbled', image: 'https://images.unsplash.com/photo-1626957341926-98752fc2ba90?w=60&h=60&fit=crop' },
      { name: 'Red onion', quantity: '1/4 diced', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=60&h=60&fit=crop' },
      { name: 'Chickpeas', quantity: '1 can drained', image: 'https://images.unsplash.com/photo-1515543904413-63117c31f191?w=60&h=60&fit=crop' },
      { name: 'Tahini', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=60&h=60&fit=crop' },
      { name: 'Lemon', quantity: '1 juiced', image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Cook the Quinoa',
        body: 'Rinse quinoa under cold water, then combine with 2 cups of water in a saucepan. Bring to a boil, reduce heat, cover, and simmer for 15 minutes until fluffy.',
        videoThumb: '',
      },
      {
        step: '02',
        title: 'Prepare the Vegetables',
        body: 'While quinoa cooks, dice the cucumber, halve the cherry tomatoes, slice the red onion, and drain and rinse the chickpeas.',
        videoThumb: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Make the Lemon Tahini Dressing',
        body: 'Whisk together tahini, lemon juice, a splash of water, salt, and pepper until smooth and pourable. Adjust consistency with more water if needed.',
        videoThumb: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=130&fit=crop',
      },
      {
        step: '04',
        title: 'Assemble the Bowl',
        body: 'Divide quinoa among bowls and arrange tomatoes, cucumber, olives, chickpeas, and red onion on top. Crumble feta over each bowl and drizzle generously with the tahini dressing.',
        videoThumb: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Alex Kim',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face',
      recipeCount: 98,
      rating: 4.7,
    },
    source: 'Cooking Class',
    cuisine: 'Mediterranean',
    cookingClassType: 'Light & Fresh',
    ease: 5,
    taste: 4,
    cleanup: 4,
    makeAgain: true,
    remade: 6,
  },
  {
    id: 'grilled-salmon',
    title: 'Honey Glazed Grilled Salmon with Roasted Vegetables',
    category: 'Dinner',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=400&fit=crop',
    rating: 4.9,
    ratingCount: 312,
    cookTime: '45 mins',
    cookTimeMinutes: 45,
    prepTimeMinutes: 15,
    totalTimeMinutes: 60,
    servings: 4,
    calories: 680,
    difficulty: 'Medium',
    cost: 3,
    isFavorite: true,
    description:
      'Perfectly grilled salmon with a sweet honey glaze, served alongside colorful roasted seasonal vegetables.',
    ingredients: [
      { name: 'Salmon fillets', quantity: '4 (6 oz each)', image: 'https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=60&h=60&fit=crop' },
      { name: 'Honey', quantity: '3 tbsp', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=60&h=60&fit=crop' },
      { name: 'Soy sauce', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=60&h=60&fit=crop' },
      { name: 'Garlic', quantity: '3 cloves minced', image: 'https://images.unsplash.com/photo-1615477550927-6ec8445b45ed?w=60&h=60&fit=crop' },
      { name: 'Lemon', quantity: '1 juiced', image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=60&h=60&fit=crop' },
      { name: 'Asparagus', quantity: '1 bunch trimmed', image: 'https://images.unsplash.com/photo-1515471209610-dae1c92d8777?w=60&h=60&fit=crop' },
      { name: 'Bell peppers', quantity: '2 sliced', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=60&h=60&fit=crop' },
      { name: 'Olive oil', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1474979266404-7eadf1758724?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Prepare the Honey Glaze',
        body: 'Whisk together honey, soy sauce, minced garlic, and lemon juice in a small bowl. Set aside half for basting and half for serving.',
        videoThumb: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Roast the Vegetables',
        body: 'Toss asparagus and bell peppers with olive oil, salt, and pepper. Spread on a baking sheet and roast at 425F for 18-20 minutes until tender and caramelized.',
        videoThumb: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Grill the Salmon',
        body: 'Preheat grill to medium-high heat. Brush salmon fillets with olive oil and season with salt and pepper. Grill skin-side down for 4 minutes, flip, and baste with the honey glaze. Cook for another 3-4 minutes until the salmon flakes easily.',
        videoThumb: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=200&h=130&fit=crop',
      },
      {
        step: '04',
        title: 'Plate and Serve',
        body: 'Arrange roasted vegetables on plates, place the glazed salmon on top, and drizzle with the reserved honey glaze. Garnish with lemon wedges.',
        videoThumb: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef James Oliver',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
      recipeCount: 215,
      rating: 4.8,
    },
    source: 'Friend Recommendation',
    cuisine: 'American',
    cookingClassType: 'Feeling Fancy',
    ease: 3,
    taste: 5,
    cleanup: 2,
    makeAgain: true,
    remade: 8,
  },
  {
    id: 'chocolate-lava-cake',
    title: 'Decadent Chocolate Lava Cake with Vanilla Ice Cream',
    category: 'Dessert',
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&h=400&fit=crop',
    rating: 4.7,
    ratingCount: 156,
    cookTime: '20 mins',
    cookTimeMinutes: 20,
    prepTimeMinutes: 10,
    totalTimeMinutes: 30,
    servings: 2,
    calories: 450,
    difficulty: 'Hard',
    cost: 2,
    isFavorite: false,
    description:
      'Rich, indulgent chocolate lava cake with a molten center, paired with creamy vanilla ice cream.',
    ingredients: [
      { name: 'Dark chocolate', quantity: '6 oz chopped', image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=60&h=60&fit=crop' },
      { name: 'Unsalted butter', quantity: '1/2 cup', image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=60&h=60&fit=crop' },
      { name: 'Eggs', quantity: '2 large + 2 yolks', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=60&h=60&fit=crop' },
      { name: 'Granulated sugar', quantity: '1/4 cup', image: 'https://images.unsplash.com/photo-1581268371637-f904b596b8a8?w=60&h=60&fit=crop' },
      { name: 'All-purpose flour', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=60&h=60&fit=crop' },
      { name: 'Vanilla extract', quantity: '1 tsp', image: 'https://images.unsplash.com/photo-1611003228941-98852ba62227?w=60&h=60&fit=crop' },
      { name: 'Cocoa powder', quantity: '1 tbsp for dusting', image: 'https://images.unsplash.com/photo-1610611424854-5e07b2cbe8b8?w=60&h=60&fit=crop' },
      { name: 'Vanilla ice cream', quantity: '2 scoops', image: 'https://images.unsplash.com/photo-1570197571499-166b36435e9f?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Melt Chocolate & Butter',
        body: 'Melt dark chocolate and butter together in a double boiler or microwave in 30-second intervals, stirring until smooth. Let cool slightly for 5 minutes.',
        videoThumb: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Whisk the Batter',
        body: 'Whisk eggs, egg yolks, and sugar until thick and pale. Fold in the melted chocolate mixture, then gently fold in the flour and vanilla extract.',
        videoThumb: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Prepare Ramekins & Bake',
        body: 'Butter two ramekins and dust with cocoa powder. Divide batter evenly. Bake at 425F for exactly 12-14 minutes until edges are set but the center jiggles slightly.',
        videoThumb: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=200&h=130&fit=crop',
      },
      {
        step: '04',
        title: 'Unmold and Serve',
        body: 'Let rest for 1 minute, then run a knife around the edges and invert onto plates. Serve immediately with a scoop of vanilla ice cream and a dusting of cocoa powder.',
        videoThumb: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Sophie Laurent',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face',
      recipeCount: 167,
      rating: 4.9,
    },
    source: 'Cooking Class',
    cuisine: 'French',
    cookingClassType: 'Date Night In',
    ease: 2,
    taste: 5,
    cleanup: 2,
    makeAgain: true,
    remade: 3,
  },
  {
    id: 'tacos-al-pastor',
    title: 'Tacos Al Pastor with Pineapple Salsa & Cilantro Lime Rice',
    category: 'Dinner',
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=400&fit=crop',
    rating: 4.8,
    ratingCount: 267,
    cookTime: '60 mins',
    cookTimeMinutes: 60,
    prepTimeMinutes: 30,
    totalTimeMinutes: 90,
    servings: 6,
    calories: 720,
    difficulty: 'Medium',
    cost: 2,
    isFavorite: true,
    description:
      'Authentic tacos al pastor with marinated pork, grilled pineapple salsa, and zesty cilantro lime rice.',
    ingredients: [
      { name: 'Pork shoulder', quantity: '2 lbs thinly sliced', image: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=60&h=60&fit=crop' },
      { name: 'Pineapple', quantity: '1/2 cored & sliced', image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=60&h=60&fit=crop' },
      { name: 'Chipotle peppers in adobo', quantity: '2 peppers + 1 tbsp sauce', image: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=60&h=60&fit=crop' },
      { name: 'Achiote paste', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=60&h=60&fit=crop' },
      { name: 'Corn tortillas', quantity: '12 small', image: 'https://images.unsplash.com/photo-1612966809830-7d0bdb48a59d?w=60&h=60&fit=crop' },
      { name: 'Fresh cilantro', quantity: '1/2 cup chopped', image: 'https://images.unsplash.com/photo-1592054597111-afa57d4e4a8e?w=60&h=60&fit=crop' },
      { name: 'Limes', quantity: '3 juiced', image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=60&h=60&fit=crop' },
      { name: 'White onion', quantity: '1 diced', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=60&h=60&fit=crop' },
      { name: 'White rice', quantity: '2 cups', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Marinate the Pork',
        body: 'Blend achiote paste, chipotle peppers, lime juice, and a splash of pineapple juice into a smooth marinade. Coat the pork slices and refrigerate for at least 1 hour or overnight.',
        videoThumb: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Grill the Pork & Pineapple',
        body: 'Grill marinated pork over high heat for 3-4 minutes per side until charred and cooked through. Grill pineapple slices for 2 minutes per side until caramelized, then dice.',
        videoThumb: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Prepare Cilantro Lime Rice',
        body: 'Cook rice according to package directions. Fluff with a fork and stir in fresh lime juice, chopped cilantro, and a pinch of salt.',
        videoThumb: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=200&h=130&fit=crop',
      },
      {
        step: '04',
        title: 'Assemble the Tacos',
        body: 'Warm tortillas on the grill for 30 seconds per side. Top with sliced pork, grilled pineapple, diced onion, cilantro, and a squeeze of fresh lime juice. Serve with cilantro lime rice on the side.',
        videoThumb: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Carlos Mendez',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
      recipeCount: 189,
      rating: 4.8,
    },
    source: 'Family Recipe',
    cuisine: 'Mexican',
    cookingClassType: 'Taco Tuesday',
    ease: 3,
    taste: 5,
    cleanup: 3,
    makeAgain: true,
    remade: 10,
  },
  {
    id: 'pad-thai',
    title: 'Classic Pad Thai with Shrimp & Crushed Peanuts',
    category: 'Dinner',
    image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&h=400&fit=crop',
    rating: 4.6,
    ratingCount: 198,
    cookTime: '30 mins',
    cookTimeMinutes: 30,
    prepTimeMinutes: 15,
    totalTimeMinutes: 45,
    servings: 4,
    calories: 580,
    difficulty: 'Medium',
    cost: 3,
    isFavorite: false,
    description:
      'A classic Thai stir-fried noodle dish with succulent shrimp, crunchy bean sprouts, and crushed peanuts.',
    ingredients: [
      { name: 'Rice noodles', quantity: '8 oz dried', image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=60&h=60&fit=crop' },
      { name: 'Shrimp', quantity: '1 lb peeled & deveined', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=60&h=60&fit=crop' },
      { name: 'Eggs', quantity: '2 large', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=60&h=60&fit=crop' },
      { name: 'Bean sprouts', quantity: '1 cup', image: 'https://images.unsplash.com/photo-1574226516831-e1dff420e562?w=60&h=60&fit=crop' },
      { name: 'Crushed peanuts', quantity: '1/4 cup', image: 'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=60&h=60&fit=crop' },
      { name: 'Fish sauce', quantity: '3 tbsp', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=60&h=60&fit=crop' },
      { name: 'Tamarind paste', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=60&h=60&fit=crop' },
      { name: 'Lime', quantity: '2 wedges', image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=60&h=60&fit=crop' },
      { name: 'Green onions', quantity: '3 sliced', image: 'https://images.unsplash.com/photo-1592054597111-afa57d4e4a8e?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Soak the Noodles',
        body: 'Place rice noodles in a large bowl of warm water and soak for 20-25 minutes until pliable but still firm. Drain and set aside.',
        videoThumb: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Make the Pad Thai Sauce',
        body: 'Whisk together tamarind paste, fish sauce, sugar, and a splash of water in a small bowl until the sugar dissolves. Set aside.',
        videoThumb: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Stir-Fry the Shrimp & Noodles',
        body: 'Heat oil in a wok over high heat. Cook shrimp for 2 minutes per side, push to the side, scramble eggs in the center. Add noodles and sauce, tossing constantly for 2-3 minutes until noodles are tender.',
        videoThumb: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=200&h=130&fit=crop',
      },
      {
        step: '04',
        title: 'Garnish and Serve',
        body: 'Toss in bean sprouts and green onions, then plate immediately. Top with crushed peanuts and serve with fresh lime wedges on the side.',
        videoThumb: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Niran Suthep',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
      recipeCount: 134,
      rating: 4.7,
    },
    source: 'Internet',
    cuisine: 'Thai',
    cookingClassType: 'Fusion Feast',
    ease: 3,
    taste: 4,
    cleanup: 2,
    makeAgain: true,
    remade: 5,
  },
  {
    id: 'caesar-salad',
    title: 'Classic Caesar Salad with Homemade Croutons',
    category: 'Lunch',
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&h=400&fit=crop',
    rating: 4.3,
    ratingCount: 120,
    cookTime: '15 mins',
    cookTimeMinutes: 15,
    prepTimeMinutes: 10,
    totalTimeMinutes: 25,
    servings: 2,
    calories: 340,
    difficulty: 'Easy',
    cost: 1,
    isFavorite: false,
    description:
      'Crispy romaine lettuce tossed in creamy Caesar dressing with parmesan and golden homemade croutons.',
    ingredients: [
      { name: 'Romaine lettuce', quantity: '2 heads chopped', image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=60&h=60&fit=crop' },
      { name: 'Parmesan cheese', quantity: '1/2 cup shaved', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=60&h=60&fit=crop' },
      { name: 'Crusty bread', quantity: '2 cups cubed', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=60&h=60&fit=crop' },
      { name: 'Garlic', quantity: '2 cloves minced', image: 'https://images.unsplash.com/photo-1615477550927-6ec8445b45ed?w=60&h=60&fit=crop' },
      { name: 'Anchovy fillets', quantity: '3 fillets', image: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=60&h=60&fit=crop' },
      { name: 'Egg yolk', quantity: '1 large', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=60&h=60&fit=crop' },
      { name: 'Dijon mustard', quantity: '1 tsp', image: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=60&h=60&fit=crop' },
      { name: 'Lemon', quantity: '1 juiced', image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=60&h=60&fit=crop' },
      { name: 'Olive oil', quantity: '1/3 cup', image: 'https://images.unsplash.com/photo-1474979266404-7eadf1758724?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Make Homemade Croutons',
        body: 'Toss cubed bread with olive oil, minced garlic, salt, and pepper. Spread on a baking sheet and bake at 375F for 10-12 minutes, tossing halfway, until golden and crispy.',
        videoThumb: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Prepare the Caesar Dressing',
        body: 'In a food processor, blend anchovy fillets, garlic, egg yolk, Dijon mustard, and lemon juice. Slowly drizzle in olive oil while blending until thick and emulsified. Season with salt and pepper.',
        videoThumb: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Toss and Serve',
        body: 'Place chopped romaine in a large bowl, add the dressing, and toss until every leaf is coated. Top with shaved parmesan and golden croutons. Serve immediately with extra parmesan on the side.',
        videoThumb: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Alex Kim',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face',
      recipeCount: 98,
      rating: 4.7,
    },
    source: 'Cookbook',
    cuisine: 'Italian',
    cookingClassType: 'Salad Celebration',
    ease: 5,
    taste: 4,
    cleanup: 5,
    makeAgain: true,
    remade: 7,
  },
  {
    id: 'korean-bibimbap',
    title: 'Korean Bibimbap with Gochujang Sauce & Fried Egg',
    category: 'Dinner',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=600&h=400&fit=crop',
    rating: 4.7,
    ratingCount: 203,
    cookTime: '45 mins',
    cookTimeMinutes: 45,
    prepTimeMinutes: 20,
    totalTimeMinutes: 65,
    servings: 4,
    calories: 620,
    difficulty: 'Medium',
    cost: 2,
    isFavorite: true,
    description:
      'A colorful Korean rice bowl topped with seasoned vegetables, spicy gochujang sauce, and a perfect fried egg.',
    ingredients: [
      { name: 'Short-grain rice', quantity: '2 cups', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=60&h=60&fit=crop' },
      { name: 'Spinach', quantity: '2 cups blanched', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=60&h=60&fit=crop' },
      { name: 'Carrots', quantity: '2 julienned', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=60&h=60&fit=crop' },
      { name: 'Zucchini', quantity: '1 sliced', image: 'https://images.unsplash.com/photo-1563252722-6434563a985d?w=60&h=60&fit=crop' },
      { name: 'Shiitake mushrooms', quantity: '1 cup sliced', image: 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=60&h=60&fit=crop' },
      { name: 'Ground beef', quantity: '8 oz', image: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=60&h=60&fit=crop' },
      { name: 'Gochujang paste', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=60&h=60&fit=crop' },
      { name: 'Sesame oil', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1474979266404-7eadf1758724?w=60&h=60&fit=crop' },
      { name: 'Eggs', quantity: '4 large', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Cook the Rice',
        body: 'Rinse short-grain rice until water runs clear. Cook in a rice cooker or on the stovetop with 2.5 cups of water until fluffy and slightly sticky.',
        videoThumb: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Prepare the Toppings',
        body: 'Saute each vegetable separately in sesame oil with a pinch of salt: blanch spinach, stir-fry julienned carrots, cook sliced zucchini, and brown the mushrooms. Season ground beef with soy sauce and garlic, then cook until browned.',
        videoThumb: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Fry the Eggs',
        body: 'Fry eggs sunny-side up in a lightly oiled pan over medium heat until the whites are set but the yolks remain runny, about 3-4 minutes.',
        videoThumb: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=200&h=130&fit=crop',
      },
      {
        step: '04',
        title: 'Assemble the Bibimbap',
        body: 'Divide rice among bowls and arrange each vegetable and the beef in separate sections on top. Place a fried egg in the center, add a generous spoonful of gochujang, and drizzle with sesame oil. Mix everything together before eating.',
        videoThumb: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Soo-Min Park',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
      recipeCount: 112,
      rating: 4.8,
    },
    source: 'Original',
    cuisine: 'Korean',
    cookingClassType: 'Fusion Feast',
    ease: 3,
    taste: 5,
    cleanup: 2,
    makeAgain: true,
    remade: 6,
  },
  {
    id: 'carbonara',
    title: 'Spaghetti Carbonara with Pancetta & Pecorino',
    category: 'Dinner',
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&h=400&fit=crop',
    rating: 4.9,
    ratingCount: 341,
    cookTime: '30 mins',
    cookTimeMinutes: 30,
    prepTimeMinutes: 10,
    totalTimeMinutes: 40,
    servings: 4,
    calories: 750,
    difficulty: 'Medium',
    cost: 3,
    isFavorite: true,
    description:
      'Silky, authentic Italian carbonara with crispy pancetta, rich egg yolk, and sharp pecorino romano.',
    ingredients: [
      { name: 'Spaghetti', quantity: '1 lb', image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=60&h=60&fit=crop' },
      { name: 'Pancetta', quantity: '6 oz diced', image: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=60&h=60&fit=crop' },
      { name: 'Eggs', quantity: '3 large + 2 yolks', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=60&h=60&fit=crop' },
      { name: 'Pecorino Romano', quantity: '1 cup finely grated', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=60&h=60&fit=crop' },
      { name: 'Black pepper', quantity: '2 tsp freshly cracked', image: 'https://images.unsplash.com/photo-1599909533735-ddb8e6975b8f?w=60&h=60&fit=crop' },
      { name: 'Garlic', quantity: '2 cloves', image: 'https://images.unsplash.com/photo-1615477550927-6ec8445b45ed?w=60&h=60&fit=crop' },
      { name: 'Fresh parsley', quantity: '2 tbsp chopped', image: 'https://images.unsplash.com/photo-1592054597111-afa57d4e4a8e?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Cook the Pasta',
        body: 'Bring a large pot of generously salted water to a rolling boil. Cook spaghetti until al dente, about 1 minute less than package directions. Reserve 1 cup of pasta water before draining.',
        videoThumb: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Crisp the Pancetta',
        body: 'While pasta cooks, add diced pancetta to a cold skillet and cook over medium heat for 6-8 minutes until golden and crispy. Add garlic in the last minute and remove from heat.',
        videoThumb: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Make the Egg Mixture',
        body: 'Whisk together eggs, extra yolks, grated pecorino, and a generous amount of freshly cracked black pepper in a bowl until smooth and creamy.',
        videoThumb: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=200&h=130&fit=crop',
      },
      {
        step: '04',
        title: 'Combine and Serve',
        body: 'Add drained pasta to the pancetta skillet off the heat. Pour the egg mixture over and toss vigorously, adding splashes of pasta water until a silky sauce coats every strand. Serve immediately with extra pecorino and black pepper.',
        videoThumb: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Marco Rossi',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
      recipeCount: 230,
      rating: 4.9,
    },
    source: 'Family Recipe',
    cuisine: 'Italian',
    cookingClassType: 'Pasta Party',
    ease: 3,
    taste: 5,
    cleanup: 3,
    makeAgain: true,
    remade: 10,
  },
  {
    id: 'ai-buddha-bowl',
    title: 'AI-Crafted Rainbow Buddha Bowl with Tahini Drizzle',
    category: 'Lunch',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=400&fit=crop',
    rating: 4.4,
    ratingCount: 45,
    cookTime: '20 mins',
    cookTimeMinutes: 20,
    prepTimeMinutes: 15,
    totalTimeMinutes: 35,
    servings: 2,
    calories: 410,
    difficulty: 'Easy',
    cost: 1,
    isFavorite: false,
    description:
      'A vibrant, AI-generated recipe combining nutrient-dense ingredients into a beautiful rainbow bowl.',
    ingredients: [
      { name: 'Sweet potato', quantity: '1 large cubed', image: '' },
      { name: 'Purple cabbage', quantity: '1 cup shredded', image: 'https://images.unsplash.com/photo-1594282486756-fa7e0e5c4e89?w=60&h=60&fit=crop' },
      { name: 'Edamame', quantity: '1/2 cup shelled', image: 'https://images.unsplash.com/photo-1564894809611-1742fc40ed80?w=60&h=60&fit=crop' },
      { name: 'Avocado', quantity: '1 sliced', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=60&h=60&fit=crop' },
      { name: 'Quinoa', quantity: '1 cup cooked', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=60&h=60&fit=crop' },
      { name: 'Carrots', quantity: '1 shredded', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=60&h=60&fit=crop' },
      { name: 'Tahini', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=60&h=60&fit=crop' },
      { name: 'Lemon', quantity: '1 juiced', image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Roast the Sweet Potato',
        body: 'Toss cubed sweet potato with olive oil, salt, and smoked paprika. Roast at 400F for 20-25 minutes until tender and caramelized at the edges.',
        videoThumb: '',
      },
      {
        step: '02',
        title: 'Prepare the Rainbow Toppings',
        body: 'While sweet potato roasts, shred purple cabbage, grate carrots, slice avocado, and cook edamame in boiling water for 3 minutes. Drain and set aside.',
        videoThumb: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Make the Tahini Drizzle',
        body: 'Whisk tahini with lemon juice, a clove of minced garlic, water, and a pinch of salt until smooth and drizzleable. Add water as needed to reach desired consistency.',
        videoThumb: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=130&fit=crop',
      },
      {
        step: '04',
        title: 'Build the Buddha Bowl',
        body: 'Divide quinoa between two bowls. Arrange sweet potato, cabbage, carrots, edamame, and avocado in rainbow sections. Drizzle generously with tahini sauce and sprinkle with sesame seeds.',
        videoThumb: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'AI Chef',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face',
      recipeCount: 500,
      rating: 4.5,
    },
    source: 'AI Generated',
    cuisine: 'Fusion',
    cookingClassType: 'Light & Fresh',
    ease: 5,
    taste: 4,
    cleanup: 4,
    makeAgain: false,
    remade: 1,
  },
];

export const recentlyViewedRecipes: Recipe[] = [
  {
    id: 'grilled-salmon',
    title: 'Honey Glazed Grilled Salmon with Roasted Vegetables',
    category: 'Dinner',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=400&fit=crop',
    rating: 4.9,
    ratingCount: 312,
    cookTime: '45 mins',
    cookTimeMinutes: 45,
    prepTimeMinutes: 15,
    totalTimeMinutes: 60,
    servings: 4,
    calories: 680,
    difficulty: 'Medium',
    cost: 3,
    isFavorite: true,
    description:
      'Perfectly grilled salmon with a sweet honey glaze, served alongside colorful roasted seasonal vegetables.',
    ingredients: [
      { name: 'Salmon fillets', quantity: '4 (6 oz each)', image: 'https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=60&h=60&fit=crop' },
      { name: 'Honey', quantity: '3 tbsp', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=60&h=60&fit=crop' },
      { name: 'Soy sauce', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=60&h=60&fit=crop' },
      { name: 'Garlic', quantity: '3 cloves minced', image: 'https://images.unsplash.com/photo-1615477550927-6ec8445b45ed?w=60&h=60&fit=crop' },
      { name: 'Lemon', quantity: '1 juiced', image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=60&h=60&fit=crop' },
      { name: 'Asparagus', quantity: '1 bunch trimmed', image: 'https://images.unsplash.com/photo-1515471209610-dae1c92d8777?w=60&h=60&fit=crop' },
      { name: 'Bell peppers', quantity: '2 sliced', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=60&h=60&fit=crop' },
      { name: 'Olive oil', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1474979266404-7eadf1758724?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Prepare the Honey Glaze',
        body: 'Whisk together honey, soy sauce, minced garlic, and lemon juice in a small bowl. Set aside half for basting and half for serving.',
        videoThumb: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Roast the Vegetables',
        body: 'Toss asparagus and bell peppers with olive oil, salt, and pepper. Spread on a baking sheet and roast at 425F for 18-20 minutes until tender and caramelized.',
        videoThumb: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Grill the Salmon',
        body: 'Preheat grill to medium-high heat. Brush salmon fillets with olive oil and season with salt and pepper. Grill skin-side down for 4 minutes, flip, and baste with the honey glaze. Cook for another 3-4 minutes until the salmon flakes easily.',
        videoThumb: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=200&h=130&fit=crop',
      },
      {
        step: '04',
        title: 'Plate and Serve',
        body: 'Arrange roasted vegetables on plates, place the glazed salmon on top, and drizzle with the reserved honey glaze. Garnish with lemon wedges.',
        videoThumb: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef James Oliver',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
      recipeCount: 215,
      rating: 4.8,
    },
    source: 'Friend Recommendation',
    cuisine: 'American',
    cookingClassType: 'Feeling Fancy',
    ease: 3,
    taste: 5,
    cleanup: 2,
    makeAgain: true,
    remade: 8,
  },
  {
    id: 'fluffy-banana-pancakes',
    title: 'Fluffy Banana Oat Pancakes with Cinnamon & Fresh Berries',
    category: 'Breakfast',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=400&fit=crop',
    rating: 4.8,
    ratingCount: 234,
    cookTime: '30 mins',
    cookTimeMinutes: 30,
    prepTimeMinutes: 15,
    totalTimeMinutes: 45,
    servings: 4,
    calories: 1253,
    difficulty: 'Medium',
    cost: 1,
    isFavorite: true,
    description:
      'Start your morning with these light, fluffy banana oat pancakes topped with warm cinnamon and a burst of fresh berries.',
    ingredients: [
      { name: 'Bananas', quantity: '2 ripe', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=60&h=60&fit=crop' },
      { name: 'Rolled oats', quantity: '1 cup', image: 'https://images.unsplash.com/photo-1614961233913-a5113b4a4983?w=60&h=60&fit=crop' },
      { name: 'Baking powder', quantity: '1 tsp', image: 'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=60&h=60&fit=crop' },
      { name: 'Cinnamon', quantity: '1/2 tsp', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=60&h=60&fit=crop' },
      { name: 'Eggs', quantity: '2 large', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=60&h=60&fit=crop' },
      { name: 'Milk', quantity: '1/2 cup', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=60&h=60&fit=crop' },
      { name: 'Fresh berries', quantity: '1 cup', image: 'https://images.unsplash.com/photo-1563746098251-d35aef196e83?w=60&h=60&fit=crop' },
      { name: 'Maple syrup', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1589820296156-2454bb8a6ad1?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Blend the Batter',
        body: 'Combine bananas, oats, eggs, milk, baking powder, and cinnamon in a blender. Blend until smooth and let the batter rest for 5 minutes.',
        videoThumb: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Heat the Pan',
        body: 'Heat a non-stick pan over medium heat. Lightly grease with butter or coconut oil. The pan is ready when a drop of water sizzles.',
        videoThumb: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Cook the Pancakes',
        body: 'Pour 1/4 cup of batter for each pancake. Cook until bubbles form on the surface (about 2-3 minutes), then flip and cook for another 1-2 minutes until golden.',
        videoThumb: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Maria Santos',
      avatar: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80&h=80&fit=crop&crop=face',
      recipeCount: 142,
      rating: 4.9,
    },
    source: 'Internet',
    cuisine: 'American',
    cookingClassType: 'Cozy Comfort Food',
    ease: 4,
    taste: 5,
    cleanup: 3,
    makeAgain: true,
    remade: 4,
  },
];

export const recentlyAddedRecipes: Recipe[] = [
  {
    id: 'avocado-toast',
    title: 'Smashed Avocado Toast with Poached Eggs & Chili Flakes',
    category: 'Breakfast',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=400&fit=crop',
    rating: 4.5,
    ratingCount: 78,
    cookTime: '15 mins',
    cookTimeMinutes: 15,
    prepTimeMinutes: 5,
    totalTimeMinutes: 20,
    servings: 1,
    calories: 380,
    difficulty: 'Easy',
    cost: 1,
    isFavorite: false,
    description:
      'Crispy sourdough topped with creamy avocado, perfectly poached eggs, and a kick of chili flakes.',
    ingredients: [
      { name: 'Sourdough bread', quantity: '2 thick slices', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=60&h=60&fit=crop' },
      { name: 'Avocado', quantity: '1 ripe', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=60&h=60&fit=crop' },
      { name: 'Eggs', quantity: '2 large', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=60&h=60&fit=crop' },
      { name: 'Chili flakes', quantity: '1/2 tsp', image: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=60&h=60&fit=crop' },
      { name: 'Lime', quantity: '1/2 juiced', image: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=60&h=60&fit=crop' },
      { name: 'Olive oil', quantity: '1 tbsp', image: 'https://images.unsplash.com/photo-1474979266404-7eadf1758724?w=60&h=60&fit=crop' },
      { name: 'Flaky sea salt', quantity: 'to taste', image: 'https://images.unsplash.com/photo-1518110925495-5fe2c8dcf2c6?w=60&h=60&fit=crop' },
      { name: 'Microgreens', quantity: 'small handful', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Toast the Bread',
        body: 'Toast sourdough slices until deep golden and crispy on the outside but still slightly soft inside. Drizzle with a little olive oil while warm.',
        videoThumb: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Poach the Eggs',
        body: 'Bring a pot of water to a gentle simmer and add a splash of vinegar. Create a swirl and gently drop in each egg. Poach for 3-4 minutes until whites are set but yolks are still runny.',
        videoThumb: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Smash and Assemble',
        body: 'Halve the avocado, scoop into a bowl, and smash with a fork along with lime juice and salt. Spread generously on toast, top with poached eggs, chili flakes, microgreens, and a pinch of flaky sea salt.',
        videoThumb: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Alex Kim',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face',
      recipeCount: 98,
      rating: 4.7,
    },
    source: 'Internet',
    cuisine: 'American',
    cookingClassType: 'Light & Fresh',
    ease: 5,
    taste: 4,
    cleanup: 5,
    makeAgain: true,
    remade: 2,
  },
  {
    id: 'thai-green-curry',
    title: 'Thai Green Curry with Jasmine Rice & Fresh Basil',
    category: 'Dinner',
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&h=400&fit=crop',
    rating: 4.7,
    ratingCount: 145,
    cookTime: '35 mins',
    cookTimeMinutes: 35,
    prepTimeMinutes: 10,
    totalTimeMinutes: 45,
    servings: 4,
    calories: 590,
    difficulty: 'Medium',
    cost: 2,
    isFavorite: false,
    description:
      'Aromatic Thai green curry loaded with vegetables and tender chicken, served over fluffy jasmine rice.',
    ingredients: [
      { name: 'Green curry paste', quantity: '3 tbsp', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=60&h=60&fit=crop' },
      { name: 'Coconut milk', quantity: '1 can (14 oz)', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=60&h=60&fit=crop' },
      { name: 'Chicken breast', quantity: '1 lb sliced', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82571?w=60&h=60&fit=crop' },
      { name: 'Bamboo shoots', quantity: '1/2 cup', image: 'https://images.unsplash.com/photo-1574226516831-e1dff420e562?w=60&h=60&fit=crop' },
      { name: 'Thai basil', quantity: '1/2 cup leaves', image: 'https://images.unsplash.com/photo-1592054597111-afa57d4e4a8e?w=60&h=60&fit=crop' },
      { name: 'Bell peppers', quantity: '2 sliced', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=60&h=60&fit=crop' },
      { name: 'Jasmine rice', quantity: '2 cups', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=60&h=60&fit=crop' },
      { name: 'Fish sauce', quantity: '2 tbsp', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=60&h=60&fit=crop' },
      { name: 'Brown sugar', quantity: '1 tbsp', image: 'https://images.unsplash.com/photo-1581268371637-f904b596b8a8?w=60&h=60&fit=crop' },
    ],
    instructions: [
      {
        step: '01',
        title: 'Cook the Jasmine Rice',
        body: 'Rinse jasmine rice until water runs clear. Combine with 2.5 cups of water, bring to a boil, reduce heat, cover, and cook for 15 minutes. Let steam with the lid on for 5 more minutes.',
        videoThumb: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=200&h=130&fit=crop',
      },
      {
        step: '02',
        title: 'Build the Curry Base',
        body: 'Heat a tablespoon of oil in a large wok or pot. Fry the green curry paste for 1-2 minutes until fragrant. Pour in half the coconut milk and stir, cooking until the oil separates and the paste sizzles.',
        videoThumb: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=200&h=130&fit=crop',
      },
      {
        step: '03',
        title: 'Add Chicken & Vegetables',
        body: 'Add sliced chicken and cook for 3-4 minutes until no longer pink. Stir in bell peppers, bamboo shoots, the remaining coconut milk, fish sauce, and brown sugar. Simmer for 10 minutes.',
        videoThumb: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&h=130&fit=crop',
      },
      {
        step: '04',
        title: 'Finish and Serve',
        body: 'Remove from heat, stir in fresh Thai basil leaves, and let them wilt into the curry. Serve the curry ladled over fluffy jasmine rice in deep bowls.',
        videoThumb: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=130&fit=crop',
      },
    ],
    chef: {
      name: 'Chef Sophie Laurent',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face',
      recipeCount: 167,
      rating: 4.9,
    },
    source: 'Cookbook',
    cuisine: 'Thai',
    cookingClassType: 'Fusion Feast',
    ease: 3,
    taste: 5,
    cleanup: 2,
    makeAgain: true,
    remade: 3,
  },
];

export interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  category: string;
  /** Set when the item was added from a recipe, for the "open recipe" chip. */
  recipeId?: string;
  recipeTitle?: string;
}

export const groceryItems: GroceryItem[] = [
  { id: 'g-1', name: 'Bananas', quantity: '2 lbs', checked: true, category: 'Fruits & Vegetables' },
  { id: 'g-2', name: 'Rolled Oats', quantity: '1 bag', checked: false, category: 'Grains & Cereals' },
  { id: 'g-3', name: 'Fresh Salmon', quantity: '2 fillets', checked: false, category: 'Protein' },
  { id: 'g-4', name: 'Quinoa', quantity: '1 bag', checked: true, category: 'Grains & Cereals' },
  { id: 'g-5', name: 'Greek Yogurt', quantity: '32 oz', checked: false, category: 'Dairy & Eggs' },
  { id: 'g-6', name: 'Fresh Berries', quantity: '2 pints', checked: false, category: 'Fruits & Vegetables' },
];

export const aiSuggestedPrompts = [
  'Banana substitute?',
  'How to store this?',
  'Can I make this gluten-free?',
  'Can I freeze this meal?',
  'Why are my pancakes too dense or flat?',
  'Can I refrigerate the batter overnight?',
];

