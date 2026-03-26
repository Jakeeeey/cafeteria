"use client"

import React, { useState } from "react"
import { Eye } from "lucide-react"

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
    onView: (request: PriceRequest) => void
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
    onView,
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
                            <TableHead>Unit of Measurement</TableHead>
                            <TableHead className="text-right">Current Price</TableHead>
                            <TableHead className="text-right">New Price Request</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`}>
                                    {Array.from({ length: 6 }).map((__, ci) => (
                                        <TableCell key={ci}><Skeleton className="h-4 w-full" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : currentRequests.length > 0 ? (
                            currentRequests.map((request) => {
                                return (
                                    <TableRow key={request.id}>
                                        <TableCell className="font-medium whitespace-nowrap py-3">
                                            {request.ingredient_name}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap py-3">
                                            {request.unit_abbreviation ?? request.unit_name ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap py-3">
                                            ₱{Number(request.old_cost).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap font-medium py-3">
                                            ₱{Number(request.new_cost).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground py-3">
                                            {formatDate(request.requested_at)}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Button
                                                size="sm"
                                                onClick={() => onView(request)}
                                                title="View Details"
                                            >
                                                <Eye className="mr-1 h-4 w-4" />View                                                                                     
                                                <span className="sr-only">View</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
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
