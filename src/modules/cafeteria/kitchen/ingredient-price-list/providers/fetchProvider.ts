import type { Ingredient, FilterOptions } from "../types"

const INGREDIENTS_BASE = "/api/cafeteria/kitchen/ingredient-price-list"

export async function fetchActiveIngredients(): Promise<Ingredient[]> {
    const res = await fetch(INGREDIENTS_BASE, { cache: "no-store" })
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Failed to fetch ingredients (${res.status})`)
    }
    const json = await res.json()
    const data = Array.isArray(json) ? json : (json.data ?? json.content ?? [])
    
    // Only return active ingredients
    return data.filter((i: any) => Number(i.is_active) === 1 || i.is_active === true)
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
    const res = await fetch(`${INGREDIENTS_BASE}?options=true`, { cache: "no-store" })
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Failed to fetch filter options (${res.status})`)
    }
    return await res.json()
}
