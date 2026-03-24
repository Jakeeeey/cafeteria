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
import { fetchIngredients, submitPriceChangeRequest, fetchIngredientOptions, fetchPriceChangeRequests } from "./providers/fetchProvider"
import type { Ingredient, IngredientPriceChangeFormValues, PriceChangeRequest } from "./types"
import type { SelectOption } from "../ingredient-registration/types"

export default function IngredientPriceChangeRequestModule() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [requests, setRequests] = useState<PriceChangeRequest[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [supplierFilter, setSupplierFilter] = useState("all")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const [supplierOptions, setSupplierOptions] = useState<SelectOption[]>([])
    const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [ingData, optData, reqData] = await Promise.all([
                fetchIngredients(),
                fetchIngredientOptions(),
                fetchPriceChangeRequests(),
            ])
            setIngredients(ingData)
            setSupplierOptions(optData.suppliers)
            setCategoryOptions(optData.categories)
            setRequests(reqData)
        } catch (error: unknown) {
            const err = error as Error
            console.error("Failed to fetch data:", err)
            toast.error(err?.message ?? "Failed to load data.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const filteredIngredients = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        const sFilter = supplierFilter === "all" ? null : Number(supplierFilter)
        const cFilter = categoryFilter === "all" ? null : Number(categoryFilter)

        return ingredients
            .filter((i) => {
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
                if (sFilter !== null && i.supplier !== sFilter) return false
                // Category filter
                if (cFilter !== null && i.category_id !== cFilter) return false

                return true
            })
            .sort((a, b) => a.id - b.id)
    }, [ingredients, searchQuery, supplierFilter, categoryFilter])

    const handleOpenRequestModal = (ingredient: Ingredient) => {
        setSelectedIngredient(ingredient)
        setIsRequestModalOpen(true)
    }

    const handleFormSubmit = async (values: IngredientPriceChangeFormValues) => {
        try {
            await submitPriceChangeRequest(values)
            toast.success(values.id ? "Price change request updated." : "Price change request submitted.")
            setIsRequestModalOpen(false)
            loadData()
        } catch (error: unknown) {
            const err = error as Error
            toast.error(err?.message ?? "Failed to save request.")
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
                                        <SelectItem key={opt.value} value={String(opt.value)}>
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
                                        <SelectItem key={opt.value} value={String(opt.value)}>
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
                                onClick={loadData}
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
                        requests={requests}
                        isLoading={isLoading}
                        onRequestChange={handleOpenRequestModal}
                    />
                </CardContent>
            </Card>

            <IngredientPriceChangeFormDialog
                open={isRequestModalOpen}
                onOpenChange={setIsRequestModalOpen}
                ingredient={selectedIngredient}
                activeRequest={selectedIngredient ? requests.find(r => r.ingredient_id === selectedIngredient.id && r.status === "pending") : undefined}
                onSubmit={handleFormSubmit}
            />
        </div>
    )
}
