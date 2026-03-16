// ─── Lookup / FK option types ────────────────────────────────────────────────
export interface Brand {
  brand_id: number;
  name: string;
}

export interface Category {
  category_id: number;
  name: string;
}

export interface Unit {
  unit_id: number;
  name: string;
  abbreviation?: string | null;
}

export interface Supplier {
  id: number;
  name: string;
}

// ─── Ingredient row returned from API ─────────────────────────────────────────
export interface Ingredient {
  id: number;
  name: string;
  description: string | null;
  brand_id: number | null;
  brand_name?: string | null;
  category_id: number | null;
  category_name?: string | null;
  unit_of_measurement: number;
  unit_name?: string | null;
  unit_abbreviation?: string | null;
  unit_count: number;
  cost_per_unit: number;
  supplier: number | null;
  supplier_name?: string | null;
  is_active: number;
  shelf_life: number | null;
  created_at?: string;
  updated_at?: string | null;
}

// ─── Form values ──────────────────────────────────────────────────────────────
export interface IngredientFormValues {
  name: string;
  description: string;
  brand_id: number | null;
  category_id: number | null;
  unit_of_measurement: number | null;
  unit_count: number;
  cost_per_unit: number;
  supplier: number | null;
  is_active: number;
  shelf_life: number | null;
}

// ─── Generic select option ────────────────────────────────────────────────────
export interface SelectOption {
  value: number;
  label: string;
}

// ─── Options bundle returned from ?options=true ───────────────────────────────
export interface IngredientOptions {
  brands: SelectOption[];
  categories: SelectOption[];
  units: SelectOption[];
  suppliers: SelectOption[];
}
