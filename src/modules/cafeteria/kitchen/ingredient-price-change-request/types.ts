// ─── types.ts ───
// We simply reuse the exact same Ingredient interface 
// from the registration module to avoid code duplication 
// and maintain consistency.

export type { Ingredient } from "../ingredient-registration/types"

export interface PriceChangeRequest {
    id: number;
    ingredient_id: number;
    old_cost: number;
    new_cost: number;
    request_reason: string;
    status: "pending" | "approved" | "rejected";
    requested_by: number;
    requested_at: string;
    processed_by?: number;
    processed_at?: string;
    approval_notes?: string;
}

// Local Form values for the price change request
export interface IngredientPriceChangeFormValues {
    ingredient_id: number;
    requested_price: number;
    reason: string;
    old_price: number;
    id?: number; // Optional ID for editing
}
