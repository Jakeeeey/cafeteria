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

import IngredientPriceChangeTable from "./components/IngredientPriceChangeTable"
import IngredientPriceChangeFormDialog from "./components/IngredientPriceChangeFormDialog"
import { fetchIngredients, submitPriceChangeRequest } from "./providers/fetchProvider"
import type { Ingredient, IngredientPriceChangeFormValues } from "./types"

export default function IngredientPriceChangeRequestModule() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const loadIngredients = async () => {
        setIsLoading(true);
        try {
            const data = await fetchIngredients();
            setIngredients(data);
        } catch (error: any) {
            console.error("Failed to fetch ingredients:", error);
            toast.error(error?.message ?? "Failed to load ingredients.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadIngredients();
    }, [])

    const filteredIngredients = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return ingredients

        return ingredients.filter(
            (i) =>
                i.name.toLowerCase().includes(q) ||
                (i.description ?? "").toLowerCase().includes(q) ||
                (i.brand_name ?? "").toLowerCase().includes(q) ||
                (i.category_name ?? "").toLowerCase().includes(q) ||
                (i.supplier_name ?? "").toLowerCase().includes(q)
        )
    }, [ingredients, searchQuery])

    const handleOpenRequestModal = (ingredient: Ingredient) => {
        setSelectedIngredient(ingredient)
        setIsRequestModalOpen(true)
    }

    const handleFormSubmit = async (values: IngredientPriceChangeFormValues) => {
        try {
            await submitPriceChangeRequest(values);
            toast.success("Price change request submitted successfully.");
            setIsRequestModalOpen(false);
        } catch (error: any) {
            toast.error(error?.message ?? "Failed to submit request.");
        }
    }

    return (
        <div className="flex flex-col gap-6 p-1">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Ingredient Price Change Requests</CardTitle>
                        <CardDescription>
                            View ingredients and submit price change requests to the management
                        </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search ingredients..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
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
