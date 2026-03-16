import type { Category, CategoryFormValues } from "../types";

const BASE = "/api/cafeteria/file-management/category-registration";

// ─── GET – list all categories ────────────────────────────────────────────────
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(BASE, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch categories (${res.status})`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : (json.data ?? json.content ?? []);
}

// ─── POST – create category ───────────────────────────────────────────────────
export async function createCategory(data: CategoryFormValues): Promise<void> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `Failed to create category (${res.status})`);
  }
}

// ─── PUT – update category ────────────────────────────────────────────────────
export async function updateCategory(
  category_id: number,
  data: CategoryFormValues
): Promise<void> {
  const res = await fetch(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category_id, ...data }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `Failed to update category (${res.status})`);
  }
}
