import type { Meal, MealScheduleSubmitPayload } from "../types";

const BASE = "/api/cafeteria/kitchen/meal-schedule-registration";

// ─── Fetch all product meals (catalogue) ─────────────────────────────────────

export async function fetchMeals(): Promise<Meal[]> {
  const res = await fetch(`${BASE}?meals=true`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch meals (${res.status})`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : (json.data ?? json.content ?? []);
}

// ─── Fetch existing schedules for a week ────────────────────────────────────

export async function fetchWeekSchedules(weekStart: string): Promise<any[]> {
  const res = await fetch(`${BASE}?week=${weekStart}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch week schedules (${res.status})`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : (json.data ?? json.content ?? []);
}

// ─── Get the current logged-in user_id from the server (reads HttpOnly JWT) ──

export async function fetchCurrentUserId(): Promise<number | null> {
  const res = await fetch(`${BASE}?me=true`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  const raw = json.user_id;
  if (typeof raw === "number" && !isNaN(raw)) return raw;
  if (typeof raw === "string") {
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

// ─── Submit the weekly schedule + generate purchase order ─────────────────────

// ─── Check for duplicate meals on specific dates ─────────────────────────────

interface ScheduledMeal {
  date: string;
  mealType: string;
  mealName: string;
}

interface DuplicateCheckResult {
  approved: ScheduledMeal[];
  cancelled: ScheduledMeal[];
  rejected: ScheduledMeal[];
}

export async function checkDuplicateMeals(
  scheduledMeals: ScheduledMeal[]
): Promise<DuplicateCheckResult> {
  // Fetch all purchase orders
  const poRes = await fetch(
    "/api/cafeteria/kitchen/meal-purchase-order-approval",
    { cache: "no-store" }
  );
  if (!poRes.ok) {
    throw new Error("Failed to check existing purchase orders");
  }
  const purchaseOrders = await poRes.json();

  const approved: ScheduledMeal[] = [];
  const cancelled: ScheduledMeal[] = [];
  const rejected: ScheduledMeal[] = [];

  // For each purchase order, fetch its schedules
  for (const po of purchaseOrders) {
    try {
      const schedulesRes = await fetch(
        `/api/cafeteria/kitchen/meal-purchase-order-approval?id=${po.id}&view=schedules`,
        { cache: "no-store" }
      );

      if (!schedulesRes.ok) continue;

      const schedules = await schedulesRes.json();
      const scheduleArray = Array.isArray(schedules) ? schedules : [];

      // Check each scheduled meal against existing schedules
      for (const scheduled of scheduledMeals) {
        for (const existing of scheduleArray) {
          // Normalize dates for comparison (YYYY-MM-DD format)
          const scheduledDate = scheduled.date.split('T')[0];
          const existingDate = existing.schedule_date.split('T')[0];

          // Check if it's the same meal on the same date and meal type
          if (
            scheduledDate === existingDate &&
            scheduled.mealType.toLowerCase() === existing.meal_type.toLowerCase() &&
            scheduled.mealName.toLowerCase() === existing.meal_name.toLowerCase()
          ) {
            // Found a duplicate! Categorize by purchase order status
            if (po.status === "Approved" || po.status === "Ordered" || po.status === "Received") {
              if (!approved.some(m =>
                m.date === scheduled.date &&
                m.mealType === scheduled.mealType &&
                m.mealName === scheduled.mealName
              )) {
                approved.push(scheduled);
              }
            } else if (po.status === "Cancelled") {
              // Only add to cancelled if not already in approved
              if (!approved.some(m =>
                m.date === scheduled.date &&
                m.mealType === scheduled.mealType &&
                m.mealName === scheduled.mealName
              ) && !cancelled.some(m =>
                m.date === scheduled.date &&
                m.mealType === scheduled.mealType &&
                m.mealName === scheduled.mealName
              )) {
                cancelled.push(scheduled);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch schedules for PO ${po.id}:`, error);
      continue;
    }
  }

  return { approved, cancelled, rejected };
}

export async function submitSchedule(
  payload: MealScheduleSubmitPayload
): Promise<{ purchase_order_id: number | null; schedules_created: number }> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      json.message ?? `Failed to submit schedule (${res.status})`
    );
  }
  return res.json();
}
