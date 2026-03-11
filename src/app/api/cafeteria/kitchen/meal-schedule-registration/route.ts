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

async function parseJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function toList(raw: any): any[] {
  return Array.isArray(raw) ? raw : (raw?.data ?? raw?.content ?? []);
}

// ─── Normalize a raw meal row from Directus into a clean frontend shape ───────
function normalizeMeal(raw: any): any {
  const category =
    typeof raw.category_id === "object" ? raw.category_id : null;

  const ingredients = toList(raw.meal_ingredients ?? []).map((mi: any) => {
    const ing =
      typeof mi.ingredient_id === "object" ? mi.ingredient_id : null;
    return {
      ingredient_id:
        ing?.id ?? (typeof mi.ingredient_id === "number" ? mi.ingredient_id : null),
      ingredient_name: ing?.name ?? mi.ingredient_name ?? null,
      quantity_per_serving: Number(mi.quantity_per_serving ?? 0),
      unit_name: ing?.unit_of_measurement?.unit_name ?? ing?.unit_name ?? mi.unit_name ?? null,
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
    serving_size: Number(raw.serving_size ?? 1),
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
      let decoded: any = null;
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
          const users = Array.isArray(userData)
            ? userData
            : (userData?.data ?? userData?.content ?? []);
          if (users.length > 0 && users[0].user_id) {
            userId = Number(users[0].user_id);
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
      const fields = [
        "*",
        "category_id.*",
        "meal_ingredients.*",
        "meal_ingredients.ingredient_id.*",
        "meal_ingredients.ingredient_id.unit_of_measurement.*",
      ].join(",");

      const upstream = await proxyFetch(
        `${base}/items/meals?fields=${encodeURIComponent(fields)}&filter[deleted_at][_null]=true&limit=-1`,
        { method: "GET", headers }
      );
      const data = await parseJson(upstream);

      if (!upstream.ok) {
        console.error("[meal-schedule-registration GET meals]", upstream.status, data);
        return NextResponse.json(
          { message: data?.errors?.[0]?.message ?? data?.message ?? "Failed to fetch meals." },
          { status: upstream.status }
        );
      }

      const list = toList(data).map(normalizeMeal);
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
        return NextResponse.json(
          { message: data?.errors?.[0]?.message ?? data?.message ?? "Failed to fetch schedules." },
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
      return NextResponse.json(
        { message: data?.errors?.[0]?.message ?? data?.message ?? "Failed to fetch schedules." },
        { status: upstream.status }
      );
    }

    return NextResponse.json(toList(data), { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    console.error("[meal-schedule-registration GET]", err?.message);
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
    const scheduleResults: any[] = [];
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
        return NextResponse.json(
          { message: data?.errors?.[0]?.message ?? data?.message ?? "Failed to create meal schedule." },
          { status: res.status }
        );
      }
      scheduleResults.push(data?.data ?? data);
    }

    // ── 2. Create the Purchase Order header ───────────────────────────────────
    const monDate = new Date(week_start ?? schedules[0]?.schedule_date);
    const satDate = new Date(monDate);
    satDate.setDate(satDate.getDate() + 5);
    const toISO = (d: Date) => d.toISOString().split("T")[0];

    const poPayload = {
      date_from: toISO(monDate),
      date_to: toISO(satDate),
      total_estimated_cost: Number(total_estimated_cost).toFixed(4),
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
      return NextResponse.json(
        { message: poData?.errors?.[0]?.message ?? poData?.message ?? "Failed to create purchase order." },
        { status: poRes.status }
      );
    }
    const purchaseOrderId = (poData?.data ?? poData)?.id;

    // ── 3. Create PO items (ingredients) ─────────────────────────────────────
    if (purchaseOrderId && po_items.length > 0) {
      for (const item of po_items) {
        const itemPayload = {
          purchase_order_id: purchaseOrderId,
          ingredient_id: item.ingredient_id,
          required_quantity: Number(item.required_quantity).toFixed(4),
          estimated_cost: Number(item.estimated_cost).toFixed(4),
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
  } catch (err: any) {
    console.error("[meal-schedule-registration POST]", err?.message);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}
