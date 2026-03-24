// src/app/api/cafeteria/kitchen/meal-schedule-registration/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 15_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  return url.replace(/\/$/, "");
}

function staticToken(): string {
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (!token) throw new Error("DIRECTUS_STATIC_TOKEN is not configured.");
  return token;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${staticToken()}`,
  };
}

async function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function toList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const record = raw as Record<string, unknown>;
  if (Array.isArray(record?.data)) return record.data;
  if (Array.isArray(record?.content)) return record.content;
  return [];
}

type DirectusMealCategory = {
  id?: number;
  name?: string | null;
  unit_of_measurement?: { unit_name?: string | null } | null;
  unit_name?: string | null;
  cost_per_unit?: number | string | null;
  [key: string]: unknown;
};

type DirectusMealRaw = {
  id?: number;
  name?: string;
  description?: string | null;
  category_id?: number | DirectusMealCategory | null;
  meal_type?: string | null;
  serving_size?: number | string | null;
  serving?: number | string | null;
  meal_ingredients?: unknown[];
  [key: string]: unknown;
};

type DirectusUserRecord = {
  user_id?: number | string | null;
  [key: string]: unknown;
};

type DirectusItemMaybeResponse<T> = { data?: T } | T;

function unwrapDirectus<T>(raw: unknown): T {
  const record = raw as DirectusItemMaybeResponse<T> | null | undefined;
  if (record && typeof record === "object" && (record as { data?: T }).data !== undefined) {
    return (record as { data: T }).data;
  }
  return raw as T;
}

type MealScheduleRecord = { id?: number } & Record<string, unknown>;
type MealPurchaseOrderRecord = { id?: number } & Record<string, unknown>;

// ─── Normalize a raw meal row from Directus into a clean frontend shape ───────
function normalizeMeal(raw: DirectusMealRaw): Record<string, unknown> {
  const category =
    typeof raw.category_id === "object" && raw.category_id !== null ? raw.category_id as Record<string, unknown> : null;

  const ingredients = toList(raw.meal_ingredients ?? []).map((mi: unknown) => {
    const miRecord = mi as Record<string, unknown>;
    const ing =
      typeof miRecord.ingredient_id === "object" && miRecord.ingredient_id !== null ? miRecord.ingredient_id as Record<string, unknown> : null;
    return {
      ingredient_id:
        ing?.id ?? (typeof miRecord.ingredient_id === "number" ? miRecord.ingredient_id : null),
      ingredient_name: ing?.name ?? miRecord.ingredient_name ?? null,
      quantity_per_serving: Number(miRecord.quantity ?? miRecord.quantity_per_serving ?? 0),
      cost_per_unit: Number(ing?.cost_per_unit ?? 0),
      unit_name: (typeof ing?.unit_of_measurement === "object" && ing.unit_of_measurement !== null ? ing.unit_of_measurement as Record<string, unknown> : null)?.unit_name ?? ing?.unit_name ?? miRecord.unit_name ?? null,
    };
  });

  return {
    id: raw.id,
    name: raw.name ?? "",
    description: raw.description ?? null,
    category_id:
      category?.id ??
      (typeof raw.category_id === "number" ? raw.category_id : null),
    category_name: category?.name ?? null,
    meal_type: raw.meal_type ?? null,
    serving_size: Number(raw.serving_size ?? raw.serving ?? 1),
    ingredients,
  };
}

// ─── GET ─────────────────────────────────────────────────────────────────────
//
//  ?meals=true  → fetch all meals with categories + ingredients
//  ?week=YYYY-MM-DD → fetch schedules for a specific week (date = Monday)
//  (no params)  → fetch all meal schedules (not soft-deleted)
//
export async function GET(req: NextRequest) {
  try {
    const headers = authHeaders();
    const base = baseUrl();
    const sp = req.nextUrl.searchParams;

    // ── Return current user_id from the JWT cookie ────────────────────────────
    if (sp.get("me") === "true") {
      const token = req.cookies.get("vos_access_token")?.value ?? null;
      if (!token) {
        return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
      }

      // Decode JWT payload (no verification needed — we just need the claims)
      let decoded: Record<string, unknown> | null = null;
      try {
        const parts = token.split(".");
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
      } catch {
        return NextResponse.json({ message: "Invalid token." }, { status: 401 });
      }

      // Try all common JWT field names for the numeric user ID
      let userId = Number(
        decoded?.user_id || decoded?.userId || decoded?.id || decoded?.employee_id
      );

      if (!userId || isNaN(userId)) {
        // Fallback: look up by email claim in Directus
        const email: string =
          (typeof decoded?.email === "string" && decoded.email.trim()) ||
          (typeof decoded?.Email === "string" && decoded.Email.trim()) ||
          (typeof decoded?.sub === "string" && decoded.sub.trim()) ||
          "";
        try {
          let userQuery = `${base}/items/user?fields=user_id&limit=1`;
          if (email) {
            userQuery += `&filter[user_email][_eq]=${encodeURIComponent(email)}`;
          }
          const userRes = await proxyFetch(userQuery, { method: "GET", headers });
          const userData = await parseJson(userRes);
          const users = toList(userData) as DirectusUserRecord[];
          const firstUser = users[0];
          if (firstUser && firstUser.user_id != null) {
            userId = Number(firstUser.user_id);
          }
        } catch {
          // ignore — we'll return null below
        }
      }

      const finalUserId = userId && !isNaN(userId) ? userId : null;
      console.log("[meal-schedule-registration ?me] decoded keys:", Object.keys(decoded ?? {}), "| resolved user_id:", finalUserId);
      return NextResponse.json({ user_id: finalUserId }, { headers: { "Cache-Control": "no-store" } });
    }

    // ── Option A: fetch meals (the product-meal catalogue) ──────────────────
    if (sp.get("meals") === "true") {
      // Fetch meals and meal_ingredients in parallel.
      // We fetch meal_ingredients separately to avoid relying on Directus O2M
      // relation aliases being configured in the schema builder.
      const [mealsRes, miRes] = await Promise.all([
        proxyFetch(
          `${base}/items/meals?fields=${encodeURIComponent("*,category_id.*")}&filter[deleted_at][_null]=true&limit=-1`,
          { method: "GET", headers }
        ),
        proxyFetch(
          `${base}/items/meal_ingredients?fields=${encodeURIComponent("*,ingredient_id.*,ingredient_id.unit_of_measurement.*")}&filter[deleted_at][_null]=true&limit=-1`,
          { method: "GET", headers }
        ),
      ]);

      const [mealsData, miData] = await Promise.all([parseJson(mealsRes), parseJson(miRes)]);

      if (!mealsRes.ok) {
        console.error("[meal-schedule-registration GET meals]", mealsRes.status, mealsData);
        const errorData = mealsData as { message?: string; errors?: Array<{ message?: string }> };
        return NextResponse.json(
          { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch meals." },
          { status: mealsRes.status }
        );
      }

      // Build a map: meal_id → ingredient rows
      const miList = toList(miData);
      const miByMealId = new Map<number, Record<string, unknown>[]>();
      for (const mi of miList) {
        const miRecord = mi as Record<string, unknown>;
        const mealId = typeof miRecord.meal_id === "object" ? (miRecord.meal_id as Record<string, unknown> | null)?.id as number : Number(miRecord.meal_id);
        if (!mealId) continue;
        if (!miByMealId.has(mealId)) miByMealId.set(mealId, []);
        miByMealId.get(mealId)!.push(miRecord);
      }

      // Inject the ingredients into each meal before normalizing
      const list = toList(mealsData).map((raw: unknown) => {
        const rawRecord = raw as Record<string, unknown>;
        rawRecord.meal_ingredients = miByMealId.get(rawRecord.id as number) ?? [];
        return normalizeMeal(rawRecord);
      });

      return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
    }

    // ── Option B: fetch existing schedules for a given week ─────────────────
    const weekParam = sp.get("week");
    if (weekParam) {
      // weekParam is the Monday date string YYYY-MM-DD; compute Saturday
      const monday = new Date(weekParam);
      const saturday = new Date(monday);
      saturday.setDate(saturday.getDate() + 5);
      const toISO = (d: Date) => d.toISOString().split("T")[0];

      const filter = JSON.stringify({
        _and: [
          { schedule_date: { _gte: toISO(monday) } },
          { schedule_date: { _lte: toISO(saturday) } },
          { deleted_at: { _null: true } },
        ],
      });

      const fields = ["*", "meal_id.*", "meal_id.category_id.*", "meal_id.meal_ingredients.*", "meal_id.meal_ingredients.ingredient_id.*"].join(",");

      const upstream = await proxyFetch(
        `${base}/items/meal_schedules?fields=${encodeURIComponent(fields)}&filter=${encodeURIComponent(filter)}&limit=-1`,
        { method: "GET", headers }
      );
      const data = await parseJson(upstream);

      if (!upstream.ok) {
        console.error("[meal-schedule-registration GET week]", upstream.status, data);
        const errorData = data as { message?: string; errors?: Array<{ message?: string }> };
        return NextResponse.json(
          { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch schedules." },
          { status: upstream.status }
        );
      }

      return NextResponse.json(toList(data), { headers: { "Cache-Control": "no-store" } });
    }

    // ── Default: list all non-deleted schedules ──────────────────────────────
    const upstream = await proxyFetch(
      `${base}/items/meal_schedules?filter[deleted_at][_null]=true&limit=-1`,
      { method: "GET", headers }
    );
    const data = await parseJson(upstream);

    if (!upstream.ok) {
      console.error("[meal-schedule-registration GET]", upstream.status, data);
      const errorData = data as { message?: string; errors?: Array<{ message?: string }> };
      return NextResponse.json(
        { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch schedules." },
        { status: upstream.status }
      );
    }

    return NextResponse.json(toList(data), { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    console.error("[meal-schedule-registration GET]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}

// ─── POST – create meal schedules + purchase order ────────────────────────────
//
// Body:
// {
//   week_start: "YYYY-MM-DD",   ← Monday of the week
//   created_by: number | null,
//   schedules: Array<{
//     schedule_date: "YYYY-MM-DD",
//     meal_type: "Breakfast" | "Lunch" | "Snack",
//     meal_id: number,
//     quantity: number,
//     total_servings: number,
//     user_id: number,          ← who this schedule belongs to
//   }>,
//   po_items: Array<{           ← aggregated ingredient list
//     ingredient_id: number,
//     required_quantity: number,
//     estimated_cost: number,
//   }>,
//   total_estimated_cost: number,
// }
//
export async function POST(req: NextRequest) {
  try {
    const headers = authHeaders();
    const base = baseUrl();

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.schedules) || body.schedules.length === 0) {
      return NextResponse.json(
        { message: "Invalid request body. At least one schedule entry is required." },
        { status: 400 }
      );
    }

    const { week_start, schedules, po_items = [], total_estimated_cost = 0, created_by = null } = body;

    // ── 1. Create all meal_schedules entries ──────────────────────────────────
    const scheduleResults: Record<string, unknown>[] = [];
    for (const s of schedules) {
      const payload = {
        user_id: s.user_id ?? created_by,
        schedule_date: s.schedule_date,
        meal_type: s.meal_type,
        meal_id: s.meal_id,
        quantity: s.quantity,
        total_servings: s.total_servings,
        created_by,
      };
      const res = await proxyFetch(`${base}/items/meal_schedules`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        console.error("[meal-schedule-registration POST schedule]", res.status, data);
        const errorData = data as { message?: string; errors?: Array<{ message?: string }> };
        return NextResponse.json(
          { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to create meal schedule." },
          { status: res.status }
        );
      }
      const createdSchedule = unwrapDirectus<MealScheduleRecord>(data);
      scheduleResults.push(createdSchedule);
    }

    // ── 2. Create the Purchase Order header ───────────────────────────────────
    const monDate = new Date(week_start ?? schedules[0]?.schedule_date);
    const satDate = new Date(monDate);
    satDate.setDate(satDate.getDate() + 5);
    const toISO = (d: Date) => d.toISOString().split("T")[0];

    const poPayload = {
      date_from: toISO(monDate),
      date_to: toISO(satDate),
      total_estimated_cost: parseFloat(Number(total_estimated_cost).toFixed(4)),
      status: "Pending",
      created_by,
    };
    const poRes = await proxyFetch(`${base}/items/meal_purchase_orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(poPayload),
    });
    const poData = await parseJson(poRes);
    if (!poRes.ok) {
      console.error("[meal-schedule-registration POST PO]", poRes.status, poData);
      const errorData = poData as { message?: string; errors?: Array<{ message?: string }> };
      return NextResponse.json(
        { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to create purchase order." },
        { status: poRes.status }
      );
    }
    const poRecord = unwrapDirectus<MealPurchaseOrderRecord>(poData);
    const purchaseOrderId: number | null = (poRecord.id as number | undefined) ?? null;

    // ── 3. Create PO items (ingredients) ─────────────────────────────────────
    if (purchaseOrderId && po_items.length > 0) {
      for (const item of po_items) {
        const itemPayload = {
          purchase_order_id: purchaseOrderId,
          ingredient_id: item.ingredient_id,
          required_quantity: parseFloat(Number(item.required_quantity).toFixed(4)),
          estimated_cost: parseFloat(Number(item.estimated_cost).toFixed(4)),
          created_by,
        };
        const itemRes = await proxyFetch(`${base}/items/meal_purchase_order_items`, {
          method: "POST",
          headers,
          body: JSON.stringify(itemPayload),
        });
        const itemData = await parseJson(itemRes);
        if (!itemRes.ok) {
          console.error("[meal-schedule-registration POST PO item]", itemRes.status, itemData);
          // Non-fatal: log and continue
        }
      }
    }

    // ── 4. Link schedules to the PO ───────────────────────────────────────────
    if (purchaseOrderId) {
      for (const s of scheduleResults) {
        if (!s?.id) continue;
        const linkPayload = {
          purchase_order_id: purchaseOrderId,
          schedule_id: s.id,
        };
        const linkRes = await proxyFetch(`${base}/items/meal_purchase_order_schedules`, {
          method: "POST",
          headers,
          body: JSON.stringify(linkPayload),
        });
        if (!linkRes.ok) {
          const d = await parseJson(linkRes);
          console.error("[meal-schedule-registration POST PO link]", linkRes.status, d);
        }
      }
    }

    return NextResponse.json(
      { ok: true, purchase_order_id: purchaseOrderId, schedules_created: scheduleResults.length },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[meal-schedule-registration POST]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}
