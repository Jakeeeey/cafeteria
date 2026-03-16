// src/app/api/cafeteria/file-management/category-registration/route.ts
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

// ─── Decode vos_access_token JWT to extract the current user ─────────────────

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function pickUserId(req: NextRequest): string {
  const token = req.cookies.get("vos_access_token")?.value ?? "";
  if (!token) return "";
  const payload = decodeJwtPayload(token);
  if (!payload) return "";
  return payload.user_id != null ? String(payload.user_id) : "";
}

// ─── GET – list all categories ────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const headers = authHeaders();
    const base = baseUrl();

    const upstream = await proxyFetch(
      `${base}/items/categories?fields=category_id,category_name,sku_code,is_cafeteria,created_by,created_at,updated_by,updated_at&sort=-created_at&limit=-1`,
      { method: "GET", headers }
    );
    const data = await parseJson(upstream);

    if (!upstream.ok) {
      console.error("[category-registration GET] Upstream error", upstream.status, data);
      return NextResponse.json(
        { message: data?.errors?.[0]?.message ?? data?.message ?? "Failed to fetch categories." },
        { status: upstream.status }
      );
    }

    return NextResponse.json(toList(data), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("[category-registration GET]", err?.message);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}

// ─── POST – create cafeteria category ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const headers = authHeaders();
    const base = baseUrl();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const payload = {
      category_name: body.category_name,
      sku_code: body.sku_code || null,
      is_cafeteria: 1,
      created_by: pickUserId(req) || null,
    };

    const upstream = await proxyFetch(`${base}/items/categories`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await parseJson(upstream);

    if (!upstream.ok) {
      console.error("[category-registration POST] Upstream error", upstream.status, data);
      return NextResponse.json(
        { message: data?.errors?.[0]?.message ?? data?.message ?? "Failed to create category." },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: upstream.status });
  } catch (err: any) {
    console.error("[category-registration POST]", err?.message);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}

// ─── PUT – update cafeteria category ─────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const headers = authHeaders();
    const base = baseUrl();

    const body = await req.json().catch(() => null);
    if (!body || !body.category_id) {
      return NextResponse.json(
        { message: 'Invalid request body. "category_id" is required.' },
        { status: 400 }
      );
    }

    const { category_id, ...rest } = body;
    const payload = {
      category_name: rest.category_name,
      sku_code: rest.sku_code || null,
      updated_by: pickUserId(req) || null,
    };

    const upstream = await proxyFetch(`${base}/items/categories/${category_id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await parseJson(upstream);

    if (!upstream.ok) {
      console.error("[category-registration PUT] Upstream error", upstream.status, data);
      return NextResponse.json(
        { message: data?.errors?.[0]?.message ?? data?.message ?? "Failed to update category." },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: upstream.status });
  } catch (err: any) {
    console.error("[category-registration PUT]", err?.message);
    return NextResponse.json(
      { message: "Server error. Please contact Administrator." },
      { status: 500 }
    );
  }
}
