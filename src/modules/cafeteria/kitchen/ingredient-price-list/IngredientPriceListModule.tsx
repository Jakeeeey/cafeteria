"use client"

import React, { useEffect, useMemo, useState } from "react"
import { PrinterIcon, RefreshCwIcon, Search } from "lucide-react"
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
import { SearchableSelect } from "@/components/ui/searchable-select"

import IngredientPriceListTable from "./components/IngredientPriceListTable"
import { fetchActiveIngredients, fetchFilterOptions } from "./providers/fetchProvider"
import type { Ingredient } from "./types"
import { printIngredientPriceList } from "./utils/printIngredientPriceList"

export default function IngredientPriceListModule() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [brandFilter, setBrandFilter] = useState("all")
    const [isLoading, setIsLoading] = useState(true)

    const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([])
    const [brandOptions, setBrandOptions] = useState<{ value: string; label: string }[]>([])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [data, options] = await Promise.all([
                fetchActiveIngredients(),
                fetchFilterOptions(),
            ])
            setIngredients(data)
            setCategoryOptions(options.categories || [])
            setBrandOptions(options.brands || [])
        } catch (error: unknown) {
            const err = error as Error
            console.error("Failed to load list data:", err)
            toast.error(err?.message ?? "Failed to load ingredients data.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const filteredIngredients = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        const cFilter = categoryFilter === "all" ? null : Number(categoryFilter)
        const bFilter = brandFilter === "all" ? null : Number(brandFilter)

        return ingredients.filter((i) => {
            if (q) {
                const matchesSearch = 
                    i.name.toLowerCase().includes(q) ||
                    (i.description ?? "").toLowerCase().includes(q) ||
                    (i.brand_name ?? "").toLowerCase().includes(q) ||
                    (i.category_name ?? "").toLowerCase().includes(q)
                
                if (!matchesSearch) return false
            }
            if (cFilter !== null && i.category_id !== cFilter) return false
            if (bFilter !== null && i.brand_id !== bFilter) return false

            return true
        })
    }, [ingredients, searchQuery, categoryFilter, brandFilter])

    const categoryFilterOptions = useMemo(() => 
        [{ value: "all", label: "All Categories" }, ...categoryOptions],
        [categoryOptions]
    )

    const brandFilterOptions = useMemo(() => 
        [{ value: "all", label: "All Brands" }, ...brandOptions],
        [brandOptions]
    )

    return (
        <div className="flex flex-col gap-6 p-1">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Ingredient Price List</CardTitle>
                            <CardDescription>View active ingredient prices and details</CardDescription>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, brand, category..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <SearchableSelect
                                value={categoryFilter}
                                onValueChange={setCategoryFilter}
                                options={categoryFilterOptions}
                                placeholder="All Categories"
                                className="w-full sm:w-44"
                            />

                            <SearchableSelect
                                value={brandFilter}
                                onValueChange={setBrandFilter}
                                options={brandFilterOptions}
                                placeholder="All Brands"
                                className="w-full sm:w-44"
                            />

                            <Button
                                variant="outline"
                                size="icon"
                                title="Print list"
                                disabled={isLoading || filteredIngredients.length === 0}
                                onClick={() => {
                                    printIngredientPriceList(filteredIngredients)
                                    toast.success("Generating printable report...")
                                }}
                                className="w-full sm:w-10 sm:h-10 shrink-0 border-primary/20 hover:bg-primary/5 hover:text-primary"
                            >
                                <PrinterIcon className="size-4" />
                                <span className="sr-only">Print</span>
                            </Button>

                            <Button
                                variant="outline"
                                size="icon"
                                title="Refresh list"
                                disabled={isLoading}
                                onClick={() => {
                                    setSearchQuery("")
                                    setCategoryFilter("all")
                                    setBrandFilter("all")
                                    loadData()
                                }}
                                className="w-full sm:w-10 sm:h-10 shrink-0"
                            >
                                <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                                <span className="sr-only">Refresh</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <IngredientPriceListTable ingredients={filteredIngredients} isLoading={isLoading} />
                </CardContent>
            </Card>
        </div>
    )
}
