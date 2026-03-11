// ─── types.ts ─────────────────────────────────────────────────────────────────

export interface PurchaseOrder {
    id: number;
    date_from: string;
    date_to: string;
    total_estimated_cost: number;
    status: "Pending" | "Approved" | "Ordered" | "Received" | "Cancelled";
    created_at: string;
    created_by: number | null;
    meal_names: string[];
    meal_categories: string[];
}

export interface PurchaseOrderItem {
    id: number;
    purchase_order_id: number;
    ingredient_id: number;
    ingredient_name: string;
    unit_name: string | null;
    unit_abbreviation: string | null;
    required_quantity: number;
    estimated_cost: number;
}

export interface POScheduleEntry {
    id: number;
    schedule_date: string;
    day_of_week: string;
    meal_type: "Breakfast" | "Lunch" | "Snack";
    meal_name: string;
    quantity: number;
    total_servings: number;
}
