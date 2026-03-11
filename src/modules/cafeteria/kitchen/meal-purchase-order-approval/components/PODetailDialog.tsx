"use client"

import React, { useState } from "react"
import { Check, Printer, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import POScheduleGrid from "./POScheduleGrid"
import { printPurchaseOrder } from "./printPurchaseOrder"
import type { PurchaseOrder, PurchaseOrderItem, POScheduleEntry } from "../types"

interface PODetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    order: PurchaseOrder | null
    items: PurchaseOrderItem[]
    isLoadingItems: boolean
    scheduleEntries: POScheduleEntry[]
    isLoadingSchedules: boolean
    onApprove: (order: PurchaseOrder) => Promise<void>
    onReject: (order: PurchaseOrder) => Promise<void>
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
}

    export default function PODetailDialog({
    open,
    onOpenChange,
    order,
    items,
    isLoadingItems,
    scheduleEntries,
    isLoadingSchedules,
    onApprove,
    onReject,
}: PODetailDialogProps) {
    const [isApproving, setIsApproving] = useState(false)
    const [isRejecting, setIsRejecting] = useState(false)

    React.useEffect(() => {
        if (!open) {
            setIsApproving(false)
            setIsRejecting(false)
        }
    }, [open])

    const handleApprove = async () => {
        if (!order) return
        setIsApproving(true)
        try {
            await onApprove(order)
            // Auto-print after successful approval
            printPurchaseOrder(order, items, scheduleEntries)
        } finally {
            setIsApproving(false)
        }
    }

    const handleReject = async () => {
        if (!order) return
        setIsRejecting(true)
        try {
            await onReject(order)
        } finally {
            setIsRejecting(false)
        }
    }

    const isPending = order?.status === "Pending"
    const isSubmitting = isApproving || isRejecting

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Purchase Order #{order?.id}</DialogTitle>
                    <DialogDescription>
                        Schedule period:{" "}
                        {order ? `${formatDate(order.date_from)} - ${formatDate(order.date_to)}` : ""}
                    </DialogDescription>
                </DialogHeader>

                {order && (
                    <div className="flex flex-col gap-4 overflow-y-auto pr-1">

                        {/* Status */}
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge
                                variant={
                                    order.status === "Approved" || order.status === "Ordered" || order.status === "Received"
                                        ? "default"
                                        : order.status === "Cancelled"
                                        ? "destructive"
                                        : "secondary"
                                }
                            >
                                {order.status}
                            </Badge>
                        </div>

                        <Separator />

                        {/* Schedule Grid */}
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-semibold">Scheduled Meals</p>
                            <POScheduleGrid
                                entries={scheduleEntries}
                                isLoading={isLoadingSchedules}
                                dateFrom={order.date_from}
                            />
                        </div>

                        <Separator />

                        {/* Ingredient items table */}
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-semibold">Required Ingredients</p>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ingredient</TableHead>
                                            <TableHead>Unit</TableHead>
                                            <TableHead className="text-right">Required Quantity</TableHead>
                                            <TableHead className="text-right">Estimated Cost</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingItems ? (
                                            Array.from({ length: 4 }).map((_, i) => (
                                                <TableRow key={`sk-${i}`}>
                                                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : items.length > 0 ? (
                                            items.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">
                                                        {item.ingredient_name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.unit_abbreviation ?? item.unit_name ?? "N/A"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {Number(item.required_quantity).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        ₱{Number(item.estimated_cost).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                                                    No items found for this purchase order.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex justify-end">
                            <div className="rounded-lg bg-muted px-4 py-2 text-sm">
                                <span className="text-muted-foreground mr-3">Total Estimated Cost:</span>
                                <span className="font-semibold text-base">
                                    &#8369;{Number(order.total_estimated_cost).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Actions - only for Pending */}
                        {isPending && (
                            <>
                                <Separator />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => order && printPurchaseOrder(order, items, scheduleEntries)}
                                        disabled={isSubmitting}
                                    >
                                        <Printer className="mr-1 h-4 w-4" />
                                        Print PDF
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                        disabled={isSubmitting}
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleReject}
                                        disabled={isSubmitting}
                                    >
                                        <X className="mr-1 h-4 w-4" />
                                        {isRejecting ? "Rejecting..." : "Reject"}
                                    </Button>
                                    <Button
                                        onClick={handleApprove}
                                        disabled={isSubmitting}
                                    >
                                        <Check className="mr-1 h-4 w-4" />
                                        {isApproving ? "Approving..." : "Approve"}
                                    </Button>
                                </div>
                            </>
                        )}

                        {!isPending && (
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => order && printPurchaseOrder(order, items, scheduleEntries)}
                                >
                                    <Printer className="mr-1 h-4 w-4" />
                                    Print PDF
                                </Button>
                                <Button variant="outline" onClick={() => onOpenChange(false)}>
                                    Close
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
