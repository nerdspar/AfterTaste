export interface Recipe {
  id: string;
  title: string;
  category: string;
  image: string;
  rating: number;
  ratingCount: number;
  cookTime: string;
  cookTimeMinutes: number;
  calories: number;
  difficulty: string;
  sweetness: number; // 0-3
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
  makeAgain: boolean;
  remade: number; // 0-10+
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

export interface StoryUser {
  name: string;
  avatar: string;
  isYou?: boolean;
  hasNew?: boolean;
}

export interface LiveCook {
  id: string;
  title: string;
  channelName: string;
  image: string;
  isLive: boolean;
  viewerCount: number;
}

export interface EventItem {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  image: string;
  attendees: Array<{ src?: string; alt: string }>;
}

export const categories: Category[] = [
  { label: 'Breakfast', icon: '🥞', slug: 'breakfast' },
  { label: 'Lunch', icon: '🥗', slug: 'lunch' },
  { label: 'Dinner', icon: '🍝', slug: 'dinner' },
  { label: 'Dessert', icon: '🍰', slug: 'dessert' },
  { label: 'Favorites', icon: '❤️', slug: 'favorites' },
];

export const storyUsers: StoryUser[] = [
  {
    name: 'Your Story',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face',
    isYou: true,
  },
  {
    name: 'Emma',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
    hasNew: true,
  },
  {
    name: 'James',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
    hasNew: true,
  },
  {
    name: 'Sofia',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
    hasNew: false,
  },
  {
    name: 'Liam',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
    hasNew: true,
  },
  {
    name: 'Mia',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face',
    hasNew: false,
  },
  {
    name: 'Noah',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
    hasNew: true,
  },
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
    calories: 1253,
    difficulty: 'Medium',
    sweetness: 2,
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
    calories: 520,
    difficulty: 'Easy',
    sweetness: 0,
    isFavorite: false,
    description:
      'A vibrant, nutrient-packed bowl featuring fluffy quinoa, roasted vegetables, and a creamy lemon tahini dressing.',
    ingredients: [],
    instructions: [],
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
    calories: 680,
    difficulty: 'Medium',
    sweetness: 1,
    isFavorite: true,
    description:
      'Perfectly grilled salmon with a sweet honey glaze, served alongside colorful roasted seasonal vegetables.',
    ingredients: [],
    instructions: [],
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
    calories: 450,
    difficulty: 'Hard',
    sweetness: 3,
    isFavorite: false,
    description:
      'Rich, indulgent chocolate lava cake with a molten center, paired with creamy vanilla ice cream.',
    ingredients: [],
    instructions: [],
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
    calories: 720,
    difficulty: 'Medium',
    sweetness: 1,
    isFavorite: true,
    description:
      'Authentic tacos al pastor with marinated pork, grilled pineapple salsa, and zesty cilantro lime rice.',
    ingredients: [],
    instructions: [],
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
    calories: 580,
    difficulty: 'Medium',
    sweetness: 1,
    isFavorite: false,
    description:
      'A classic Thai stir-fried noodle dish with succulent shrimp, crunchy bean sprouts, and crushed peanuts.',
    ingredients: [],
    instructions: [],
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
    calories: 340,
    difficulty: 'Easy',
    sweetness: 0,
    isFavorite: false,
    description:
      'Crispy romaine lettuce tossed in creamy Caesar dressing with parmesan and golden homemade croutons.',
    ingredients: [],
    instructions: [],
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
    calories: 620,
    difficulty: 'Medium',
    sweetness: 0,
    isFavorite: true,
    description:
      'A colorful Korean rice bowl topped with seasoned vegetables, spicy gochujang sauce, and a perfect fried egg.',
    ingredients: [],
    instructions: [],
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
    calories: 750,
    difficulty: 'Medium',
    sweetness: 0,
    isFavorite: true,
    description:
      'Silky, authentic Italian carbonara with crispy pancetta, rich egg yolk, and sharp pecorino romano.',
    ingredients: [],
    instructions: [],
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
    calories: 410,
    difficulty: 'Easy',
    sweetness: 0,
    isFavorite: false,
    description:
      'A vibrant, AI-generated recipe combining nutrient-dense ingredients into a beautiful rainbow bowl.',
    ingredients: [],
    instructions: [],
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

export const liveCooks: LiveCook[] = [
  {
    id: 'live-1',
    title: 'Making Perfect Homemade Pasta from Scratch',
    channelName: 'Chef Marco',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
    isLive: true,
    viewerCount: 1243,
  },
  {
    id: 'live-2',
    title: 'Japanese Ramen: Tonkotsu Broth Masterclass',
    channelName: 'Noodle House',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop',
    isLive: true,
    viewerCount: 892,
  },
];

export const events: EventItem[] = [
  {
    id: 'event-1',
    title: 'Farm-to-Table Cooking Workshop',
    location: 'Portland, USA',
    date: 'Mar 15, 2026',
    time: '10:00 AM',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&h=200&fit=crop',
    attendees: [
      { src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face', alt: 'User 1' },
      { src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face', alt: 'User 2' },
      { src: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face', alt: 'User 3' },
      { alt: 'User 4' },
      { alt: 'User 5' },
      { alt: 'User 6' },
    ],
  },
  {
    id: 'event-2',
    title: 'International Pastry Festival',
    location: 'Paris, France',
    date: 'Apr 2, 2026',
    time: '2:00 PM',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop',
    attendees: [
      { src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face', alt: 'User 1' },
      { src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face', alt: 'User 2' },
      { alt: 'User 3' },
      { alt: 'User 4' },
    ],
  },
  {
    id: 'event-3',
    title: 'Asian Street Food Tour',
    location: 'Bangkok, Thailand',
    date: 'Apr 18, 2026',
    time: '6:00 PM',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop',
    attendees: [
      { src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face', alt: 'User 1' },
      { alt: 'User 2' },
      { alt: 'User 3' },
      { alt: 'User 4' },
      { alt: 'User 5' },
      { alt: 'User 6' },
      { alt: 'User 7' },
      { alt: 'User 8' },
    ],
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
    calories: 680,
    difficulty: 'Medium',
    sweetness: 1,
    isFavorite: true,
    description:
      'Perfectly grilled salmon with a sweet honey glaze, served alongside colorful roasted seasonal vegetables.',
    ingredients: [],
    instructions: [],
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
    calories: 1253,
    difficulty: 'Medium',
    sweetness: 2,
    isFavorite: true,
    description:
      'Start your morning with these light, fluffy banana oat pancakes topped with warm cinnamon and a burst of fresh berries.',
    ingredients: [],
    instructions: [],
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
    calories: 380,
    difficulty: 'Easy',
    sweetness: 0,
    isFavorite: false,
    description:
      'Crispy sourdough topped with creamy avocado, perfectly poached eggs, and a kick of chili flakes.',
    ingredients: [],
    instructions: [],
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
    calories: 590,
    difficulty: 'Medium',
    sweetness: 0,
    isFavorite: false,
    description:
      'Aromatic Thai green curry loaded with vegetables and tender chicken, served over fluffy jasmine rice.',
    ingredients: [],
    instructions: [],
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

export interface TodayMeal {
  id: string;
  mealType: string;
  title: string;
  time: string;
  calories: number;
  image: string;
  recipeId?: string;
}

export const todaysMeals: TodayMeal[] = [
  {
    id: 'meal-1',
    mealType: 'Breakfast',
    title: 'Fluffy Banana Oat Pancakes',
    time: '8:00 AM',
    calories: 420,
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop',
    recipeId: 'fluffy-banana-pancakes',
  },
  {
    id: 'meal-2',
    mealType: 'Lunch',
    title: 'Mediterranean Quinoa Bowl',
    time: '12:30 PM',
    calories: 520,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop',
    recipeId: 'mediterranean-bowl',
  },
  {
    id: 'meal-3',
    mealType: 'Dinner',
    title: 'Honey Glazed Grilled Salmon',
    time: '7:00 PM',
    calories: 680,
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=200&h=200&fit=crop',
    recipeId: 'grilled-salmon',
  },
  {
    id: 'meal-4',
    mealType: 'Snack',
    title: 'Greek Yogurt with Granola',
    time: '3:30 PM',
    calories: 180,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop',
  },
];

export interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  category: string;
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

export const dishTypeChips = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Brunch'];
export const timeChips = ['15 Mins', '30 Mins', '45 Mins', '60 Mins'];
export const dietChips = ['Vegan', 'Keto', 'Gluten Free', 'High Protein'];
