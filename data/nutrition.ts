// Nutrition data mapped by product ID
export const NUTRITION_DATA: Record<string, {
  calories: number; protein: number; carbs: number; fiber: number; fat: number;
  vitamins?: string[]; minerals?: string[]; allergens?: { name: string; severity: 'low' | 'medium' | 'high' }[];
}> = {
  '1': { calories: 18, protein: 0.9, carbs: 3.9, fiber: 1.2, fat: 0.2, vitamins: ['Vitamin C', 'Vitamin K', 'Vitamin A'], minerals: ['Potassium'] },
  '4': { calories: 40, protein: 1.1, carbs: 9.3, fiber: 1.7, fat: 0.1, vitamins: ['Vitamin C', 'Vitamin B6'], minerals: ['Manganese', 'Potassium'] },
  '7': { calories: 25, protein: 1.0, carbs: 6.0, fiber: 2.6, fat: 0.1, vitamins: ['Vitamin A', 'Vitamin K'], minerals: ['Potassium'] },
  '13': { calories: 31, protein: 2.6, carbs: 6.0, fiber: 2.4, fat: 0.3, vitamins: ['Vitamin C', 'Vitamin K'], minerals: ['Iron', 'Calcium'] },
  '19': { calories: 23, protein: 2.9, carbs: 3.6, fiber: 2.2, fat: 0.4, vitamins: ['Vitamin C', 'Vitamin A', 'Vitamin K'], minerals: ['Iron', 'Calcium'] },
  '21': { calories: 15, protein: 1.2, carbs: 2.2, fiber: 1.0, fat: 0.2, vitamins: ['Vitamin A', 'Vitamin C'], minerals: ['Potassium', 'Iron'] },
  '22': { calories: 41, protein: 0.9, carbs: 10, fiber: 2.8, fat: 0.1, vitamins: ['Vitamin A', 'Vitamin C'], minerals: ['Potassium', 'Manganese'] },
  '32': { calories: 47, protein: 3.3, carbs: 8.2, fiber: 2.2, fat: 0.6, vitamins: ['Vitamin C', 'Vitamin B1'], minerals: ['Manganese', 'Copper'] },
  '2': { calories: 89, protein: 1.1, carbs: 22.8, fiber: 2.6, fat: 0.3, vitamins: ['Vitamin B6', 'Vitamin C'], minerals: ['Potassium', 'Manganese'] },
  '3': { calories: 52, protein: 0.3, carbs: 13.8, fiber: 2.4, fat: 0.2, vitamins: ['Vitamin C'], minerals: ['Potassium'] },
  '5': { calories: 47, protein: 0.9, carbs: 11.8, fiber: 0.2, fat: 0.1, vitamins: ['Vitamin C'], minerals: ['Potassium'] },
  '6': { calories: 60, protein: 0.8, carbs: 15.2, fiber: 3.1, fat: 0.4, vitamins: ['Vitamin A', 'Vitamin C'], minerals: ['Potassium'] },
  '8': { calories: 34, protein: 0.7, carbs: 8.6, fiber: 1.5, fat: 0.1, vitamins: ['Vitamin A', 'Vitamin C'], minerals: ['Potassium', 'Manganese'] },
  '9': { calories: 16, protein: 0.7, carbs: 3.4, fiber: 1.6, fat: 0.1, vitamins: ['Vitamin K', 'Vitamin C'], minerals: ['Potassium'] },
  '10': { calories: 20, protein: 0.7, carbs: 4.6, fiber: 0.5, fat: 0.1, vitamins: ['Vitamin C', 'Vitamin B6'], minerals: ['Molybdenum'] },
};

// Per 100g values for common vegetables/fruits
export const DEFAULT_NUTRITION = { calories: 25, protein: 1.0, carbs: 5.0, fiber: 2.0, fat: 0.2, vitamins: ['Vitamin C'], minerals: ['Potassium'] };
