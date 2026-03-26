// ─── types.ts ─────────────────────────────────────────────────────────────────

// Normalized price request row returned from the API
export interface PriceRequest {
    id: number;
    ingredient_id: number;
    ingredient_name: string;
    unit_name: string | null;
    unit_abbreviation: string | null;
    unit_count: number;
    old_cost: number;
    new_cost: number;
    request_reason: string | null;
    status: "pending" | "approved" | "rejected";
    requested_by: number;
    requested_by_name: string | null;
    requested_at: string;
    processed_by: number | null;
    processed_at: string | null;
    approval_notes: string | null;
}

// Payload sent when admin approves a request
export interface ApproveValues {
    id: number;
    approval_notes: string;
}

// Payload sent when admin rejects a request
export interface RejectValues {
    id: number;
}
