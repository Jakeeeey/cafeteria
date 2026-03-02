// ─── types.ts ───
// We simply reuse the exact same Ingredient interface 
// from the registration module to avoid code duplication 
// and maintain consistency.

export type { Ingredient } from "../ingredient-registration/types"

// Local Form values for the price change request
export interface IngredientPriceChangeFormValues {
    ingredient_id: number;
    requested_price: number;
    reason: string;
    old_price: number;
}
