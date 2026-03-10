import type { DishPack } from '@/types';

export const FESTIVAL_PACKS: DishPack[] = [
  {
    id: 'pack_pongal', name: 'Pongal Festival Pack',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80',
    description: 'Everything you need for a traditional Pongal feast preparation',
    color: '#FFF3E0', tag: 'Festival', serves: '6-8 people', price: 180,
    items: [
      { productId: '1', quantity: 2 }, { productId: '4', quantity: 2 },
      { productId: '7', quantity: 1 }, { productId: '22', quantity: 2 },
      { productId: '13', quantity: 1 },
    ],
    preparationSteps: ['Prepare traditional Ven Pongal with rice and dal', 'Make sakkarai pongal with jaggery', 'Prepare aviyal with mixed vegetables', 'Make kootu with mixed greens'],
  },
  {
    id: 'pack_diwali', name: 'Diwali Snacks Pack',
    image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=400&q=80',
    description: 'Fresh vegetables for Diwali snacks and sweets preparation',
    color: '#FCE4EC', tag: 'Festive', serves: '8-10 people', price: 220,
    items: [
      { productId: '4', quantity: 2 }, { productId: '7', quantity: 1 },
      { productId: '22', quantity: 2 }, { productId: '9', quantity: 1 },
      { productId: '10', quantity: 1 }, { productId: '1', quantity: 1 },
    ],
    preparationSteps: ['Slice onions thin for pakodas', 'Grate vegetables for mixture', 'Cut potatoes for chips', 'Prepare batter with besan'],
  },
  {
    id: 'pack_sunday_brunch', name: 'Sunday Brunch Pack',
    image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3VuZGF5JTIwYnJ1bmNofGVufDB8fDB8fHww',
    description: 'Perfect mix of fresh produce for a relaxing Sunday brunch',
    color: '#E8EAF6', tag: 'Weekend', serves: '4-5 people', price: 160,
    items: [
      { productId: '1', quantity: 1 }, { productId: '4', quantity: 1 },
      { productId: '2', quantity: 1 }, { productId: '3', quantity: 1 },
      { productId: '5', quantity: 1 },
    ],
    preparationSteps: ['Make fresh juice with fruits', 'Prepare veggie omelette filling', 'Toss a quick salad', 'Make smoothie bowls'],
  },
  {
    id: 'pack_navratri', name: 'Navratri Fasting Pack',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
    description: 'Sattvic vegetables suitable for Navratri fasting',
    color: '#F3E5F5', tag: 'Fasting', serves: '3-4 people', price: 140,
    items: [
      { productId: '22', quantity: 2 }, { productId: '1', quantity: 1 },
      { productId: '9', quantity: 1 }, { productId: '2', quantity: 1 },
    ],
    preparationSteps: ['Make aloo sabzi without onion-garlic', 'Prepare fruit chaat', 'Cook sabudana khichdi', 'Make cucumber raita'],
  },
];
