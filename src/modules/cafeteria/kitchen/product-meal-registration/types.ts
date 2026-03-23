export interface Meal {
  id: number;
  name: string;
  description?: string;
  image?: string;
  serving: number;
  cost_per_serving: number;
  category_id?: number;
  created_by?: number;
  created_at: string;
  updated_by?: number;
  updated_at?: string;
  deleted_by?: number;
  deleted_at?: string;
}

export interface MealCategory {
  id: number;
  name: string;
  // add other fields if needed
}

export interface Ingredient {
  id: number;
  name: string;
  unit?: string;
  measurement_unit?: string;
  measure?: string;
  [key: string]: unknown; // Allow additional fields from API
}

export interface MealIngredient {
  id: number;
  meal_id: number;
  ingredient_id: number;
  quantity: number;
  created_by?: number;
  created_at: string;
  updated_by?: number;
  updated_at?: string;
  deleted_by?: number;
  deleted_at?: string;
}

export interface MealWithIngredients extends Meal {
  ingredients: (MealIngredient & { ingredient: Ingredient })[];
  category?: MealCategory;
}

export interface CreateMealRequest {
  name: string;
  description?: string;
  image?: File | string;
  serving: number;
  cost_per_serving: number;
  category_id?: number;
  ingredients: {
    ingredient_id: number;
    quantity: number;
  }[];
}

export interface UpdateMealRequest extends Partial<CreateMealRequest> {
  id: number;
}