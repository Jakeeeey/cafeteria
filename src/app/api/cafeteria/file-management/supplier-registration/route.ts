// src/app/api/cafeteria/file-management/supplier-registration/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 15_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj?.data)) return obj.data;
    if (Array.isArray(obj?.content)) return obj.content;
    return [];
}

function safeTrim(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function friendlySupplierError(data: unknown, fallback: string, name?: string): string {
    const errorData = data as { errors?: Array<{ message?: string }>; message?: string };
    const raw: string = errorData?.errors?.[0]?.message ?? errorData?.message ?? "";
    if (/unique/i.test(raw)) {
        return name ? `Supplier name "${name}" already exists.` : "Supplier name already exists.";
    }
    return raw || fallback;
}

const COLLECTION_SUPPLIER = "ingredient_supplier";
const COLLECTION_JOIN = "ingredient_per_supplier";
const COLLECTION_INGREDIENTS = "ingredients";

async function nameExists(base: string, headers: Record<string, string>, name: string, excludeId?: number): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const params = new URLSearchParams();
    params.set("fields", "id,name");
    params.set("limit", "1");
    params.set("filter[name][_eq]", trimmed);
    if (excludeId != null) params.set("filter[id][_neq]", String(excludeId));

    const upstream = await proxyFetch(`${base}/items/${COLLECTION_SUPPLIER}?${params.toString()}`, {
        method: "GET",
        headers,
    });
    const data = await parseJson(upstream);
    if (!upstream.ok) {
        console.error("[supplier-registration nameExists] Upstream error", upstream.status, data);
        // If we can't verify, don't block the request — Directus unique constraint (if any) will still protect.
        return false;
    }
    return toList(data).length > 0;
}

async function fetchIngredientMappings(
    base: string,
    headers: Record<string, string>,
    supplierIds?: number[]
): Promise<Array<{ supplier_id: number; ingredient_id: number }>> {
    const params = new URLSearchParams();
    params.set("fields", "supplier_id,ingredient_id");
    params.set("limit", "-1");

    if (supplierIds && supplierIds.length > 0) {
        params.set("filter[supplier_id][_in]", supplierIds.join(","));
    }

    const upstream = await proxyFetch(`${base}/items/${COLLECTION_JOIN}?${params.toString()}`, {
        method: "GET",
        headers,
    });
    const data = await parseJson(upstream);

    if (!upstream.ok) {
        console.error("[supplier-registration mappings GET] Upstream error", upstream.status, data);
        return [];
    }

    return toList(data)
        .map((row: unknown) => row as Record<string, unknown>)
        .map((row) => ({
            supplier_id: Number(row.supplier_id),
            ingredient_id: Number(row.ingredient_id),
        }))
        .filter((x) => Number.isFinite(x.supplier_id) && Number.isFinite(x.ingredient_id));
}

// ─── GET – list suppliers OR fetch form options ─────────────────────────────
//
//  GET /api/cafeteria/file-management/supplier-registration
//    → lists all suppliers (and includes ingredient_ids per supplier)
//
//  GET /api/cafeteria/file-management/supplier-registration?options=true
//    → returns ingredient options for the supplier form

export async function GET(req: NextRequest) {
    try {
        const headers = authHeaders();
        const base = baseUrl();

        const wantsOptions = req.nextUrl.searchParams.get("options") === "true";

        if (wantsOptions) {
            const upstream = await proxyFetch(
                `${base}/items/${COLLECTION_INGREDIENTS}?fields=id,name&sort=name&limit=-1`,
                { method: "GET", headers }
            );
            const data = await parseJson(upstream);

            if (!upstream.ok) {
                console.error("[supplier-registration GET options] Upstream error", upstream.status, data);
                const errorData = data as { errors?: Array<{ message?: string }>; message?: string };
                return NextResponse.json(
                    { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch options." },
                    { status: upstream.status }
                );
            }

            const ingredients = toList(data).map((i: unknown) => {
                const ing = i as Record<string, unknown>;
                return {
                    id: Number(ing.id),
                    name: (ing.name ?? "") as string,
                };
            }).filter((x) => Number.isFinite(x.id) && x.name);

            return NextResponse.json(
                { ingredients },
                { status: 200, headers: { "Cache-Control": "no-store" } }
            );
        }

        const upstream = await proxyFetch(
            `${base}/items/${COLLECTION_SUPPLIER}?fields=id,name,short_cut,address,brgy,city,province,country,contact_number,is_active&sort=-id&limit=-1`,
            { method: "GET", headers }
        );
        const data = await parseJson(upstream);

        if (!upstream.ok) {
            console.error("[supplier-registration GET] Upstream error", upstream.status, data);
            const errorData = data as { errors?: Array<{ message?: string }>; message?: string };
            return NextResponse.json(
                { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch suppliers." },
                { status: upstream.status }
            );
        }

        const suppliersRaw = toList(data).map((s: unknown) => s as Record<string, unknown>);
        const supplierIds = suppliersRaw.map((s) => Number(s.id)).filter((id) => Number.isFinite(id));
        const mappings = await fetchIngredientMappings(base, headers, supplierIds);

        const ingredientIdsBySupplier = new Map<number, number[]>();
        for (const m of mappings) {
            const arr = ingredientIdsBySupplier.get(m.supplier_id) ?? [];
            arr.push(m.ingredient_id);
            ingredientIdsBySupplier.set(m.supplier_id, arr);
        }

        const suppliers = suppliersRaw.map((s) => {
            const id = Number(s.id);
            return {
                id,
                name: (s.name ?? "") as string,
                short_cut: (s.short_cut ?? null) as string | null,
                address: (s.address ?? null) as string | null,
                brgy: (s.brgy ?? null) as string | null,
                city: (s.city ?? null) as string | null,
                province: (s.province ?? null) as string | null,
                country: (s.country ?? null) as string | null,
                contact_number: (s.contact_number ?? null) as string | null,
                is_active: Number(s.is_active ?? 1),
                ingredient_ids: ingredientIdsBySupplier.get(id) ?? [],
            };
        });

        return NextResponse.json(suppliers, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err: unknown) {
        console.error("[supplier-registration GET]", err instanceof Error ? err.message : err);
        return NextResponse.json(
            { message: "Server error. Please contact Administrator." },
            { status: 500 }
        );
    }
}

// ─── POST – create supplier + (optional) ingredient mappings ────────────────
export async function POST(req: NextRequest) {
    try {
        const headers = authHeaders();
        const base = baseUrl();

        const body = await req.json().catch(() => null) as Record<string, unknown> | null;
        if (!body) {
            return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
        }

        const name = safeTrim(body.name);
        if (!name) {
            return NextResponse.json({ message: "Name is required." }, { status: 400 });
        }

        if (await nameExists(base, headers, name)) {
            return NextResponse.json({ message: `Supplier name "${name}" already exists.` }, { status: 409 });
        }

        const payload = {
            name,
            short_cut: safeTrim(body.short_cut) || null,
            address: safeTrim(body.address) || null,
            brgy: safeTrim(body.brgy) || null,
            city: safeTrim(body.city) || null,
            province: safeTrim(body.province) || null,
            country: safeTrim(body.country) || null,
            contact_number: safeTrim(body.contact_number) || null,
            is_active: body.is_active ?? 1,
        };

        const upstream = await proxyFetch(`${base}/items/${COLLECTION_SUPPLIER}`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });
        const data = await parseJson(upstream);

        if (!upstream.ok) {
            console.error("[supplier-registration POST] Upstream error", upstream.status, data);
            return NextResponse.json(
                { message: friendlySupplierError(data, "Failed to create supplier.", name) },
                { status: upstream.status }
            );
        }

        const created = data as { data?: Record<string, unknown> } | Record<string, unknown> | null;
        const supplierId = Number((created as any)?.data?.id ?? (created as any)?.id);

        // Optional: create join-table rows
        const ingredientIds = Array.isArray(body.ingredient_ids)
            ? (body.ingredient_ids as unknown[]).map((x) => Number(x)).filter((x) => Number.isFinite(x))
            : [];

        const uniqueIngredientIds = Array.from(new Set(ingredientIds));
        if (Number.isFinite(supplierId) && uniqueIngredientIds.length > 0) {
            const joinPayload = uniqueIngredientIds.map((ingredient_id) => ({
                ingredient_id,
                supplier_id: supplierId,
            }));

            const joinRes = await proxyFetch(`${base}/items/${COLLECTION_JOIN}`, {
                method: "POST",
                headers,
                body: JSON.stringify(joinPayload),
            });
            const joinData = await parseJson(joinRes);

            if (!joinRes.ok) {
                console.error("[supplier-registration POST join] Upstream error", joinRes.status, joinData);
                // Supplier created, but mapping failed — surface a helpful message
                return NextResponse.json(
                    { message: "Supplier created, but failed to assign ingredients." },
                    { status: 207 }
                );
            }
        }

        return NextResponse.json(data ?? { ok: true }, { status: upstream.status });
    } catch (err: unknown) {
        console.error("[supplier-registration POST]", err instanceof Error ? err.message : err);
        return NextResponse.json(
            { message: "Server error. Please contact Administrator." },
            { status: 500 }
        );
    }
}

// ─── PUT – update supplier + add missing ingredient mappings (no deletes) ───
export async function PUT(req: NextRequest) {
    try {
        const headers = authHeaders();
        const base = baseUrl();

        const body = await req.json().catch(() => null) as Record<string, unknown> | null;
        if (!body || body.id == null) {
            return NextResponse.json(
                { message: "Invalid request body. \"id\" is required." },
                { status: 400 }
            );
        }

        const id = Number(body.id);
        if (!Number.isFinite(id)) {
            return NextResponse.json({ message: "Invalid supplier id." }, { status: 400 });
        }

        const name = safeTrim(body.name);
        if (name && (await nameExists(base, headers, name, id))) {
            return NextResponse.json({ message: `Supplier name "${name}" already exists.` }, { status: 409 });
        }

        const payload: Record<string, unknown> = {
            name: name || undefined,
            short_cut: body.short_cut != null ? (safeTrim(body.short_cut) || null) : undefined,
            address: body.address != null ? (safeTrim(body.address) || null) : undefined,
            brgy: body.brgy != null ? (safeTrim(body.brgy) || null) : undefined,
            city: body.city != null ? (safeTrim(body.city) || null) : undefined,
            province: body.province != null ? (safeTrim(body.province) || null) : undefined,
            country: body.country != null ? (safeTrim(body.country) || null) : undefined,
            contact_number: body.contact_number != null ? (safeTrim(body.contact_number) || null) : undefined,
            is_active: body.is_active != null ? body.is_active : undefined,
        };

        // Remove undefined keys
        for (const k of Object.keys(payload)) {
            if (payload[k] === undefined) delete payload[k];
        }

        const upstream = await proxyFetch(`${base}/items/${COLLECTION_SUPPLIER}/${id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload),
        });
        const data = await parseJson(upstream);

        if (!upstream.ok) {
            console.error("[supplier-registration PUT] Upstream error", upstream.status, data);
            return NextResponse.json(
                { message: friendlySupplierError(data, "Failed to update supplier.", name || undefined) },
                { status: upstream.status }
            );
        }

        const ingredientIds = Array.isArray(body.ingredient_ids)
            ? (body.ingredient_ids as unknown[]).map((x) => Number(x)).filter((x) => Number.isFinite(x))
            : null;

        if (ingredientIds && ingredientIds.length > 0) {
            const existing = await fetchIngredientMappings(base, headers, [id]);
            const existingIds = new Set(existing.filter((m) => m.supplier_id === id).map((m) => m.ingredient_id));
            const toAdd = Array.from(new Set(ingredientIds)).filter((x) => !existingIds.has(x));

            if (toAdd.length > 0) {
                const joinPayload = toAdd.map((ingredient_id) => ({
                    ingredient_id,
                    supplier_id: id,
                }));

                const joinRes = await proxyFetch(`${base}/items/${COLLECTION_JOIN}`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(joinPayload),
                });
                const joinData = await parseJson(joinRes);

                if (!joinRes.ok) {
                    console.error("[supplier-registration PUT join] Upstream error", joinRes.status, joinData);
                    return NextResponse.json(
                        { message: "Supplier updated, but failed to assign some ingredients." },
                        { status: 207 }
                    );
                }
            }
        }

        return NextResponse.json(data ?? { ok: true }, { status: upstream.status });
    } catch (err: unknown) {
        console.error("[supplier-registration PUT]", err instanceof Error ? err.message : err);
        return NextResponse.json(
            { message: "Server error. Please contact Administrator." },
            { status: 500 }
        );
    }
}
