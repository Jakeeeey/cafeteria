// src/app/api/cafeteria/kitchen/meal-purchase-order-approval/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 15_000;
const COOKIE_NAME = "vos_access_token";

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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const p = parts[1];
        const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    } catch {
        return null;
    }
}

async function resolveUserId(req: NextRequest, base: string, headers: Record<string, string>): Promise<number> {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const decoded = token ? decodeJwtPayload(token) : null;
    let userId = Number(decoded?.id || decoded?.userId || decoded?.user_id || decoded?.employee_id);

    if (!userId || isNaN(userId)) {
        try {
            const email: string =
                (typeof decoded?.email === "string" && decoded.email.trim()) ||
                (typeof decoded?.Email === "string" && decoded.Email.trim()) ||
                (typeof decoded?.sub === "string" && decoded.sub.trim()) ||
                "";
            let userQuery = `${base}/items/user?fields=user_id&limit=1`;
            if (email) userQuery += `&filter[user_email][_eq]=${encodeURIComponent(email)}`;
            const userRes = await proxyFetch(userQuery, { method: "GET", headers });
            const userData = await parseJson(userRes);
            const userDataObj = userData as { data?: unknown[]; content?: unknown[] };
            const users = Array.isArray(userData) ? userData : (userDataObj?.data ?? userDataObj?.content ?? []);
            const firstUser = users[0] as Record<string, unknown> | undefined;
            if (users.length > 0 && firstUser?.user_id) userId = Number(firstUser.user_id);
        } catch {
            // ignore
        }
    }

    return !userId || isNaN(userId) ? 0 : userId;
}

// ─── Normalize a purchase order row ──────────────────────────────────────────
function normalizePurchaseOrder(
    raw: Record<string, unknown>,
    mealNames: string[] = [],
    mealCategories: string[] = []
): Record<string, unknown> {
    return {
        id: raw.id,
        date_from: raw.date_from,
        date_to: raw.date_to,
        total_estimated_cost: Number(raw.total_estimated_cost ?? 0),
        status: raw.status ?? "Pending",
        created_at: raw.created_at,
        created_by: raw.created_by ?? null,
        meal_names: mealNames,
        meal_categories: mealCategories,
    };
}

// ─── Normalize a purchase order item row ─────────────────────────────────────
function normalizePurchaseOrderItem(raw: Record<string, unknown>): Record<string, unknown> {
    const ing = typeof raw.ingredient_id === "object" && raw.ingredient_id !== null ? raw.ingredient_id as Record<string, unknown> : null;
    const unit =
        ing && typeof ing.unit_of_measurement === "object" && ing.unit_of_measurement !== null ? ing.unit_of_measurement as Record<string, unknown> : null;

    return {
        id: raw.id,
        purchase_order_id: raw.purchase_order_id,
        ingredient_id: ing?.id ?? (typeof raw.ingredient_id === "number" ? raw.ingredient_id : null),
        ingredient_name: ing?.name ?? "Unknown",
        unit_name: unit?.unit_name ?? unit?.name ?? null,
        unit_abbreviation: unit?.abbreviation ?? null,
        required_quantity: Number(raw.required_quantity ?? 0),
        estimated_cost: Number(raw.estimated_cost ?? 0),
    };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
//
//  ?id=X  → fetch items for a specific purchase order
//  (no params) → fetch all pending purchase orders
//
export async function GET(req: NextRequest) {
    try {
        const headers = authHeaders();
        const base = baseUrl();
        const sp = req.nextUrl.searchParams;
        const idParam = sp.get("id");

        // ── Option A: fetch items for a specific PO ──────────────────────────
        if (idParam) {
            const poId = Number(idParam);
            if (!poId || isNaN(poId)) {
                return NextResponse.json({ message: "Invalid purchase order id." }, { status: 400 });
            }

            // ── view=schedules → return schedule grid entries ─────────────────
            if (sp.get("view") === "schedules") {
                const scheduleFields = [
                    "id",
                    "schedule_id.schedule_date",
                    "schedule_id.meal_type",
                    "schedule_id.quantity",
                    "schedule_id.total_servings",
                    "schedule_id.meal_id.name",
                ].join(",");

                const upstream = await proxyFetch(
                    `${base}/items/meal_purchase_order_schedules?fields=${encodeURIComponent(scheduleFields)}&filter[purchase_order_id][_eq]=${poId}&limit=-1`,
                    { method: "GET", headers }
                );
                const data = await parseJson(upstream);

                if (!upstream.ok) {
                    console.error("[meal-purchase-order-approval GET schedules]", upstream.status, data);
                    const errorData = data as { errors?: Array<{ message?: string }>; message?: string };
                    return NextResponse.json(
                        { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch schedule entries." },
                        { status: upstream.status }
                    );
                }

                const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const list = toList(data).map((raw: unknown) => {
                    const rawRecord = raw as Record<string, unknown>;
                    const s = typeof rawRecord.schedule_id === "object" && rawRecord.schedule_id !== null ? rawRecord.schedule_id as Record<string, unknown> : null;
                    const meal = s && typeof s.meal_id === "object" && s.meal_id !== null ? s.meal_id as Record<string, unknown> : null;
                    const scheduleDate: string = (typeof s?.schedule_date === "string" ? s.schedule_date : "") ?? "";
                    let dayOfWeek = "";
                    if (scheduleDate) {
                        const d = new Date(scheduleDate);
                        dayOfWeek = DAY_NAMES[d.getUTCDay()] ?? "";
                    }
                    return {
                        id: rawRecord.id,
                        schedule_date: scheduleDate,
                        day_of_week: dayOfWeek,
                        meal_type: s?.meal_type ?? "Breakfast",
                        meal_name: meal?.name ?? "Unknown",
                        quantity: Number(s?.quantity ?? 1),
                        total_servings: Number(s?.total_servings ?? 0),
                    };
                });

                return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
            }

            // ── default: return ingredient items ──────────────────────────────
            const fields = [
                "*",
                "ingredient_id.*",
                "ingredient_id.unit_of_measurement.*",
            ].join(",");

            const upstream = await proxyFetch(
                `${base}/items/meal_purchase_order_items?fields=${encodeURIComponent(fields)}&filter[purchase_order_id][_eq]=${poId}&filter[deleted_at][_null]=true&limit=-1`,
                { method: "GET", headers }
            );
            const data = await parseJson(upstream);

            if (!upstream.ok) {
                console.error("[meal-purchase-order-approval GET items]", upstream.status, data);
                const errorData = data as { errors?: Array<{ message?: string }>; message?: string };
                return NextResponse.json(
                    { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch purchase order items." },
                    { status: upstream.status }
                );
            }

            const list = toList(data).map(item => normalizePurchaseOrderItem(item as Record<string, unknown>));
            return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
        }

        // ── Default: list all non-deleted purchase orders ─────────────────────
        const upstream = await proxyFetch(
            `${base}/items/meal_purchase_orders?filter[deleted_at][_null]=true&sort=-created_at&limit=-1`,
            { method: "GET", headers }
        );
        const data = await parseJson(upstream);

        if (!upstream.ok) {
            console.error("[meal-purchase-order-approval GET]", upstream.status, data);
            const errorData = data as { errors?: Array<{ message?: string }>; message?: string };
            return NextResponse.json(
                { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch purchase orders." },
                { status: upstream.status }
            );
        }

        const rawPOs = toList(data);
        if (rawPOs.length === 0) {
            return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
        }

        // ── Fetch meal info via junction → schedules → meals → category ─────
        const poIds = toList(data).map((po: unknown) => (po as Record<string, unknown>).id).join(",");
        const scheduleFields = [
            "purchase_order_id",
            "schedule_id.meal_id.name",
            "schedule_id.meal_id.category_id.name",
        ].join(",");
        const schedulesRes = await proxyFetch(
            `${base}/items/meal_purchase_order_schedules?fields=${encodeURIComponent(scheduleFields)}&filter[purchase_order_id][_in]=${poIds}&limit=-1`,
            { method: "GET", headers }
        );
        const schedulesData = await parseJson(schedulesRes);
        const rawSchedules = schedulesRes.ok ? toList(schedulesData) : [];

        // Build map: poId → { names, categories }
        const mealsByPO = new Map<number, { names: Set<string>; categories: Set<string> }>();
        for (const s of rawSchedules) {
            const sRecord = s as Record<string, unknown>;
            const poId = Number(
                typeof sRecord.purchase_order_id === "object" && sRecord.purchase_order_id !== null
                    ? (sRecord.purchase_order_id as Record<string, unknown>)?.id
                    : sRecord.purchase_order_id
            );
            const scheduleObj = typeof sRecord.schedule_id === "object" && sRecord.schedule_id !== null ? sRecord.schedule_id as Record<string, unknown> : null;
            const mealObj = scheduleObj && typeof scheduleObj.meal_id === "object" && scheduleObj.meal_id !== null ? scheduleObj.meal_id as Record<string, unknown> : null;
            const mealName: string | null = typeof mealObj?.name === "string" ? mealObj.name : null;
            const categoryObj = mealObj && typeof mealObj.category_id === "object" && mealObj.category_id !== null ? mealObj.category_id as Record<string, unknown> : null;
            const categoryName: string | null = typeof categoryObj?.name === "string" ? categoryObj.name : null;

            if (!mealsByPO.has(poId)) mealsByPO.set(poId, { names: new Set(), categories: new Set() });
            if (mealName) mealsByPO.get(poId)!.names.add(mealName);
            if (categoryName) mealsByPO.get(poId)!.categories.add(categoryName);
        }

        const list = rawPOs.map((raw: unknown) => {
            const rawRecord = raw as Record<string, unknown>;
            const info = mealsByPO.get(rawRecord.id as number);
            return normalizePurchaseOrder(
                rawRecord,
                info ? Array.from(info.names) : [],
                info ? Array.from(info.categories) : []
            );
        });

        return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
    } catch (err: unknown) {
        console.error("[meal-purchase-order-approval GET]", err instanceof Error ? err.message : err);
        return NextResponse.json(
            { message: "Server error. Please contact Administrator." },
            { status: 500 }
        );
    }
}

// ─── PATCH – approve or reject (cancel) a purchase order ─────────────────────
// Body: { id: number, action: "approved" | "cancelled" }
export async function PATCH(req: NextRequest) {
    try {
        const headers = authHeaders();
        const base = baseUrl();

        const body = await req.json().catch(() => null);
        if (!body || !body.id || !body.action) {
            return NextResponse.json(
                { message: "Invalid request body. \"id\" and \"action\" are required." },
                { status: 400 }
            );
        }

        const { id, action } = body as { id: number; action: "approved" | "cancelled" };

        if (action !== "approved" && action !== "cancelled") {
            return NextResponse.json(
                { message: "\"action\" must be \"approved\" or \"cancelled\"." },
                { status: 400 }
            );
        }

        // Map action to database status value
        const statusValue = action === "approved" ? "Approved" : "Cancelled";

        const updated_by = await resolveUserId(req, base, headers);

        const patchPayload: Record<string, unknown> = {
            status: statusValue,
            updated_at: new Date().toISOString().replace("T", " ").substring(0, 19),
        };
        if (updated_by) patchPayload.updated_by = updated_by;

        const patchRes = await proxyFetch(`${base}/items/meal_purchase_orders/${id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(patchPayload),
        });
        const patchData = await parseJson(patchRes);

        if (!patchRes.ok) {
            console.error("[meal-purchase-order-approval PATCH]", patchRes.status, patchData);
            const errorData = patchData as { errors?: Array<{ message?: string }>; message?: string };
            return NextResponse.json(
                { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to update purchase order." },
                { status: patchRes.status }
            );
        }

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err: unknown) {
        console.error("[meal-purchase-order-approval PATCH]", err instanceof Error ? err.message : err);
        return NextResponse.json(
            { message: "Server error. Please contact Administrator." },
            { status: 500 }
        );
    }
}
