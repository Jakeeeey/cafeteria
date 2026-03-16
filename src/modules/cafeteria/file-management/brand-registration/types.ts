// ─── Domain type (row returned from API) ─────────────────────────────────────

export interface Brand {
  brand_id: number;
  brand_name: string;
  sku_code: string | null;
  is_cafeteria: number;
  created_by: string | null;
  created_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

// ─── DTO for create / update payloads ────────────────────────────────────────

export interface BrandFormValues {
  brand_name: string;
  sku_code: string;
}
