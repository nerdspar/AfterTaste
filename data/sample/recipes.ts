export interface Recipe {
  id: string;
  title: string;
  category: string;
  image: string;
  rating: number;
  ratingCount: number;
  cookTime: string;
  calories: number;
  difficulty: string;
  sweetness: number; // 0-3
  isFavorite: boolean;
  description: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  chef: Chef;
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
  },
  {
    id: 'mediterranean-bowl',
    title: 'Mediterranean Quinoa Bowl with Lemon Tahini Dressing',
    category: 'Lunch',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
    rating: 4.6,
    ratingCount: 189,
    cookTime: '25 mins',
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
  },
  {
    id: 'grilled-salmon',
    title: 'Honey Glazed Grilled Salmon with Roasted Vegetables',
    category: 'Dinner',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=400&fit=crop',
    rating: 4.9,
    ratingCount: 312,
    cookTime: '45 mins',
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
  },
  {
    id: 'chocolate-lava-cake',
    title: 'Decadent Chocolate Lava Cake with Vanilla Ice Cream',
    category: 'Dessert',
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&h=400&fit=crop',
    rating: 4.7,
    ratingCount: 156,
    cookTime: '20 mins',
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
