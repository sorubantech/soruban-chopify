import type { CommunityRecipe } from '@/types';

export const COMMUNITY_RECIPES: CommunityRecipe[] = [
  {
    id: 'recipe_1', title: 'Classic Tamil Sambar',
    description: 'Authentic South Indian sambar with fresh vegetables and homemade powder.',
    image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=400&q=80',
    authorName: 'Priya Kumar', ingredients: ['Toor Dal', 'Drumstick', 'Brinjal', 'Tomato', 'Onion', 'Tamarind', 'Sambar Powder'],
    steps: ['Pressure cook dal with turmeric', 'Cook vegetables in tamarind water', 'Mix dal and vegetables', 'Add sambar powder and salt', 'Temper with mustard, curry leaves'],
    servings: 4, cookTime: '45 min', likes: 234, packId: 'pack_sambar', date: '2026-02-15',
  },
  {
    id: 'recipe_2', title: 'Vegetable Biryani',
    description: 'Fragrant basmati rice layered with spiced vegetables and fresh herbs.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80',
    authorName: 'Arjun Reddy', ingredients: ['Basmati Rice', 'Mixed Vegetables', 'Onion', 'Mint', 'Biryani Masala', 'Saffron', 'Ghee'],
    steps: ['Soak rice 30 mins', 'Fry onions golden', 'Add vegetables and spices', 'Layer rice and vegetables', 'Dum cook 20 mins'],
    servings: 5, cookTime: '60 min', likes: 189, packId: 'pack_biryani', date: '2026-02-20',
  },
  {
    id: 'recipe_3', title: 'Mixed Vegetable Poriyal',
    description: 'A healthy Tamil Nadu style dry vegetable stir-fry with coconut.',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80',
    authorName: 'Lakshmi Devi', ingredients: ['Beans', 'Carrot', 'Beetroot', 'Coconut', 'Mustard Seeds', 'Curry Leaves'],
    steps: ['Chop vegetables uniformly', 'Temper mustard and urad dal', 'Add vegetables with water', 'Cook until tender', 'Add grated coconut'],
    servings: 3, cookTime: '25 min', likes: 156, packId: 'pack_poriyal', date: '2026-03-01',
  },
  {
    id: 'recipe_4', title: 'Fresh Fruit Salad Bowl',
    description: 'A refreshing mix of seasonal fruits with honey and lime dressing.',
    image: 'https://images.unsplash.com/photo-1564093497595-593b96d80571?auto=format&fit=crop&w=400&q=80',
    authorName: 'Meena Shah', ingredients: ['Apple', 'Banana', 'Orange', 'Pomegranate', 'Honey', 'Lime Juice', 'Mint'],
    steps: ['Wash and cut all fruits', 'Mix honey with lime juice', 'Toss fruits in dressing', 'Garnish with mint', 'Chill and serve'],
    servings: 2, cookTime: '10 min', likes: 312, packId: 'pack_fruit_salad', date: '2026-03-05',
  },
  {
    id: 'recipe_5', title: 'Spinach Dal (Palak Dal)',
    description: 'Protein-rich lentils cooked with fresh spinach and mild spices.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
    authorName: 'Ravi Shankar', ingredients: ['Toor Dal', 'Spinach', 'Tomato', 'Garlic', 'Cumin', 'Turmeric'],
    steps: ['Cook dal until soft', 'Blanch and puree spinach', 'Temper with garlic and cumin', 'Mix dal and spinach', 'Simmer 10 mins'],
    servings: 4, cookTime: '35 min', likes: 198, date: '2026-02-28',
  },
  {
    id: 'recipe_6', title: 'Beetroot Juice Boost',
    description: 'Energy-boosting fresh juice with beetroot, carrot, and ginger.',
    image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=400&q=80',
    authorName: 'Kavitha Raman', ingredients: ['Beetroot', 'Carrot', 'Apple', 'Ginger', 'Lemon'],
    steps: ['Wash and peel vegetables', 'Cut into chunks', 'Blend with water', 'Strain if desired', 'Add lemon juice'],
    servings: 2, cookTime: '5 min', likes: 267, packId: 'pack_fruit_juice', date: '2026-03-08',
  },
];

export const SEASONAL_PICKS = [
  { id: 'seasonal_1', title: 'Summer Coolers', description: 'Beat the heat with fresh fruits & drinks', icon: 'weather-sunny', color: '#FF9800', productIds: ['25', '401', '402', '403', '404', '23', '405', '406', '63', '62', '24', '20'] },
  { id: 'seasonal_2', title: 'Monsoon Specials', description: 'Hot soups & pakora veggies', icon: 'weather-rainy', color: '#2196F3', productIds: ['1', '4', '7', '13', '19'] },
  { id: 'seasonal_3', title: 'Winter Warmers', description: 'Root veggies & citrus fruits', icon: 'snowflake', color: '#607D8B', productIds: ['22', '9', '10', '21', '32'] },
  { id: 'seasonal_4', title: 'Festival Feast', description: 'For Pongal & celebrations', icon: 'party-popper', color: '#E91E63', productIds: ['1', '4', '7', '22', '13'] },
];

export const DIETARY_PRESETS: { id: string; label: string; icon: string; description: string; recommendedIds: string[] }[] = [
  { id: 'vegan', label: 'Vegan', icon: 'leaf', description: 'Plant-based diet', recommendedIds: ['1', '4', '7', '13', '19', '21', '22'] },
  { id: 'diabetic', label: 'Diabetes Friendly', icon: 'heart-pulse', description: 'Low glycemic foods', recommendedIds: ['13', '19', '9', '10', '7'] },
  { id: 'heart_healthy', label: 'Heart Healthy', icon: 'heart', description: 'Low sodium, high fiber', recommendedIds: ['1', '13', '19', '22', '9'] },
  { id: 'weight_loss', label: 'Weight Loss', icon: 'scale-bathroom', description: 'Low calorie, high fiber', recommendedIds: ['9', '10', '13', '19', '1'] },
  { id: 'muscle_gain', label: 'Muscle Building', icon: 'arm-flex', description: 'High protein foods', recommendedIds: ['13', '19', '32', '7', '22'] },
  { id: 'kids_friendly', label: 'Kids Friendly', icon: 'baby-face-outline', description: 'Mild & nutritious', recommendedIds: ['22', '2', '3', '8', '1'] },
  { id: 'jain', label: 'Jain Diet', icon: 'meditation', description: 'No root vegetables', recommendedIds: ['1', '9', '13', '19', '3'] },
];
