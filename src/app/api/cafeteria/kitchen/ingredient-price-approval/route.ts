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

type DirectusListEnvelope<T> = { data?: T[]; content?: T[] } | null | undefined;

function toList<T = Record<string, unknown>>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    const record = raw as DirectusListEnvelope<T>;
    if (Array.isArray(record?.data)) return record!.data!;
    if (Array.isArray(record?.content)) return record!.content!;
    return [];
}

type DirectusItemEnvelope<T> = { data?: T } | null | undefined;

function unwrapItem<T>(raw: unknown): T {
    const envelope = raw as DirectusItemEnvelope<T> | T;
    if (envelope && typeof envelope === "object") {
        const withData = envelope as DirectusItemEnvelope<T>;
        if (withData && typeof withData === "object" && withData.data !== undefined) {
            return withData.data;
        }
    }
    return raw as T;
}

type DirectusUser = { user_id?: number | string | null } & Record<string, unknown>;

type IngredientPriceRequest = {
    ingredient_id?: number | { id?: number };
    new_cost?: number | string | null;
    status?: string;
} & Record<string, unknown>;

type PurchaseOrderItemRecord = {
    id?: number;
    purchase_order_id?: number | { id?: number };
    required_quantity?: number | string | null;
    estimated_cost?: number | string | null;
} & Record<string, unknown>;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const p = parts[1];
        const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        const json = Buffer.from(padded, "base64").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function pickString(obj: unknown, keys: string[]): string {
    if (!obj || typeof obj !== 'object') return "";
    const record = obj as Record<string, unknown>;
    for (const k of keys) {
        const v = record[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

async function resolveUserId(req: NextRequest, base: string, headers: Record<string, string>): Promise<number> {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const decoded = token ? decodeJwtPayload(token) : null;
    let userId = Number(decoded?.id || decoded?.userId || decoded?.user_id || decoded?.employee_id);

    if (!userId || isNaN(userId)) {
        try {
            const email = pickString(decoded, ["email", "Email", "sub"]);
            let userQuery = `${base}/items/user?fields=user_id&limit=1`;
            if (email) userQuery += `&filter[user_email][_eq]=${encodeURIComponent(email)}`;

            const userRes = await proxyFetch(userQuery, { method: "GET", headers });
            const userData = await parseJson(userRes);
            const users = toList<DirectusUser>(userData);

            const firstUser = users[0];
            if (firstUser && firstUser.user_id != null) {
                userId = Number(firstUser.user_id);
            } else {
                const fbRes = await proxyFetch(`${base}/items/user?fields=user_id&limit=1`, { method: "GET", headers });
                const fbData = await parseJson(fbRes);
                const fbUsers = toList<DirectusUser>(fbData);
                const fbFirstUser = fbUsers[0];
                if (fbFirstUser && fbFirstUser.user_id != null) userId = Number(fbFirstUser.user_id);
            }
        } catch {
            // ignore
        }
    }

    return !userId || isNaN(userId) ? 0 : userId;
}

// ─── Normalize a raw Directus ingredient_price_requests row ──────────────────
function normalizeRequest(raw: Record<string, unknown>): Record<string, unknown> {
    const ing = typeof raw.ingredient_id === "object" ? raw.ingredient_id as Record<string, unknown> | null : null;
    const unit = ing && typeof ing.unit_of_measurement === "object" ? ing.unit_of_measurement as Record<string, unknown> | null : null;
    const supplier = ing && typeof ing.supplier === "object" ? ing.supplier as Record<string, unknown> | null : null;
    const requester = typeof raw.requested_by === "object" ? raw.requested_by as Record<string, unknown> | null : null;

    const rFirstName = requester?.user_fname ?? "";
    const rLastName = requester?.user_lname ?? "";
    const requested_by_name = [rFirstName, rLastName].filter(Boolean).join(" ") || requester?.user_email || null;

    return {
        id: raw.id,
        ingredient_id: ing?.id ?? raw.ingredient_id,
        ingredient_name: ing?.name ?? "Unknown",
        supplier_name: supplier?.supplier_name ?? supplier?.name ?? null,
        unit_name: unit?.unit_name ?? unit?.name ?? null,
        unit_abbreviation: unit?.abbreviation ?? null,
        unit_count: ing?.unit_count != null ? Number(ing.unit_count) : 0,
        old_cost: Number(raw.old_cost ?? 0),
        new_cost: Number(raw.new_cost ?? 0),
        request_reason: raw.request_reason ?? null,
        status: raw.status ?? "pending",
        requested_by: requester?.user_id ?? raw.requested_by,
        requested_by_name,
        requested_at: raw.requested_at,
        processed_by: raw.processed_by ?? null,
        processed_at: raw.processed_at ?? null,
        approval_notes: raw.approval_notes ?? null,
    };
}

// ─── GET – list pending ingredient price requests ─────────────────────────────
export async function GET() {
    try {
        const headers = authHeaders();
        const base = baseUrl();

        const upstream = await proxyFetch(
            `${base}/items/ingredient_price_requests?fields=*,ingredient_id.*,ingredient_id.unit_of_measurement.*,ingredient_id.supplier.*,requested_by.*&filter[status][_eq]=pending&sort=-requested_at`,
            { method: "GET", headers }
        );
        const data = await parseJson(upstream);

        if (!upstream.ok) {
            console.error("[ingredient-price-approval GET] Upstream error", upstream.status, data);
            const errorData = data as { message?: string; errors?: Array<{ message?: string }> };
            return NextResponse.json(
                { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch price requests." },
                { status: upstream.status }
            );
        }

        const raw = toList<Record<string, unknown>>(data);
        const list = raw.map(normalizeRequest);

        return NextResponse.json(list, {
            status: 200,
            headers: { "Cache-Control": "no-store" },
        });
    } catch (err: unknown) {
        console.error("[ingredient-price-approval GET]", err instanceof Error ? err.message : err);
        return NextResponse.json(
            { message: "Server error. Please contact Administrator." },
            { status: 500 }
        );
    }
}

// ─── PATCH – approve or reject a price request ───────────────────────────────
// Body: { id: number, action: "approved" | "rejected", approval_notes?: string }
// When approved, also patches ingredients.cost_per_unit with new_cost.
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

        const { id, action, approval_notes } = body as {
            id: number;
            action: "approved" | "rejected";
            approval_notes?: string;
        };

        if (action !== "approved" && action !== "rejected") {
            return NextResponse.json(
                { message: "\"action\" must be \"approved\" or \"rejected\"." },
                { status: 400 }
            );
        }

        const processed_by = await resolveUserId(req, base, headers);

        // 1. Fetch the current request to get ingredient_id and new_cost (needed for approval)
        const fetchRes = await proxyFetch(
            `${base}/items/ingredient_price_requests/${id}?fields=id,ingredient_id,new_cost,status`,
            { method: "GET", headers }
        );
        const fetchData = await parseJson(fetchRes);

        if (!fetchRes.ok || !fetchData) {
            const errorData = fetchData as { message?: string; errors?: Array<{ message?: string }> };
            return NextResponse.json(
                { message: errorData?.errors?.[0]?.message ?? "Price request not found." },
                { status: fetchRes.status }
            );
        }

        const existingRequest = unwrapItem<IngredientPriceRequest>(fetchData);

        // 2. Patch the price request record
        const patchPayload: Record<string, unknown> = {
            status: action,
            processed_by: processed_by || null,
            processed_at: new Date().toISOString(),
            approval_notes: approval_notes?.trim() ?? null,
        };

        const patchRes = await proxyFetch(
            `${base}/items/ingredient_price_requests/${id}`,
            { method: "PATCH", headers, body: JSON.stringify(patchPayload) }
        );
        const patchData = await parseJson(patchRes);

        if (!patchRes.ok) {
            console.error("[ingredient-price-approval PATCH] Upstream error", patchRes.status, patchData);
            const errorData = patchData as { message?: string; errors?: Array<{ message?: string }> };
            return NextResponse.json(
                { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to process price request." },
                { status: patchRes.status }
            );
        }

        // 3. If approved, update the ingredient's cost_per_unit and recalculate pending PO items
        if (action === "approved") {
            const ingredientId = typeof existingRequest.ingredient_id === "object"
                ? existingRequest.ingredient_id?.id
                : existingRequest.ingredient_id;

            const newCost = Number(existingRequest.new_cost ?? 0);

            if (ingredientId) {
                // 3a. Update the ingredient's cost_per_unit
                const ingPatchRes = await proxyFetch(
                    `${base}/items/ingredients/${ingredientId}`,
                    {
                        method: "PATCH",
                        headers,
                        body: JSON.stringify({ cost_per_unit: newCost }),
                    }
                );

                if (!ingPatchRes.ok) {
                    const ingData = await parseJson(ingPatchRes);
                    console.error("[ingredient-price-approval PATCH] Ingredient cost update failed", ingPatchRes.status, ingData);
                    return NextResponse.json(
                        { message: "Request approved but failed to update ingredient cost. Please update manually." },
                        { status: 207 }
                    );
                }

                // 3b. Find all Pending PO items that use this ingredient and recalculate their estimated_cost
                const poItemsRes = await proxyFetch(
                    `${base}/items/meal_purchase_order_items?fields=id,purchase_order_id,required_quantity&filter[ingredient_id][_eq]=${ingredientId}&filter[deleted_at][_null]=true&filter[purchase_order_id][status][_eq]=Pending&limit=-1`,
                    { method: "GET", headers }
                );

                if (poItemsRes.ok) {
                    const poItemsData = await parseJson(poItemsRes);
                    const poItems = toList<PurchaseOrderItemRecord>(poItemsData);

                    const affectedPOIds = new Set<number>();

                    for (const item of poItems) {
                        const poId = typeof item.purchase_order_id === "object"
                            ? Number(item.purchase_order_id?.id)
                            : Number(item.purchase_order_id);
                        const newEstimatedCost = newCost * Number(item.required_quantity ?? 0);

                        await proxyFetch(
                            `${base}/items/meal_purchase_order_items/${item.id}`,
                            { method: "PATCH", headers, body: JSON.stringify({ estimated_cost: newEstimatedCost.toFixed(4) }) }
                        );

                        if (poId) affectedPOIds.add(poId);
                    }

                    // 3c. Recalculate total_estimated_cost for each affected PO
                    for (const poId of affectedPOIds) {
                        const allItemsRes = await proxyFetch(
                            `${base}/items/meal_purchase_order_items?fields=estimated_cost&filter[purchase_order_id][_eq]=${poId}&filter[deleted_at][_null]=true&limit=-1`,
                            { method: "GET", headers }
                        );
                        if (allItemsRes.ok) {
                            const allItemsData = await parseJson(allItemsRes);
                            const allItems = toList<PurchaseOrderItemRecord>(allItemsData);
                            const newTotal = allItems.reduce((sum: number, i: PurchaseOrderItemRecord) => sum + Number(i.estimated_cost ?? 0), 0);
                            await proxyFetch(
                                `${base}/items/meal_purchase_orders/${poId}`,
                                { method: "PATCH", headers, body: JSON.stringify({ total_estimated_cost: newTotal.toFixed(4) }) }
                            );
                        }
                    }
                }
            }
        }

        return NextResponse.json(patchData ?? { ok: true }, { status: 200 });
    } catch (err: unknown) {
        console.error("[ingredient-price-approval PATCH]", err instanceof Error ? err.message : err);
        return NextResponse.json(
            { message: "Server error. Please contact Administrator." },
            { status: 500 }
        );
    }
}
