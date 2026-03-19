"use client"

import React, { useState } from "react"
import { Eye } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import type { PurchaseOrder } from "../types"

const ITEMS_PER_PAGE = 10

interface PurchaseOrderTableProps {
    orders: PurchaseOrder[]
    isLoading: boolean
    onViewDetail: (order: PurchaseOrder) => void
}

function statusVariant(status: PurchaseOrder["status"]): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "Approved":
        case "Ordered":
        case "Received":
            return "default"
        case "Pending":
            return "secondary"
        case "Cancelled":
            return "destructive"
        default:
            return "outline"
    }
}

function formatDateRange(dateFrom: string, dateTo: string): string {
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
    const yearOptions: Intl.DateTimeFormatOptions = { year: "numeric" }

    const startStr = from.toLocaleDateString("en-US", options)
    const endStr = to.toLocaleDateString("en-US", options)
    const yearStr = to.toLocaleDateString("en-US", yearOptions)

    return `${startStr} – ${endStr}, ${yearStr}`
}

export default function PurchaseOrderTable({
    orders,
    isLoading,
    onViewDetail,
}: PurchaseOrderTableProps) {
    const [currentPage, setCurrentPage] = useState(1)

    // Reset to page 1 whenever the filtered list changes
    React.useEffect(() => { setCurrentPage(1) }, [orders])

    const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const currentOrders = orders.slice(startIndex, startIndex + ITEMS_PER_PAGE)

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">PO #</TableHead>
                            <TableHead>Date Range</TableHead>
                            <TableHead>Meals</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Total Estimated Cost</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`}>
                                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                                </TableRow>
                            ))
                        ) : currentOrders.length > 0 ? (
                            currentOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.id}</TableCell>
                                    <TableCell>{formatDateRange(order.date_from, order.date_to)}</TableCell>
                                    <TableCell>
                                        {order.meal_names.length > 0
                                            ? order.meal_names.join(", ")
                                            : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>
                                        {order.meal_categories.length > 0
                                            ? order.meal_categories.join(", ")
                                            : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>₱{Number(order.total_estimated_cost).toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant(order.status)}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            onClick={() => onViewDetail(order)}
                                        >
                                            <Eye className="mr-1 h-4 w-4" />
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No purchase orders found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2">
                    <div className="text-sm text-muted-foreground mr-4">
                        Page {currentPage} of {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}
