"use client"

import React, { useState } from "react"
import { ArrowRightLeft } from "lucide-react"

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

import type { Ingredient } from "../types"

const ITEMS_PER_PAGE = 10

interface IngredientTableProps {
    ingredients: Ingredient[]
    isLoading: boolean
    onRequestChange: (ingredient: Ingredient) => void
}

export default function IngredientPriceChangeTable({
    ingredients,
    isLoading,
    onRequestChange,
}: IngredientTableProps) {
    const [currentPage, setCurrentPage] = useState(1)

    const totalPages = Math.ceil(ingredients.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const currentIngredients = ingredients.slice(startIndex, startIndex + ITEMS_PER_PAGE)

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
                            <TableHead>Cost Per Unit</TableHead>
                            <TableHead className="w-[200px]">Actions</TableHead>
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
                                    <TableCell><Skeleton className="h-8 w-[160px]" /></TableCell>
                                </TableRow>
                            ))
                        ) : currentIngredients.length > 0 ? (
                            currentIngredients.map((ingredient) => (
                                <TableRow key={ingredient.id}>
                                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                                    <TableCell>{ingredient.unit_abbreviation ?? ingredient.unit_name ?? "N/A"}</TableCell>
                                    <TableCell>{ingredient.unit_count != null ? Number(ingredient.unit_count).toFixed(2) : "0.00"}</TableCell>
                                    <TableCell>₱{ingredient.cost_per_unit != null ? Number(ingredient.cost_per_unit).toFixed(2) : "0.00"}</TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            onClick={() => onRequestChange(ingredient)}
                                        >
                                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                                            Request Price Change
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No ingredients found.
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
