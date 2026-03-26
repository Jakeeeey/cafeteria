import type { Ingredient, IngredientFormValues, IngredientOptions } from "../types";

const BASE = "/api/cafeteria/kitchen/ingredient-registration";

// ─── GET all ingredients ──────────────────────────────────────────────────────
export async function fetchIngredients(): Promise<Ingredient[]> {
  const res = await fetch(BASE, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch ingredients (${res.status})`);
  }
  const json = await res.json();
  // Spring may wrap the list in a data/content field – normalise
  return Array.isArray(json) ? json : (json.data ?? json.content ?? []);
}

// ─── GET dropdown options (brands / categories / units) ─────────────────────
export async function fetchOptions(): Promise<IngredientOptions> {
  const res = await fetch(`${BASE}?options=true`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch options (${res.status})`);
  }
  return res.json();
}

// ─── POST – create ingredient ─────────────────────────────────────────────────
export async function createIngredient(data: IngredientFormValues): Promise<void> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `Failed to create ingredient (${res.status})`);
  }
}

// ─── PUT – update ingredient ──────────────────────────────────────────────────
export async function updateIngredient(
  id: number,
  data: IngredientFormValues
): Promise<void> {
  const res = await fetch(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `Failed to update ingredient (${res.status})`);
  }
}
