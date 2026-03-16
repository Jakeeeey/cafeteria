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
