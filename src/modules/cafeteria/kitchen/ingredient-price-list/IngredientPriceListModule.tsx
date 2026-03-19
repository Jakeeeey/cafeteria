"use client"

import React, { useState, useEffect, useMemo } from "react"
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

import IngredientPriceListTable from "./components/IngredientPriceListTable"
import { fetchActiveIngredients, fetchFilterOptions } from "./providers/fetchProvider"
import type { Ingredient, FilterOptions } from "./types"

export default function IngredientPriceListModule() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [supplierFilter, setSupplierFilter] = useState("all")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [brandFilter, setBrandFilter] = useState("all")
    const [isLoading, setIsLoading] = useState(true)

    const [supplierOptions, setSupplierOptions] = useState<{ value: string; label: string }[]>([])
    const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([])
    const [brandOptions, setBrandOptions] = useState<{ value: string; label: string }[]>([])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [data, options] = await Promise.all([
                fetchActiveIngredients(),
                fetchFilterOptions()
            ])
            setIngredients(data)
            setSupplierOptions(options.suppliers || [])
            setCategoryOptions(options.categories || [])
            setBrandOptions(options.brands || [])
        } catch (error: any) {
            console.error("Failed to load list data:", error)
            toast.error(error?.message ?? "Failed to load ingredients data.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])


    const filteredIngredients = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()

        return ingredients.filter((i) => {
            if (q) {
                const matchesSearch =
                    i.name.toLowerCase().includes(q) ||
                    (i.description ?? "").toLowerCase().includes(q) ||
                    (i.brand_name ?? "").toLowerCase().includes(q) ||
                    (i.category_name ?? "").toLowerCase().includes(q) ||
                    (i.supplier_name ?? "").toLowerCase().includes(q)
                if (!matchesSearch) return false
            }
            if (supplierFilter !== "all" && i.supplier_name !== supplierFilter) return false
            if (categoryFilter !== "all" && i.category_name !== categoryFilter) return false
            if (brandFilter !== "all" && i.brand_name !== brandFilter) return false

            return true
        })
    }, [ingredients, searchQuery, supplierFilter, categoryFilter, brandFilter])

    return (
        <div className="flex flex-col gap-6 p-1">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Ingredient Price List</CardTitle>
                            <CardDescription>
                                View active ingredient prices and details
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                            <div className="relative w-full sm:w-52">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search ingredients..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

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

                            <Select value={brandFilter} onValueChange={setBrandFilter}>
                                <SelectTrigger className="w-full sm:w-44">
                                    <SelectValue placeholder="All Brands" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Brands</SelectItem>
                                    {brandOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

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
                    <IngredientPriceListTable
                        ingredients={filteredIngredients}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
