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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const p = parts[1];
        const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

        const json = Buffer.from(padded, "base64").toString("utf8");
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        return null;
    }
}

// ─── GET – list existing requests ──────────────────────────────────────────
export async function GET() {
    try {
        const headers = authHeaders();
        const base = baseUrl();

        // Fetch requests including related user info if needed
        const url = `${base}/items/ingredient_price_requests?fields=*,requested_by.*&sort=-requested_at`;
        const res = await proxyFetch(url, { method: "GET", headers });
        const data = await parseJson(res);

        if (!res.ok) {
            const errorData = data as Record<string, unknown>;
            const errors = errorData?.errors as { message: string }[] | undefined;
            return NextResponse.json(
                { message: errors?.[0]?.message ?? errorData?.message ?? "Failed to fetch requests" },
                { status: res.status }
            );
        }

        const raw = Array.isArray(data) ? data : ((data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.content ?? []);
        return NextResponse.json(raw, { status: 200 });
    } catch (err: unknown) {
        return NextResponse.json({ message: (err as Error).message }, { status: 500 });
    }
}

// ─── POST – create price change request ───────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const headers = authHeaders();
        const base = baseUrl();

        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
        }

        function pickString(obj: Record<string, unknown> | null | undefined, keys: string[]): string {
            if (!obj) return "";
            for (const k of keys) {
                const v = obj[k];
                if (typeof v === "string" && v.trim()) return v.trim();
            }
            return "";
        }

        // Get user info from cookie
        const token = req.cookies.get(COOKIE_NAME)?.value;
        const decoded = token ? decodeJwtPayload(token) : null;

        let requested_by = Number(decoded?.id || decoded?.userId || decoded?.user_id || decoded?.employee_id);

        if (!requested_by || isNaN(requested_by)) {
            // Fallback: If JWT doesn't have a numeric ID (e.g. sub is an email), fetch a valid user from the API to satisfy the NOT NULL FK constraint.
            try {
                const email = pickString(decoded, ["email", "Email", "sub"]);
                let userQuery = `${base}/items/user?fields=user_id&limit=1`;
                if (email) {
                    userQuery += `&filter[user_email][_eq]=${encodeURIComponent(email)}`;
                }

                const userRes = await proxyFetch(userQuery, { method: "GET", headers });
                const userData = await parseJson(userRes);
                const actualUsers = (Array.isArray(userData) ? userData : ((userData as Record<string, unknown>)?.data || (userData as Record<string, unknown>)?.content || [])) as Record<string, unknown>[];

                if (actualUsers.length > 0 && actualUsers[0].user_id) {
                    requested_by = Number(actualUsers[0].user_id);
                } else {
                    // One last attempt without the email filter just to get ANY valid user so we don't break FK
                    const fbRes = await proxyFetch(`${base}/items/user?fields=user_id&limit=1`, { method: "GET", headers });
                    const fbData = await parseJson(fbRes);
                    const fbUsers = (Array.isArray(fbData) ? fbData : ((fbData as Record<string, unknown>)?.data || (fbData as Record<string, unknown>)?.content || [])) as Record<string, unknown>[];
                    if (fbUsers.length > 0 && fbUsers[0].user_id) {
                        requested_by = Number(fbUsers[0].user_id);
                    }
                }
            } catch {
                // Ignore errors
            }
        }

        // Final sanity check for SQL integers
        if (!requested_by || isNaN(requested_by)) {
            requested_by = 0; // Better to fail cleanly on 0 if absolutely no user exists
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const localTimestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

        // Build the payload for Directus (ingredient_price_requests collection)
        // Ensure strictly matching types for foreign keys (integers) and costs (numbers)
        const payload = {
            ingredient_id: Number(body.ingredient_id),
            old_cost: Number(body.old_price),
            new_cost: Number(body.requested_price),
            request_reason: String(body.reason || ""),
            requested_by: requested_by,
            requested_at: localTimestamp
        };

        const upstream = await proxyFetch(
            `${base}/items/ingredient_price_requests`,
            { method: "POST", headers, body: JSON.stringify(payload) }
        );
        const data = await parseJson(upstream);

        if (!upstream.ok) {
            const errorData = data as Record<string, unknown>;
            const errors = errorData?.errors as { message: string }[] | undefined;
            console.error("[ingredient-price-change-request POST] Upstream error", upstream.status, errorData);
            return NextResponse.json(
                { message: errors?.[0]?.message ?? errorData?.message ?? "Failed to submit price change request." },
                { status: upstream.status }
            );
        }

        return NextResponse.json(data ?? { ok: true }, { status: upstream.status });
    } catch (err: unknown) {
        console.error("[ingredient-price-change-request POST]", (err as Error)?.message);
        return NextResponse.json(
            { message: "Server error. Please contact Administrator." },
            { status: 500 }
        );
    }
}

// ─── PUT – update existing price change request (Directus uses PATCH) ───────
export async function PUT(req: NextRequest) {
    try {
        const headers = authHeaders();
        const base = baseUrl();

        const body = await req.json().catch(() => null);
        if (!body || !body.id) {
            return NextResponse.json({ message: "Invalid request body. 'id' is required." }, { status: 400 });
        }

        const { id, ...rest } = body;
        const payload = {
            new_cost: Number(rest.requested_price),
            request_reason: String(rest.reason || ""),
        };

        const upstream = await proxyFetch(
            `${base}/items/ingredient_price_requests/${id}`,
            { method: "PATCH", headers, body: JSON.stringify(payload) }
        );
        const data = await parseJson(upstream);

        if (!upstream.ok) {
            const errorData = data as Record<string, unknown>;
            const errors = errorData?.errors as { message: string }[] | undefined;
            return NextResponse.json(
                { message: errors?.[0]?.message ?? errorData?.message ?? "Failed to update price change request." },
                { status: upstream.status }
            );
        }

        return NextResponse.json(data ?? { ok: true }, { status: upstream.status });
    } catch (err: unknown) {
        return NextResponse.json({ message: (err as Error).message }, { status: 500 });
    }
}
