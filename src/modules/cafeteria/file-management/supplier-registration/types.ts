// ─── Ingredient option type (used for supplier-ingredient assignment) ───────

export interface IngredientOption {
	id: number;
	name: string;
}

export interface SupplierOptions {
	ingredients: IngredientOption[];
}

// ─── Supplier row returned from API ─────────────────────────────────────────

export interface IngredientSupplier {
	id: number;
	name: string;
	short_cut: string | null;
	address: string | null;
	brgy: string | null;
	city: string | null;
	province: string | null;
	country: string | null;
	contact_number: string | null;
	is_active: number;
	ingredient_ids?: number[];
}

// ─── Form values ───────────────────────────────────────────────────────────

export interface IngredientSupplierFormValues {
	name: string;
	short_cut: string;
	address: string;
	brgy: string;
	city: string;
	province: string;
	country: string;
	contact_number: string;
	is_active: number;
	ingredient_ids: number[];
}

