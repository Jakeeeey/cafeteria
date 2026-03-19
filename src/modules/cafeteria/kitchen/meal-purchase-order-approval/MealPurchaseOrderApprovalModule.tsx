"use client"

import * as React from "react"
import { FilterXIcon, RefreshCwIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"

import PurchaseOrderTable from "./components/PurchaseOrderTable"
import PODetailDialog from "./components/PODetailDialog"
import {
    fetchPurchaseOrders,
    fetchPurchaseOrderItems,
    fetchPurchaseOrderSchedules,
    approvePurchaseOrder,
    rejectPurchaseOrder,
} from "./providers/fetchProviders"
import type { PurchaseOrder, PurchaseOrderItem, POScheduleEntry } from "./types"

const STATUS_OPTIONS = [
    { label: "All Statuses", value: "" },
    { label: "Pending", value: "Pending" },
    { label: "Approved", value: "Approved" },
    { label: "Ordered", value: "Ordered" },
    { label: "Received", value: "Received" },
    { label: "Cancelled", value: "Cancelled" },
] as const

// Helper functions for date range
function getMondayOfWeek(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

function getSaturdayOfWeek(monday: Date): Date {
    const saturday = new Date(monday)
    saturday.setDate(monday.getDate() + 5)
    return saturday
}

function shiftWeek(date: Date, weeks: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + weeks * 7)
    return result
}

function formatDateRange(monday: Date): string {
    const saturday = getSaturdayOfWeek(monday)
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
    const yearOptions: Intl.DateTimeFormatOptions = { year: "numeric" }

    const startStr = monday.toLocaleDateString("en-US", options)
    const endStr = saturday.toLocaleDateString("en-US", options)
    const yearStr = saturday.toLocaleDateString("en-US", yearOptions)

    return `${startStr} – ${endStr}, ${yearStr}`
}

function toISODate(date: Date): string {
    return date.toISOString().split('T')[0]
}

export default function MealPurchaseOrderApprovalModule() {
    // ─── Data ─────────────────────────────────────────────────────────────────
    const [orders, setOrders] = React.useState<PurchaseOrder[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    // ─── Filters ──────────────────────────────────────────────────────────────
    const [search, setSearch] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState("")
    const [currentMonday, setCurrentMonday] = React.useState<Date | null>(null)

    const dateRange = React.useMemo(() =>
        currentMonday ? formatDateRange(currentMonday) : null,
        [currentMonday]
    )

    const dateFrom = React.useMemo(() =>
        currentMonday ? toISODate(currentMonday) : "",
        [currentMonday]
    )

    const dateTo = React.useMemo(() =>
        currentMonday ? toISODate(getSaturdayOfWeek(currentMonday)) : "",
        [currentMonday]
    )

    // ─── Detail dialog ────────────────────────────────────────────────────────
    const [selectedOrder, setSelectedOrder] = React.useState<PurchaseOrder | null>(null)
    const [isDetailOpen, setIsDetailOpen] = React.useState(false)
    const [items, setItems] = React.useState<PurchaseOrderItem[]>([])
    const [isLoadingItems, setIsLoadingItems] = React.useState(false)
    const [scheduleEntries, setScheduleEntries] = React.useState<POScheduleEntry[]>([])
    const [isLoadingSchedules, setIsLoadingSchedules] = React.useState(false)

    // ─── Load ─────────────────────────────────────────────────────────────────
    const loadOrders = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await fetchPurchaseOrders()
            setOrders(data)
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to load purchase orders.")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => { loadOrders() }, [loadOrders])

    // ─── Filtered list ────────────────────────────────────────────────────────
    const filteredOrders = React.useMemo(() => {
        return orders.filter((o) => {
            if (search.trim()) {
                const q = search.trim().toLowerCase()
                const match =
                    String(o.id).includes(q) ||
                    o.status.toLowerCase().includes(q) ||
                    o.date_from.includes(q) ||
                    o.date_to.includes(q)
                if (!match) return false
            }
            if (statusFilter && o.status !== statusFilter) return false

            // Date range filter: show orders that overlap with the selected week
            // An order overlaps if: order_end >= week_start AND order_start <= week_end
            if (dateFrom && dateTo) {
                if (o.date_to < dateFrom || o.date_from > dateTo) {
                    return false
                }
            }

            return true
        })
    }, [orders, search, statusFilter, dateFrom, dateTo])

    const isFiltered = search.trim() !== "" || statusFilter !== "" || currentMonday !== null

    function clearFilters() {
        setSearch("")
        setStatusFilter("")
        setCurrentMonday(null)
    }

    // ─── Week navigation handlers ────────────────────────────────────────────
    function goToPrevWeek() {
        if (currentMonday) {
            setCurrentMonday(shiftWeek(currentMonday, -1))
        }
    }

    function goToNextWeek() {
        if (currentMonday) {
            setCurrentMonday(shiftWeek(currentMonday, 1))
        }
    }

    function setThisWeek() {
        setCurrentMonday(getMondayOfWeek(new Date()))
    }

    // ─── Handlers ─────────────────────────────────────────────────────────────
    async function handleViewDetail(order: PurchaseOrder) {
        setSelectedOrder(order)
        setItems([])
        setScheduleEntries([])
        setIsDetailOpen(true)
        setIsLoadingItems(true)
        setIsLoadingSchedules(true)
        try {
            const [itemData, scheduleData] = await Promise.all([
                fetchPurchaseOrderItems(order.id),
                fetchPurchaseOrderSchedules(order.id),
            ])
            setItems(itemData)
            setScheduleEntries(scheduleData)
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to load purchase order details.")
        } finally {
            setIsLoadingItems(false)
            setIsLoadingSchedules(false)
        }
    }

    async function handleApprove(order: PurchaseOrder) {
        try {
            await approvePurchaseOrder(order.id)
            toast.success(`Purchase Order #${order.id} has been approved.`)
            setIsDetailOpen(false)
            await loadOrders()
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to approve purchase order.")
            throw error
        }
    }

    async function handleReject(order: PurchaseOrder) {
        try {
            await rejectPurchaseOrder(order.id)
            toast.success(`Purchase Order #${order.id} has been rejected.`)
            setIsDetailOpen(false)
            await loadOrders()
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to reject purchase order.")
            throw error
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-4">

            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Meal Purchase Order Approval</h2>
                    <p className="text-sm text-muted-foreground">
                        Review and approve or reject pending meal purchase orders.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    title="Refresh"
                    disabled={isLoading}
                    onClick={loadOrders}
                >
                    <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                    <span className="sr-only">Refresh</span>
                </Button>
            </div>

            <Separator />

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
               

                {/* Status */}
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Status</span>
                    <NativeSelect
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-44"
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </NativeSelect>
                </div>

                {/* Date Range */}
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Date Range</span>
                    {currentMonday ? (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={goToPrevWeek}
                                title="Previous week"
                            >
                                <ChevronLeftIcon className="size-4" />
                            </Button>
                            <span className="text-sm font-medium tabular-nums min-w-[180px] text-center">
                                {dateRange}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={goToNextWeek}
                                title="Next week"
                            >
                                <ChevronRightIcon className="size-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="h-9"
                            onClick={setThisWeek}
                        >
                            Set This Week
                        </Button>
                    )}
                </div>

                {/* Clear filters */}
                {isFiltered && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-0.5">
                        <FilterXIcon className="size-4 mr-1" />
                        Clear Filters
                    </Button>
                )}
            </div>

            {/* Result count */}
            {!isLoading && (
                <p className="text-xs text-muted-foreground">
                    Showing {filteredOrders.length} of {orders.length} purchase order{orders.length !== 1 ? "s" : ""}
                </p>
            )}

            {/* Table */}
            <PurchaseOrderTable
                orders={filteredOrders}
                isLoading={isLoading}
                onViewDetail={handleViewDetail}
            />

            {/* Detail Dialog */}
            <PODetailDialog
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                order={selectedOrder}
                items={items}
                isLoadingItems={isLoadingItems}
                scheduleEntries={scheduleEntries}
                isLoadingSchedules={isLoadingSchedules}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        </div>
    )
}
