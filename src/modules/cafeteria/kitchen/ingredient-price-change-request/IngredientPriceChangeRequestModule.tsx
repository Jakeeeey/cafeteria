"use client"

import React, { useState, useEffect } from "react"
import { Search, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import IngredientPriceChangeTable from "./components/IngredientPriceChangeTable"
import IngredientPriceChangeFormDialog from "./components/IngredientPriceChangeFormDialog"
import { fetchIngredients, submitPriceChangeRequest } from "./providers/fetchProvider"
import type { Ingredient, IngredientPriceChangeFormValues } from "./types"

export default function IngredientPriceChangeRequestModule() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [supplierFilter, setSupplierFilter] = useState("all")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const loadIngredients = async () => {
        setIsLoading(true)
        try {
            const data = await fetchIngredients()
            setIngredients(data)
        } catch (error: any) {
            console.error("Failed to fetch ingredients:", error)
            toast.error(error?.message ?? "Failed to load ingredients.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadIngredients()
    }, [])

    // Derive unique supplier options from loaded data
    const supplierOptions = React.useMemo(() => {
        const seen = new Set<string>()
        return ingredients
            .filter((i) => i.supplier_name)
            .filter((i) => {
                if (seen.has(i.supplier_name!)) return false
                seen.add(i.supplier_name!)
                return true
            })
            .map((i) => ({ label: i.supplier_name!, value: i.supplier_name! }))
    }, [ingredients])

    // Derive unique category options from loaded data
    const categoryOptions = React.useMemo(() => {
        const seen = new Set<string>()
        return ingredients
            .filter((i) => i.category_name)
            .filter((i) => {
                if (seen.has(i.category_name!)) return false
                seen.add(i.category_name!)
                return true
            })
            .map((i) => ({ label: i.category_name!, value: i.category_name! }))
    }, [ingredients])

    const filteredIngredients = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase()

        return ingredients.filter((i) => {
            // Search filter
            if (q) {
                const matchesSearch =
                    i.name.toLowerCase().includes(q) ||
                    (i.description ?? "").toLowerCase().includes(q) ||
                    (i.brand_name ?? "").toLowerCase().includes(q) ||
                    (i.category_name ?? "").toLowerCase().includes(q) ||
                    (i.supplier_name ?? "").toLowerCase().includes(q)
                if (!matchesSearch) return false
            }
            // Supplier filter
            if (supplierFilter !== "all" && i.supplier_name !== supplierFilter) return false
            // Category filter
            if (categoryFilter !== "all" && i.category_name !== categoryFilter) return false

            return true
        })
    }, [ingredients, searchQuery, supplierFilter, categoryFilter])

    const handleOpenRequestModal = (ingredient: Ingredient) => {
        setSelectedIngredient(ingredient)
        setIsRequestModalOpen(true)
    }

    const handleFormSubmit = async (values: IngredientPriceChangeFormValues) => {
        try {
            await submitPriceChangeRequest(values)
            toast.success("Price change request submitted successfully.")
            setIsRequestModalOpen(false)
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to submit request.")
        }
    }

    return (
        <div className="flex flex-col gap-6 p-1">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Ingredient Price Change Requests</CardTitle>
                            <CardDescription>
                                View ingredients and submit price change requests to the management
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                            {/* Search */}
                            <div className="relative w-full sm:w-52">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search ingredients..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Supplier Filter */}
                            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                                <SelectTrigger className="w-full sm:w-44">
                                    <SelectValue placeholder="All Suppliers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Suppliers</SelectItem>
                                    {supplierOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Category Filter */}
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-full sm:w-44">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categoryOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Refresh */}
                            <Button
                                variant="outline"
                                size="icon"
                                title="Refresh list"
                                disabled={isLoading}
                                onClick={loadIngredients}
                                className="w-full sm:w-10 sm:h-10 shrink-0"
                            >
                                <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                                <span className="sr-only">Refresh</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <IngredientPriceChangeTable
                        ingredients={filteredIngredients}
                        isLoading={isLoading}
                        onRequestChange={handleOpenRequestModal}
                    />
                </CardContent>
            </Card>

            <IngredientPriceChangeFormDialog
                open={isRequestModalOpen}
                onOpenChange={setIsRequestModalOpen}
                ingredient={selectedIngredient}
                onSubmit={handleFormSubmit}
            />
        </div>
    )
}
