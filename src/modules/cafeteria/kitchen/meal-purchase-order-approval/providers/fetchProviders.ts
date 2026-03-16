// ─── fetchProviders.ts ────────────────────────────────────────────────────────
import type { PurchaseOrder, PurchaseOrderItem, POScheduleEntry } from "../types"

const BASE = "/api/cafeteria/kitchen/meal-purchase-order-approval"

// ─── GET – list all purchase orders ──────────────────────────────────────────
export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
    const res = await fetch(BASE, { cache: "no-store" })
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Failed to fetch purchase orders (${res.status})`)
    }
    const json = await res.json()
    return Array.isArray(json) ? json : (json.data ?? json.content ?? [])
}

// ─── GET – fetch items for a specific purchase order ─────────────────────────
export async function fetchPurchaseOrderItems(id: number): Promise<PurchaseOrderItem[]> {
    const res = await fetch(`${BASE}?id=${id}`, { cache: "no-store" })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? `Failed to fetch purchase order items (${res.status})`)
    }
    const json = await res.json()
    return Array.isArray(json) ? json : (json.data ?? json.content ?? [])
}

// ─── GET – fetch schedule grid for a specific purchase order ─────────────────
export async function fetchPurchaseOrderSchedules(id: number): Promise<POScheduleEntry[]> {
    const res = await fetch(`${BASE}?id=${id}&view=schedules`, { cache: "no-store" })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? `Failed to fetch purchase order schedules (${res.status})`)
    }
    const json = await res.json()
    return Array.isArray(json) ? json : (json.data ?? json.content ?? [])
}

// ─── PATCH – approve a purchase order ────────────────────────────────────────
export async function approvePurchaseOrder(id: number): Promise<void> {
    const res = await fetch(BASE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approved" }),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? `Failed to approve purchase order (${res.status})`)
    }
}

// ─── PATCH – reject (cancel) a purchase order ────────────────────────────────
export async function rejectPurchaseOrder(id: number): Promise<void> {
    const res = await fetch(BASE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "cancelled" }),
    })
    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? `Failed to reject purchase order (${res.status})`)
    }
}
