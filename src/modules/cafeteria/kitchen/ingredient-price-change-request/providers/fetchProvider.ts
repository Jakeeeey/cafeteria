// ─── fetchProvider.ts ───
import type { Ingredient, IngredientPriceChangeFormValues } from "../types"

// We use the exact same endpoint as the registration module to list ingredients
const INGREDIENTS_BASE = "/api/cafeteria/kitchen/ingredient-registration"
// This would be the new endpoint to actually handle the price change request submission
const REQUEST_BASE = "/api/cafeteria/kitchen/ingredient-price-change-request"

// ─── GET all ingredients ──────────────────────────────────────────────────────
export async function fetchIngredients(): Promise<Ingredient[]> {
    const res = await fetch(INGREDIENTS_BASE, { cache: "no-store" })
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Failed to fetch ingredients (${res.status})`)
    }
    const json = await res.json()
    // Spring may wrap the list in a data/content field – normalise
    return Array.isArray(json) ? json : (json.data ?? json.content ?? [])
}

// ─── POST – submit price change request ────────────────────────────────────────
export async function submitPriceChangeRequest(data: IngredientPriceChangeFormValues): Promise<void> {
    const res = await fetch(REQUEST_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? `Failed to submit request (${res.status})`)
    }
}
