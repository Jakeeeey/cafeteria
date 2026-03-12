"use client"

import React, { useState } from "react"
import { Check, X, TrendingUp, TrendingDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

import type { PriceRequest } from "../types"

const ITEMS_PER_PAGE = 10

interface PriceApprovalTableProps {
    requests: PriceRequest[]
    isLoading: boolean
    onApprove: (request: PriceRequest) => void
    onReject: (request: PriceRequest) => void
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—"
    try {
        return new Intl.DateTimeFormat("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(dateStr))
    } catch {
        return dateStr
    }
}

export default function PriceApprovalTable({
    requests,
    isLoading,
    onApprove,
    onReject,
}: PriceApprovalTableProps) {
    const [currentPage, setCurrentPage] = useState(1)

    const totalPages = Math.ceil(requests.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const currentRequests = requests.slice(startIndex, startIndex + ITEMS_PER_PAGE)

    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1)
    }

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1)
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ingredient Name</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Unit of Measurement</TableHead>
                            <TableHead className="text-right">Current Price</TableHead>
                            <TableHead className="text-right">New Price Request</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                            <TableHead>Requested By</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="w-[160px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`}>
                                    {Array.from({ length: 10 }).map((__, ci) => (
                                        <TableCell key={ci}><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : currentRequests.length > 0 ? (
                            currentRequests.map((request) => {
                                const diff = Number(request.new_cost) - Number(request.old_cost)
                                const pct = Number(request.old_cost) !== 0
                                    ? (diff / Number(request.old_cost)) * 100
                                    : 0
                                const isIncrease = diff >= 0

                                return (
                                    <TableRow key={request.id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {request.ingredient_name}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {request.supplier_name ?? <span className="text-muted-foreground">—</span>}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {request.unit_abbreviation ?? request.unit_name ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            ₱{Number(request.old_cost).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap font-medium">
                                            ₱{Number(request.new_cost).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 text-sm font-medium ${isIncrease ? "text-destructive" : "text-green-600"}`}>
                                                {isIncrease
                                                    ? <TrendingUp className="h-3.5 w-3.5" />
                                                    : <TrendingDown className="h-3.5 w-3.5" />
                                                }
                                                {isIncrease ? "+" : ""}₱{Math.abs(diff).toFixed(2)}
                                                <span className="text-muted-foreground font-normal">
                                                    ({isIncrease ? "+" : ""}{pct.toFixed(1)}%)
                                                </span>
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {request.requested_by_name ?? <span className="text-muted-foreground text-xs">ID: {request.requested_by}</span>}
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            {request.request_reason
                                                ? <span className="line-clamp-2 text-sm">{request.request_reason}</span>
                                                : <span className="text-muted-foreground">—</span>
                                            }
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                            {formatDate(request.requested_at)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => onApprove(request)}
                                                >
                                                    <Check className="mr-1 h-4 w-4" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => onReject(request)}
                                                >
                                                    <X className="mr-1 h-4 w-4" />
                                                    Reject
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">
                                    No pending price requests found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2">
                    <div className="text-sm text-muted-foreground mr-4">
                        Page {currentPage} of {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevious}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}
