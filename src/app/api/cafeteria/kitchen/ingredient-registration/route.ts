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

async function parseJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

// ─── Flatten Directus nested relations into the flat Ingredient shape ─────────
// Directus returns FK relations as nested objects when you request ?fields=*,rel.*
// e.g. brand_id: { brand_id: 1, brand_name: "Nestle" }
function normalizeIngredient(raw: any): any {
  const brand      = typeof raw.brand_id         === "object" ? raw.brand_id         : null;
  const category   = typeof raw.category_id      === "object" ? raw.category_id      : null;
  const unit       = typeof raw.unit_of_measurement === "object" ? raw.unit_of_measurement : null;
  const supplier   = typeof raw.supplier         === "object" ? raw.supplier         : null;

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
    unit_count:          raw.unit_count,
    cost_per_unit:       typeof raw.cost_per_unit === "number" ? raw.cost_per_unit : 0,
    supplier:            supplier?.id ?? (typeof raw.supplier === "number" ? raw.supplier : null),
    supplier_name:       supplier?.supplier_name ?? supplier?.name ?? null,
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
//    → fetches brand, categories, units, suppliers in parallel from Directus

export async function GET(req: NextRequest) {
  try {
    const headers = authHeaders();
    const base = baseUrl();

    const wantsOptions = req.nextUrl.searchParams.get("options") === "true";

    if (wantsOptions) {
      // Fetch all FK lookup tables in parallel from Directus
      const [brandsRes, categoriesRes, unitsRes, suppliersRes] =
        await Promise.all([
          proxyFetch(`${base}/items/brand`, { method: "GET", headers }),
          proxyFetch(`${base}/items/categories`, { method: "GET", headers }),
          proxyFetch(`${base}/items/units`, { method: "GET", headers }),
          proxyFetch(`${base}/items/suppliers`, { method: "GET", headers }),
        ]);

      console.log("[options] status → brands:", brandsRes.status, "categories:", categoriesRes.status, "units:", unitsRes.status, "suppliers:", suppliersRes.status);

      const [brandsRaw, categoriesRaw, unitsRaw, suppliersRaw] =
        await Promise.all([
          parseJson(brandsRes),
          parseJson(categoriesRes),
          parseJson(unitsRes),
          parseJson(suppliersRes),
        ]);

      // Log raw responses so we can see actual field names & collection names
      console.log("[options] brandsRaw:", JSON.stringify(brandsRaw)?.slice(0, 300));
      console.log("[options] categoriesRaw:", JSON.stringify(categoriesRaw)?.slice(0, 300));
      console.log("[options] unitsRaw:", JSON.stringify(unitsRaw)?.slice(0, 300));
      console.log("[options] suppliersRaw:", JSON.stringify(suppliersRaw)?.slice(0, 300));

      // Directus wraps results in { data: [] }
      const toList = (raw: any): any[] =>
        Array.isArray(raw) ? raw : (raw?.data ?? raw?.content ?? []);

      const brands = toList(brandsRaw).map((b: any) => ({
        value: b.brand_id ?? b.id,
        label: b.brand_name ?? b.name,
      }));
      const categories = toList(categoriesRaw).map((c: any) => ({
        value: c.category_id ?? c.id,
        label: c.category_name ?? c.name,
      }));
      const units = toList(unitsRaw).map((u: any) => ({
        value: u.unit_id ?? u.id,
        label: u.abbreviation ? `${u.unit_name ?? u.name} (${u.abbreviation})` : (u.unit_name ?? u.name),
      }));
      const suppliers = toList(suppliersRaw).map((s: any) => ({
        value: s.id,
        label: s.supplier_name ?? s.name,
      }));

      console.log("[options] counts → brands:", brands.length, "categories:", categories.length, "units:", units.length, "suppliers:", suppliers.length);

      return NextResponse.json(
        { brands, categories, units, suppliers },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Default: list all ingredients — expand all FK relations in one request
    const upstream = await proxyFetch(
      `${base}/items/ingredients?fields=*,brand_id.*,category_id.*,unit_of_measurement.*,supplier.*`,
      { method: "GET", headers }
    );
    const data = await parseJson(upstream);

    if (!upstream.ok) {
      console.error("[ingredient-registration GET] Upstream error", upstream.status, data);
      return NextResponse.json(
        { message: data?.errors?.[0]?.message ?? data?.message ?? "Failed to fetch ingredients" },
        { status: upstream.status }
      );
    }

    // Directus wraps the list in { data: [] } — unwrap and normalize each row
    const raw = Array.isArray(data) ? data : (data?.data ?? data?.content ?? []);
    const list = raw.map(normalizeIngredient);

    return NextResponse.json(list, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("[ingredient-registration GET]", err?.message);
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
        { message: data?.errors?.[0]?.message ?? data?.message ?? "Failed to create ingredient." },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: upstream.status });
  } catch (err: any) {
    console.error("[ingredient-registration POST]", err?.message);
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
        { message: data?.errors?.[0]?.message ?? data?.message ?? "Failed to update ingredient." },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: upstream.status });
  } catch (err: any) {
    console.error("[ingredient-registration PUT]", err?.message);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}
