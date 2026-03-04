"use client"

import React, { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import type { Ingredient, IngredientPriceChangeFormValues } from "../types"

interface IngredientPriceChangeFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    ingredient: Ingredient | null
    onSubmit: (values: IngredientPriceChangeFormValues) => Promise<void>
}

export default function IngredientPriceChangeFormDialog({
    open,
    onOpenChange,
    ingredient,
    onSubmit,
}: IngredientPriceChangeFormDialogProps) {
    const [requestedPrice, setRequestedPrice] = useState("")
    const [reason, setReason] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reset form when opened with a new ingredient
    React.useEffect(() => {
        if (open) {
            setRequestedPrice("")
            setReason("")
        }
    }, [open, ingredient])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!ingredient) return

        if (!requestedPrice || !reason.trim()) {
            toast.error("Please fill in all required fields.")
            return
        }

        setIsSubmitting(true)
        try {
            await onSubmit({
                ingredient_id: ingredient.id,
                requested_price: parseFloat(requestedPrice),
                reason: reason.trim(),
                old_price: Number(ingredient.cost_per_unit || 0),
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Request Price Change</DialogTitle>
                    <DialogDescription>
                        Submit a requested price change for the selected ingredient.
                    </DialogDescription>
                </DialogHeader>

                {ingredient && (
                    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                        <div className="rounded-lg bg-muted p-4 grid gap-3">
                            <div className="grid grid-cols-2 text-sm">
                                <span className="text-muted-foreground">Ingredient:</span>
                                <span className="font-medium">{ingredient.name}</span>
                            </div>
                            <div className="grid grid-cols-2 text-sm">
                                <span className="text-muted-foreground">Quantity:</span>
                                <span className="font-medium">
                                    {ingredient.unit_count != null ? Number(ingredient.unit_count).toFixed(2) : "0.00"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 text-sm">
                                <span className="text-muted-foreground">Unit:</span>
                                <span className="font-medium">
                                    {ingredient.unit_abbreviation ?? ingredient.unit_name ?? "N/A"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 text-sm">
                                <span className="text-muted-foreground">Current Price:</span>
                                <span className="font-medium">
                                    ₱{ingredient.cost_per_unit != null ? Number(ingredient.cost_per_unit).toFixed(2) : "0.00"}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="new-price">Requested Price (₱) *</Label>
                                <Input
                                    id="new-price"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={requestedPrice}
                                    onChange={(e) => setRequestedPrice(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason for Price Change *</Label>
                            <Textarea
                                id="reason"
                                placeholder="Explain why the price needs to be changed..."
                                className="min-h-[100px] resize-none"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Submitting..." : "Submit Request"}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
