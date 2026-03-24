import type {
  DayOfWeek,
  DaySchedule,
  Meal,
  MealCategory,
  MealIngredient,
  MealType,
  PoItem,
  ScheduleEntry,
  ScheduleSubmitItem,
  WeeklySchedule,
} from "../types";
import { DAYS_OF_WEEK, MEAL_TYPES } from "../types";

// ─── Week navigation ──────────────────────────────────────────────────────────

/** Returns the Monday of the week that contains `date`. */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, …
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Shift a week forward (+1) or backward (-1). */
export function shiftWeek(monday: Date, direction: 1 | -1): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + direction * 7);
  return d;
}

/** Format a Date as YYYY-MM-DD in local time. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Given the Monday of a week, return all 6 dates (Mon–Sat) as YYYY-MM-DD. */
export function getWeekDates(monday: Date): Record<DayOfWeek, string> {
  const dates = {} as Record<DayOfWeek, string>;
  DAYS_OF_WEEK.forEach((day, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dates[day] = toISODate(d);
  });
  return dates;
}

/** Format a date range for display, e.g. "Mar 10 – 15, 2026". */
export function formatWeekRange(monday: Date): string {
  const saturday = new Date(monday);
  saturday.setDate(saturday.getDate() + 5);

  const fmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });
  const yearFmt = new Intl.DateTimeFormat("en-PH", { year: "numeric" });

  return `${fmt.format(monday)} – ${fmt.format(saturday)}, ${yearFmt.format(saturday)}`;
}

// ─── Empty schedule skeleton ─────────────────────────────────────────────────

export function buildEmptyWeeklySchedule(): WeeklySchedule {
  const schedule = {} as WeeklySchedule;
  for (const day of DAYS_OF_WEEK) {
    const daySchedule = {} as DaySchedule;
    for (const mt of MEAL_TYPES) {
      daySchedule[mt] = [];
    }
    schedule[day] = daySchedule;
  }
  return schedule;
}

// ─── Meal grouping ─────────────────────────────────────────────────────────────

export function groupMealsByCategory(meals: Meal[]): MealCategory[] {
  const map = new Map<string, MealCategory>();

  for (const meal of meals) {
    const key = meal.category_name ?? "Uncategorized";
    if (!map.has(key)) {
      map.set(key, {
        id: meal.category_id,
        name: key,
        meals: [],
      });
    }
    map.get(key)!.meals.push(meal);
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── UID for schedule entries ─────────────────────────────────────────────────

let _uid = 0;
export function generateUid(): string {
  return `se-${Date.now()}-${++_uid}`;
}

// ─── Build submit payload ─────────────────────────────────────────────────────

export function buildSubmitPayload(
  schedule: WeeklySchedule,
  weekDates: Record<DayOfWeek, string>,
  userId: number
): {
  scheduleItems: ScheduleSubmitItem[];
  poItems: PoItem[];
  totalEstimatedCost: number;
} {
  const scheduleItems: ScheduleSubmitItem[] = [];
  const ingredientMap = new Map<number, PoItem>();

  for (const day of DAYS_OF_WEEK) {
    for (const mt of MEAL_TYPES) {
      const entries: ScheduleEntry[] = schedule[day][mt];
      for (const entry of entries) {
        const totalServings = entry.quantity * entry.meal.serving_size;

        scheduleItems.push({
          schedule_date: weekDates[day],
          meal_type: mt,
          meal_id: entry.meal.id,
          quantity: entry.quantity,
          total_servings: totalServings,
          user_id: userId,
        });

        for (const ing of entry.meal.ingredients) {
          // required qty = ingredient quantity per preparation × number of preparations
          const needed = ing.quantity_per_serving * entry.quantity;
          const existing = ingredientMap.get(ing.ingredient_id);
          if (existing) {
            existing.required_quantity += needed;
            existing.estimated_cost += ing.cost_per_unit * needed;
          } else {
            ingredientMap.set(ing.ingredient_id, {
              ingredient_id: ing.ingredient_id,
              ingredient_name: ing.ingredient_name,
              required_quantity: needed,
              estimated_cost: ing.cost_per_unit * needed,
            });
          }
        }
      }
    }
  }

  const poItems = Array.from(ingredientMap.values());
  const totalEstimatedCost = poItems.reduce((sum, i) => sum + i.estimated_cost, 0);

  return { scheduleItems, poItems, totalEstimatedCost };
}

// ─── Count total scheduled entries ───────────────────────────────────────────

export function countScheduleEntries(schedule: WeeklySchedule): number {
  let count = 0;
  for (const day of DAYS_OF_WEEK) {
    for (const mt of MEAL_TYPES) {
      count += schedule[day][mt].length;
    }
  }
  return count;
}

// ─── Aggregate ingredient totals across the whole schedule ───────────────────

export interface AggregatedIngredient {
  ingredient_id: number;
  ingredient_name: string | null;
  unit_name: string | null;
  total_quantity: number;
}

export function aggregateIngredients(schedule: WeeklySchedule): AggregatedIngredient[] {
  const map = new Map<number, AggregatedIngredient>();

  for (const day of DAYS_OF_WEEK) {
    for (const mt of MEAL_TYPES) {
      for (const entry of schedule[day][mt]) {
        for (const ing of entry.meal.ingredients) {
          const needed = ing.quantity_per_serving * entry.quantity;
          const existing = map.get(ing.ingredient_id);
          if (existing) {
            existing.total_quantity += needed;
          } else {
            map.set(ing.ingredient_id, {
              ingredient_id: ing.ingredient_id,
              ingredient_name: ing.ingredient_name,
              unit_name: ing.unit_name,
              total_quantity: needed,
            });
          }
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    (a.ingredient_name ?? "").localeCompare(b.ingredient_name ?? "")
  );
}

// ─── Build a flat review list (day + mealType + meal rows) ───────────────────

export interface ReviewRow {
  day: DayOfWeek;
  meal_type: MealType;
  meal_name: string;
  serving_size: number;
  quantity: number;
  total_servings: number;
  ingredients: MealIngredient[];
}

export function buildReviewRows(schedule: WeeklySchedule): ReviewRow[] {
  const rows: ReviewRow[] = [];
  for (const day of DAYS_OF_WEEK) {
    for (const mt of MEAL_TYPES) {
      for (const entry of schedule[day][mt]) {
        rows.push({
          day,
          meal_type: mt,
          meal_name: entry.meal.name,
          serving_size: entry.meal.serving_size,
          quantity: entry.quantity,
          total_servings: entry.quantity * entry.meal.serving_size,
          ingredients: entry.meal.ingredients,
        });
      }
    }
  }
  return rows;
}
