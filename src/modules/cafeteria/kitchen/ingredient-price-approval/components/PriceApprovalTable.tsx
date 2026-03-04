"use client"

import React, { useState } from "react"
import { Check, X } from "lucide-react"

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
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ingredient Name</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Old Price</TableHead>
                            <TableHead>New Price</TableHead>
                            <TableHead className="w-[180px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`}>
                                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-[160px]" /></TableCell>
                                </TableRow>
                            ))
                        ) : currentRequests.length > 0 ? (
                            currentRequests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-medium">{request.ingredient_name}</TableCell>
                                    <TableCell>{request.unit_abbreviation ?? request.unit_name ?? "N/A"}</TableCell>
                                    <TableCell>{request.unit_count != null ? Number(request.unit_count).toFixed(2) : "0.00"}</TableCell>
                                    <TableCell>₱{Number(request.old_cost).toFixed(2)}</TableCell>
                                    <TableCell>₱{Number(request.new_cost).toFixed(2)}</TableCell>
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
                            ))
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
