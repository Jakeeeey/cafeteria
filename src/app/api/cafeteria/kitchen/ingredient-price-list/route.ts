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

// ─── Flatten Directus nested relations into the flat Ingredient shape ─────────
function normalizeIngredient(raw: Record<string, unknown>): Record<string, unknown> {
  const brand      = typeof raw.brand_id         === "object" ? (raw.brand_id as Record<string, unknown>)         : null;
  const category   = typeof raw.category_id      === "object" ? (raw.category_id as Record<string, unknown>)      : null;
  const unit       = typeof raw.unit_of_measurement === "object" ? (raw.unit_of_measurement as Record<string, unknown>) : null;

  return {
    id:                  raw.id,
    name:                raw.name,
    description:         raw.description ?? null,
    brand_id:            (brand?.brand_id ?? (typeof raw.brand_id === "number" ? raw.brand_id : null)) as number | null,
    brand_name:          (brand?.brand_name ?? brand?.name ?? null) as string | null,
    category_id:         (category?.category_id ?? (typeof raw.category_id === "number" ? raw.category_id : null)) as number | null,
    category_name:       (category?.category_name ?? category?.name ?? null) as string | null,
    unit_of_measurement: (unit?.unit_id ?? (typeof raw.unit_of_measurement === "number" ? raw.unit_of_measurement : null)) as number | null,
    unit_name:           (unit?.unit_name ?? unit?.name ?? null) as string | null,
    unit_abbreviation:   (unit?.abbreviation ?? null) as string | null,
    unit_count:          Number(raw.unit_count ?? 0),
    cost_per_unit:       Number(raw.cost_per_unit ?? 0),
    is_active:           raw.is_active ?? 1,
    shelf_life:          raw.shelf_life ?? null,
    created_at:          raw.created_at,
    updated_at:          raw.updated_at,
  };
}

// ─── GET – list active ingredients ───────────────────────────────────────────
//
//  GET /api/cafeteria/kitchen/ingredient-price-list

export async function GET(req: NextRequest) {
  try {
    const headers = authHeaders();
    const base = baseUrl();

    const wantsOptions = req.nextUrl.searchParams.get("options") === "true";

    if (wantsOptions) {
      // Fetch all FK lookup tables in parallel
      const [brandsRes, categoriesRes] =
        await Promise.all([
          proxyFetch(`${base}/items/brand`, { method: "GET", headers }),
          proxyFetch(`${base}/items/categories`, { method: "GET", headers }),
        ]);

      const [brandsRaw, categoriesRaw] =
        await Promise.all([
          parseJson(brandsRes),
          parseJson(categoriesRes),
        ]);

      const toList = (raw: unknown): unknown[] =>
        Array.isArray(raw) ? raw : ((raw as Record<string, unknown>)?.data ?? (raw as Record<string, unknown>)?.content ?? []) as unknown[];

      const brands = toList(brandsRaw).map((b: unknown) => {
        const brand = b as Record<string, unknown>;
        return {
          value: (brand.brand_name ?? brand.name) as string,
          label: (brand.brand_name ?? brand.name) as string,
        };
      });
      const categories = toList(categoriesRaw).map((c: unknown) => {
        const category = c as Record<string, unknown>;
        return {
          value: (category.category_name ?? category.name) as string,
          label: (category.category_name ?? category.name) as string,
        };
      });

      return NextResponse.json(
        { brands, categories },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Fetch all ingredients — expand all FK relations
    const upstream = await proxyFetch(
      `${base}/items/ingredients?fields=*,brand_id.*,category_id.*,unit_of_measurement.*`,
      { method: "GET", headers }
    );
    const data = await parseJson(upstream);

    if (!upstream.ok) {
      console.error("[ingredient-price-list GET] Upstream error", upstream.status, data);
      const errorData = data as Record<string, unknown>;
      const errors = errorData?.errors as { message: string }[] | undefined;
      return NextResponse.json(
        { message: errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch ingredients" },
        { status: upstream.status }
      );
    }

    // Directus wraps the list in { data: [] } — unwrap and normalize each row
    const rawData = (Array.isArray(data) ? data : ((data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.content ?? [])) as Record<string, unknown>[];
    let list = rawData.map(normalizeIngredient);

    // Optional: Only return active ingredients directly from the backend to save bandwidth
    list = list.filter((i: Record<string, unknown>) => Number(i.is_active) === 1 || i.is_active === true);

    return NextResponse.json(list, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    console.error("[ingredient-price-list GET]", (err as Error)?.message);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}
