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

export async function fetchWeekSchedules(weekStart: string): Promise<unknown[]> {
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

interface PurchaseOrderLite {
  id: number;
  status?: string;
}

interface PurchaseOrderScheduleRow {
  schedule_date?: string;
  meal_type?: string;
  meal_name?: string;
}

const APPROVED_STATUSES = new Set(["approved", "ordered", "received"]);
const CANCELLED_STATUSES = new Set(["cancelled"]);
const REJECTED_STATUSES = new Set(["rejected"]);

const DUPLICATE_INDEX_TTL_MS = 30_000;

let duplicateStatusIndexCache: {
  expiresAt: number;
  index: Map<string, Set<string>>;
} | null = null;

let duplicateStatusIndexInFlight: Promise<Map<string, Set<string>>> | null = null;

function normalizeDateOnly(dateLike: string): string {
  return dateLike.split("T")[0].trim();
}

function toScheduleKey(date: string, mealType: string, mealName: string): string {
  return `${normalizeDateOnly(date)}|${mealType.trim().toLowerCase()}|${mealName.trim().toLowerCase()}`;
}

async function buildDuplicateStatusIndex(): Promise<Map<string, Set<string>>> {
  const poRes = await fetch("/api/cafeteria/kitchen/meal-purchase-order-approval", {
    cache: "no-store",
  });
  if (!poRes.ok) {
    throw new Error("Failed to check existing purchase orders");
  }

  const purchaseOrdersRaw = await poRes.json();
  const purchaseOrders: PurchaseOrderLite[] = Array.isArray(purchaseOrdersRaw)
    ? purchaseOrdersRaw
    : (purchaseOrdersRaw?.data ?? purchaseOrdersRaw?.content ?? []);

  const index = new Map<string, Set<string>>();

  const scheduleResponses = await Promise.allSettled(
    purchaseOrders.map(async (po) => {
      const res = await fetch(
        `/api/cafeteria/kitchen/meal-purchase-order-approval?id=${po.id}&view=schedules`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;

      const rows = await res.json();
      const schedules: PurchaseOrderScheduleRow[] = Array.isArray(rows)
        ? rows
        : (rows?.data ?? rows?.content ?? []);

      return {
        status: String(po.status ?? "").trim().toLowerCase(),
        schedules,
      };
    })
  );

  for (const result of scheduleResponses) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const { status, schedules } = result.value;

    for (const row of schedules) {
      if (!row.schedule_date || !row.meal_type || !row.meal_name) continue;

      const key = toScheduleKey(row.schedule_date, row.meal_type, row.meal_name);
      const existing = index.get(key) ?? new Set<string>();
      existing.add(status);
      index.set(key, existing);
    }
  }

  return index;
}

async function getDuplicateStatusIndex(): Promise<Map<string, Set<string>>> {
  const now = Date.now();
  if (duplicateStatusIndexCache && duplicateStatusIndexCache.expiresAt > now) {
    return duplicateStatusIndexCache.index;
  }

  if (!duplicateStatusIndexInFlight) {
    duplicateStatusIndexInFlight = buildDuplicateStatusIndex()
      .then((index) => {
        duplicateStatusIndexCache = {
          index,
          expiresAt: Date.now() + DUPLICATE_INDEX_TTL_MS,
        };
        return index;
      })
      .finally(() => {
        duplicateStatusIndexInFlight = null;
      });
  }

  return duplicateStatusIndexInFlight;
}

export function invalidateDuplicateMealsCache(): void {
  duplicateStatusIndexCache = null;
}

export async function checkDuplicateMeals(
  scheduledMeals: ScheduledMeal[]
): Promise<DuplicateCheckResult> {
  const approved: ScheduledMeal[] = [];
  const cancelled: ScheduledMeal[] = [];
  const rejected: ScheduledMeal[] = [];

  if (scheduledMeals.length === 0) {
    return { approved, cancelled, rejected };
  }

  const statusIndex = await getDuplicateStatusIndex();
  const seen = new Set<string>();

  for (const scheduled of scheduledMeals) {
    const key = toScheduleKey(scheduled.date, scheduled.mealType, scheduled.mealName);
    if (seen.has(key)) continue;
    seen.add(key);

    const statuses = statusIndex.get(key);
    if (!statuses || statuses.size === 0) continue;

    if (Array.from(statuses).some((s) => APPROVED_STATUSES.has(s))) {
      approved.push(scheduled);
      continue;
    }

    if (Array.from(statuses).some((s) => CANCELLED_STATUSES.has(s))) {
      cancelled.push(scheduled);
      continue;
    }

    if (Array.from(statuses).some((s) => REJECTED_STATUSES.has(s))) {
      rejected.push(scheduled);
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
  invalidateDuplicateMealsCache();
  return res.json();
}
