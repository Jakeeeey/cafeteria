import type { Ingredient, IngredientPriceChangeFormValues, PriceChangeRequest } from "../types"
import type { IngredientOptions } from "../../ingredient-registration/types"

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
    return Array.isArray(json) ? json : (json.data ?? json.content ?? [])
}

export async function fetchPriceChangeRequests(): Promise<PriceChangeRequest[]> {
    const res = await fetch(REQUEST_BASE, { cache: "no-store" })
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Failed to fetch price change requests (${res.status})`)
    }
    const json = await res.json()
    return Array.isArray(json) ? json : (json.data ?? json.content ?? [])
}

// ─── GET options (categories, suppliers, etc.) ───────────────────────────────
export async function fetchIngredientOptions(): Promise<IngredientOptions> {
    const res = await fetch(`${INGREDIENTS_BASE}?options=true`, { cache: "no-store" })
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Failed to fetch options (${res.status})`)
    }
    return await res.json()
}

// ─── POST/PUT – submit or update price change request ─────────────────────────
export async function submitPriceChangeRequest(data: IngredientPriceChangeFormValues): Promise<void> {
    const isUpdate = !!data.id;
    const res = await fetch(REQUEST_BASE, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? `Failed to ${isUpdate ? "update" : "submit"} request (${res.status})`)
    }
}
