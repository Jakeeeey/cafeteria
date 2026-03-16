import type { Brand, BrandFormValues } from "../types";

const BASE = "/api/cafeteria/file-management/brand-registration";

// ─── GET – list cafeteria brands ──────────────────────────────────────────────
export async function fetchBrands(): Promise<Brand[]> {
  const res = await fetch(BASE, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch brands (${res.status})`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : (json.data ?? json.content ?? []);
}

// ─── POST – create brand ──────────────────────────────────────────────────────
export async function createBrand(data: BrandFormValues): Promise<void> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `Failed to create brand (${res.status})`);
  }
}

// ─── PUT – update brand ───────────────────────────────────────────────────────
export async function updateBrand(
  brand_id: number,
  data: BrandFormValues
): Promise<void> {
  const res = await fetch(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brand_id, ...data }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `Failed to update brand (${res.status})`);
  }
}
