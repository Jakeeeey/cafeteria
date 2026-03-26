"use client"

import React, { useState } from "react"

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
}

export default function IngredientPriceListTable({
    ingredients,
    isLoading,
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
                            <TableHead className="w-[50px]">No.</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Unit of Measurement</TableHead>
                            <TableHead className="text-right">Unit Count</TableHead>
                            <TableHead className="text-right">Cost per unit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={`skeleton-${index}`}>
                                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                </TableRow>
                            ))
                        ) : currentIngredients.length > 0 ? (
                            currentIngredients.map((ingredient, index) => (
                                <TableRow key={ingredient.id}>
                                    <TableCell>{startIndex + index + 1}</TableCell>
                                    <TableCell className="font-medium whitespace-nowrap">{ingredient.name}</TableCell>
                                    <TableCell className="max-w-[150px] truncate" title={ingredient.description ?? ""}>
                                        {ingredient.description || "—"}
                                    </TableCell>
                                    <TableCell className="max-w-[100px] truncate" title={ingredient.category_name ?? ""}>
                                        {ingredient.category_name || "—"}
                                    </TableCell>
                                    <TableCell className="max-w-[100px] truncate" title={ingredient.brand_name ?? ""}>
                                        {ingredient.brand_name || "—"}
                                    </TableCell>
                                    <TableCell>
                                        {ingredient.unit_abbreviation
                                            ? `${ingredient.unit_name} (${ingredient.unit_abbreviation})`
                                            : (ingredient.unit_name ?? "—")}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {Number(ingredient.unit_count ?? 0).toLocaleString(undefined, {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 4,
                                        })}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-right">
                                        ₱{ingredient.cost_per_unit != null ? Number(ingredient.cost_per_unit).toFixed(2) : "0.00"}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
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
