// ─── Meal types ───────────────────────────────────────────────────────────────

export type MealType = "Breakfast" | "Lunch" | "Snack";
export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Snack"];

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// ─── Ingredient breakdown inside a meal ──────────────────────────────────────

export interface MealIngredient {
  ingredient_id: number;
  ingredient_name: string | null;
  quantity_per_serving: number;
  unit_name: string | null;
}

// ─── A product meal row from the API ─────────────────────────────────────────

export interface Meal {
  id: number;
  name: string;
  description?: string | null;
  category_id: number | null;
  category_name: string | null;
  meal_type: MealType | null;
  serving_size: number;
  ingredients: MealIngredient[];
}

// ─── A meal group (one per category in the palette panel) ────────────────────

export interface MealCategory {
  id: number | null;
  name: string;
  meals: Meal[];
}

// ─── An entry placed on the schedule calendar ────────────────────────────────
// uid is a client-side unique ID so React can key and remove individual entries

export interface ScheduleEntry {
  uid: string;
  meal: Meal;
  quantity: number;
}

// ─── The full weekly schedule: [day][mealType] = list of entries ─────────────

export type DaySchedule = Record<MealType, ScheduleEntry[]>;
export type WeeklySchedule = Record<DayOfWeek, DaySchedule>;

// ─── Submit payload sent to POST /api/… ──────────────────────────────────────

export interface ScheduleSubmitItem {
  schedule_date: string; // YYYY-MM-DD
  meal_type: MealType;
  meal_id: number;
  quantity: number;
  total_servings: number;
  user_id: number;
}

export interface PoItem {
  ingredient_id: number;
  ingredient_name: string | null;
  required_quantity: number;
  estimated_cost: number;
}

export interface MealScheduleSubmitPayload {
  week_start: string; // YYYY-MM-DD (Monday)
  schedules: ScheduleSubmitItem[];
  po_items: PoItem[];
  total_estimated_cost: number;
  created_by: number | null;
}
