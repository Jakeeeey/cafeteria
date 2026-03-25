// src/app/api/cafeteria/kitchen/ingredient-registration/route.ts
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

async function proxyFetch(
  url: string,
  init: RequestInit
): Promise<Response> {
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

// ─── Normalize Directus errors into user-friendly messages ───────────────────

function friendlyError(data: unknown, fallback: string, name?: string): string {
  const errorData = data as { errors?: Array<{ message?: string }>; message?: string };
  const raw: string = errorData?.errors?.[0]?.message ?? errorData?.message ?? "";
  if (/unique/i.test(raw)) {
    return name
      ? `name "${name}" is already in the Ingredient Registration.`
      : "An ingredient with this name already exists.";
  }
  return raw || fallback;
}

// ─── Flatten Directus nested relations into the flat Ingredient shape ─────────
// Directus returns FK relations as nested objects when you request ?fields=*,rel.*
// e.g. brand_id: { brand_id: 1, brand_name: "Nestle" }
function normalizeIngredient(raw: Record<string, unknown>): Record<string, unknown> {
  const brand      = typeof raw.brand_id         === "object" ? raw.brand_id as Record<string, unknown>        : null;
  const category   = typeof raw.category_id      === "object" ? raw.category_id as Record<string, unknown>     : null;
  const unit       = typeof raw.unit_of_measurement === "object" ? raw.unit_of_measurement as Record<string, unknown> : null;

  return {
    id:                  raw.id,
    name:                raw.name,
    description:         raw.description ?? null,
    brand_id:            brand?.brand_id ?? (typeof raw.brand_id === "number" ? raw.brand_id : null),
    brand_name:          brand?.brand_name ?? brand?.name ?? null,
    category_id:         category?.category_id ?? (typeof raw.category_id === "number" ? raw.category_id : null),
    category_name:       category?.category_name ?? category?.name ?? null,
    unit_of_measurement: unit?.unit_id ?? (typeof raw.unit_of_measurement === "number" ? raw.unit_of_measurement : null),
    unit_name:           unit?.unit_name ?? unit?.name ?? null,
    unit_abbreviation:   unit?.abbreviation ?? null,
    unit_count:          Number(raw.unit_count ?? 0),
    cost_per_unit:       Number(raw.cost_per_unit ?? 0),
    is_active:           raw.is_active ?? 1,
    shelf_life:          raw.shelf_life ?? null,
    created_at:          raw.created_at,
    updated_at:          raw.updated_at,
  };
}

// ─── GET – list ingredients OR fetch form options ────────────────────────────
//
//  GET /api/cafeteria/kitchen/ingredient-registration
//    → Directus: GET {base}/items/ingredients
//
//  GET /api/cafeteria/kitchen/ingredient-registration?options=true
//    → fetches brand, categories, units in parallel from Directus

export async function GET(req: NextRequest) {
  try {
    const headers = authHeaders();
    const base = baseUrl();

    const wantsOptions = req.nextUrl.searchParams.get("options") === "true";

    if (wantsOptions) {
      // Fetch all FK lookup tables in parallel from Directus
      const [brandsRes, categoriesRes, unitsRes] =
        await Promise.all([
          proxyFetch(`${base}/items/brand?filter[is_cafeteria][_eq]=1`, { method: "GET", headers }),
          proxyFetch(`${base}/items/categories?filter[is_cafeteria][_eq]=1`, { method: "GET", headers }),
          proxyFetch(`${base}/items/units`, { method: "GET", headers }),
        ]);

      console.log("[options] status → brands:", brandsRes.status, "categories:", categoriesRes.status, "units:", unitsRes.status);

      const [brandsRaw, categoriesRaw, unitsRaw] = await Promise.all([
        parseJson(brandsRes),
        parseJson(categoriesRes),
        parseJson(unitsRes),
      ]);

      // Log raw responses so we can see actual field names & collection names
      console.log("[options] brandsRaw:", JSON.stringify(brandsRaw)?.slice(0, 300));
      console.log("[options] categoriesRaw:", JSON.stringify(categoriesRaw)?.slice(0, 300));
      console.log("[options] unitsRaw:", JSON.stringify(unitsRaw)?.slice(0, 300));

      // Directus wraps results in { data: [] }
      const toList = (raw: unknown): unknown[] => {
        if (Array.isArray(raw)) return raw;
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj?.data)) return obj.data;
        if (Array.isArray(obj?.content)) return obj.content;
        return [];
      };

      const brands = toList(brandsRaw).map((b: unknown) => {
        const brand = b as Record<string, unknown>;
        return {
          value: brand.brand_id ?? brand.id,
          label: brand.brand_name ?? brand.name,
        };
      });
      const categories = toList(categoriesRaw).map((c: unknown) => {
        const category = c as Record<string, unknown>;
        return {
          value: category.category_id ?? category.id,
          label: category.category_name ?? category.name,
        };
      });
      const units = toList(unitsRaw).map((u: unknown) => {
        const unit = u as Record<string, unknown>;
        return {
          value: unit.unit_id ?? unit.id,
          label: unit.abbreviation ? `${unit.unit_name ?? unit.name} (${unit.abbreviation})` : (unit.unit_name ?? unit.name),
        };
      });

      console.log("[options] counts → brands:", brands.length, "categories:", categories.length, "units:", units.length);

      return NextResponse.json(
        { brands, categories, units },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Default: list all ingredients — expand all FK relations in one request
    const upstream = await proxyFetch(
      `${base}/items/ingredients?fields=*,brand_id.*,category_id.*,unit_of_measurement.*`,
      { method: "GET", headers }
    );
    const data = await parseJson(upstream);

    if (!upstream.ok) {
      console.error("[ingredient-registration GET] Upstream error", upstream.status, data);
      const errorData = data as { errors?: Array<{ message?: string }>; message?: string };
      return NextResponse.json(
        { message: errorData?.errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch ingredients" },
        { status: upstream.status }
      );
    }

    // Directus wraps the list in { data: [] } — unwrap and normalize each row
    const dataObj = data as { data?: unknown[]; content?: unknown[] };
    const raw = Array.isArray(data) ? data : (dataObj?.data ?? dataObj?.content ?? []);
    const list = raw.map(item => normalizeIngredient(item as Record<string, unknown>));

    return NextResponse.json(list, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    console.error("[ingredient-registration GET]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}

// ─── POST – create ingredient ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const headers = authHeaders();
    const base = baseUrl();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const upstream = await proxyFetch(
      `${base}/items/ingredients`,
      { method: "POST", headers, body: JSON.stringify(body) }
    );
    const data = await parseJson(upstream);

    if (!upstream.ok) {
      console.error("[ingredient-registration POST] Upstream error", upstream.status, data);
      return NextResponse.json(
        { message: friendlyError(data, "Failed to create ingredient.", body.name) },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: upstream.status });
  } catch (err: unknown) {
    console.error("[ingredient-registration POST]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}

// ─── PUT – update ingredient (Directus uses PATCH) ───────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const headers = authHeaders();
    const base = baseUrl();

    const body = await req.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json(
        { message: "Invalid request body. \"id\" is required." },
        { status: 400 }
      );
    }

    const { id, ...payload } = body;

    const upstream = await proxyFetch(
      `${base}/items/ingredients/${id}`,
      { method: "PATCH", headers, body: JSON.stringify(payload) }
    );
    const data = await parseJson(upstream);

    if (!upstream.ok) {
      console.error("[ingredient-registration PUT] Upstream error", upstream.status, data);
      return NextResponse.json(
        { message: friendlyError(data, "Failed to update ingredient.", payload.name) },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: upstream.status });
  } catch (err: unknown) {
    console.error("[ingredient-registration PUT]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}
