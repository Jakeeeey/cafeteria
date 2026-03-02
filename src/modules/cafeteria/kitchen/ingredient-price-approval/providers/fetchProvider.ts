// ─── fetchProvider.ts ─────────────────────────────────────────────────────────
import type { PriceRequest, ApproveValues, RejectValues } from "../types"

const BASE = "/api/cafeteria/kitchen/ingredient-price-approval"

// ─── GET all pending price requests ──────────────────────────────────────────
export async function fetchPriceRequests(): Promise<PriceRequest[]> {
    const res = await fetch(BASE, { cache: "no-store" })
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Failed to fetch price requests (${res.status})`)
    }
    const json = await res.json()
    return Array.isArray(json) ? json : (json.data ?? json.content ?? [])
}

// ─── PATCH – approve a price request ─────────────────────────────────────────
export async function approveRequest(values: ApproveValues): Promise<void> {
    const res = await fetch(BASE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: values.id,
            action: "approved",
            approval_notes: values.approval_notes,
        }),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? `Failed to approve request (${res.status})`)
    }
}

// ─── PATCH – reject a price request ──────────────────────────────────────────
export async function rejectRequest(values: RejectValues): Promise<void> {
    const res = await fetch(BASE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: values.id,
            action: "rejected",
        }),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? `Failed to reject request (${res.status})`)
    }
}
