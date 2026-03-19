"use client"

import * as React from "react"
import { RefreshCwIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import PriceApprovalTable from "./components/PriceApprovalTable"
import ApproveDialog from "./components/ApproveDialog"
import { fetchPriceRequests, approveRequest, rejectRequest } from "./providers/fetchProvider"
import type { PriceRequest, ApproveValues, RejectValues } from "./types"

export default function IngredientPriceApprovalModule() {
    const [requests, setRequests] = React.useState<PriceRequest[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")
    const [supplierFilter, setSupplierFilter] = React.useState("all")

    const [selectedRequest, setSelectedRequest] = React.useState<PriceRequest | null>(null)
    const [isApproveDialogOpen, setIsApproveDialogOpen] = React.useState(false)

    const loadRequests = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await fetchPriceRequests()
            setRequests(data)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to load price requests.")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        loadRequests()
    }, [loadRequests])

    function handleOpenView(request: PriceRequest) {
        setSelectedRequest(request)
        setIsApproveDialogOpen(true)
    }

    async function handleApprove(values: ApproveValues) {
        try {
            await approveRequest(values)
            toast.success("Price change request approved successfully.")
            setIsApproveDialogOpen(false)
            await loadRequests()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to approve request.")
            throw error
        }
    }

    const filteredRequests = React.useMemo(() => {
        const q = search.trim().toLowerCase()
        return requests.filter((r) => {
            if (supplierFilter !== "all" && (r.supplier_name ?? "") !== supplierFilter) return false
            if (!q) return true
            return (
                r.ingredient_name.toLowerCase().includes(q) ||
                (r.supplier_name ?? "").toLowerCase().includes(q) ||
                (r.unit_name ?? "").toLowerCase().includes(q) ||
                (r.request_reason ?? "").toLowerCase().includes(q) ||
                (r.requested_by_name ?? "").toLowerCase().includes(q)
            )
        })
    }, [requests, search, supplierFilter])

    const supplierOptions = React.useMemo(() => {
        const names = Array.from(
            new Set(requests.map((r) => r.supplier_name).filter(Boolean) as string[])
        ).sort()
        return names
    }, [requests])

    async function handleReject(values: RejectValues) {
        try {
            await rejectRequest(values)
            toast.success("Price change request rejected.")
            setIsApproveDialogOpen(false)
            await loadRequests()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to reject request.")
            throw error
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {/* ─ Toolbar ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                        Ingredient Price Approval
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Review and approve or reject pending ingredient price change requests.
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        title="Refresh list"
                        disabled={isLoading}
                        onClick={loadRequests}
                    >
                        <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                        <span className="sr-only">Refresh</span>
                    </Button>
                </div>
            </div>

            {/* ─ Search / Filters ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2">
                <Input
                    className="h-9 w-64"
                    placeholder="Search ingredient, supplier, reason…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="h-9 w-48">
                        <SelectValue placeholder="All Suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Suppliers</SelectItem>
                        {supplierOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                                {name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {(search.trim() !== "" || supplierFilter !== "all") && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSearch(""); setSupplierFilter("all") }}
                    >
                        <XIcon className="size-3.5 mr-1" />
                        Clear filters
                    </Button>
                )}
            </div>

            {/* ─ Table ────────────────────────────────────────────────────────── */}
            <PriceApprovalTable
                requests={filteredRequests}
                isLoading={isLoading}
                onView={handleOpenView}
            />

            {/* ─ Dialogs ──────────────────────────────────────────────────────── */}
            <ApproveDialog
                open={isApproveDialogOpen}
                onOpenChange={setIsApproveDialogOpen}
                request={selectedRequest}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        </div>
    )
}
