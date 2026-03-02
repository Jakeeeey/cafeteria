"use client"

import * as React from "react"
import { RefreshCwIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import PriceApprovalTable from "./components/PriceApprovalTable"
import ApproveDialog from "./components/ApproveDialog"
import RejectConfirmDialog from "./components/RejectConfirmDialog"
import { fetchPriceRequests, approveRequest, rejectRequest } from "./providers/fetchProvider"
import type { PriceRequest, ApproveValues, RejectValues } from "./types"

export default function IngredientPriceApprovalModule() {
    const [requests, setRequests] = React.useState<PriceRequest[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [search, setSearch] = React.useState("")

    const [selectedRequest, setSelectedRequest] = React.useState<PriceRequest | null>(null)
    const [isApproveDialogOpen, setIsApproveDialogOpen] = React.useState(false)
    const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false)

    const loadRequests = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await fetchPriceRequests()
            setRequests(data)
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to load price requests.")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        loadRequests()
    }, [loadRequests])

    function handleOpenApprove(request: PriceRequest) {
        setSelectedRequest(request)
        setIsApproveDialogOpen(true)
    }

    function handleOpenReject(request: PriceRequest) {
        setSelectedRequest(request)
        setIsRejectDialogOpen(true)
    }

    async function handleApprove(values: ApproveValues) {
        try {
            await approveRequest(values)
            toast.success("Price change request approved successfully.")
            setIsApproveDialogOpen(false)
            await loadRequests()
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to approve request.")
            throw error
        }
    }

    const filteredRequests = React.useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return requests
        return requests.filter(
            (r) =>
                r.ingredient_name.toLowerCase().includes(q) ||
                (r.unit_name ?? "").toLowerCase().includes(q) ||
                (r.request_reason ?? "").toLowerCase().includes(q)
        )
    }, [requests, search])

    async function handleReject(values: RejectValues) {
        try {
            await rejectRequest(values)
            toast.success("Price change request rejected.")
            setIsRejectDialogOpen(false)
            await loadRequests()
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to reject request.")
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

            {/* ─ Search ───────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2">
                <Input
                    className="h-9 w-64"
                    placeholder="Search by ingredient, unit, reason…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {search.trim() !== "" && (
                    <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                        <XIcon className="size-3.5 mr-1" />
                        Clear
                    </Button>
                )}
            </div>

            {/* ─ Table ────────────────────────────────────────────────────────── */}
            <PriceApprovalTable
                requests={filteredRequests}
                isLoading={isLoading}
                onApprove={handleOpenApprove}
                onReject={handleOpenReject}
            />

            {/* ─ Dialogs ──────────────────────────────────────────────────────── */}
            <ApproveDialog
                open={isApproveDialogOpen}
                onOpenChange={setIsApproveDialogOpen}
                request={selectedRequest}
                onApprove={handleApprove}
            />

            <RejectConfirmDialog
                open={isRejectDialogOpen}
                onOpenChange={setIsRejectDialogOpen}
                request={selectedRequest}
                onReject={handleReject}
            />
        </div>
    )
}
