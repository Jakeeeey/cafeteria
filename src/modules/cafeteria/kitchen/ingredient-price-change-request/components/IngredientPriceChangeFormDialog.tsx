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

import type { Ingredient, IngredientPriceChangeFormValues, PriceChangeRequest } from "../types"

interface IngredientPriceChangeFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    ingredient: Ingredient | null
    activeRequest?: PriceChangeRequest
    onSubmit: (values: IngredientPriceChangeFormValues) => Promise<void>
}

export default function IngredientPriceChangeFormDialog({
    open,
    onOpenChange,
    ingredient,
    activeRequest,
    onSubmit,
}: IngredientPriceChangeFormDialogProps) {
    const [requestedPrice, setRequestedPrice] = useState("")
    const [reason, setReason] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const isEdit = !!activeRequest

    // Reset form when opened with a new ingredient or pre-fill if editing
    React.useEffect(() => {
        if (open) {
            if (activeRequest) {
                // Ensure exactly 2 decimal places when pre-filling
                setRequestedPrice(Number(activeRequest.new_cost).toFixed(2))
                setReason(activeRequest.request_reason || "")
            } else {
                setRequestedPrice("")
                setReason("")
            }
        }
    }, [open, ingredient, activeRequest])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!ingredient) return

        if (!requestedPrice || !reason.trim()) {
            toast.error("Please fill in all required fields.")
            return
        }

        if (parseFloat(requestedPrice) <= 0) {
            toast.error("Price must be greater than zero.")
            return
        }

        setIsSubmitting(true)
        try {
            await onSubmit({
                id: activeRequest?.id,
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
                    <DialogTitle>{isEdit ? "Edit Price Change Request" : "Request Price Change"}</DialogTitle>
                    <DialogDescription>
                        {isEdit 
                            ? "Modify your existing price change request before it's processed."
                            : "Submit a requested price change for the selected ingredient."}
                    </DialogDescription>
                </DialogHeader>

                {ingredient && (
                    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                        <div className="rounded-lg bg-muted p-4 grid gap-3">
                            <div className="grid grid-cols-2 text-sm border-b pb-2 last:border-0 last:pb-0">
                                <span className="text-muted-foreground font-semibold uppercase tracking-tighter text-[11px]">Name:</span>
                                <span className="font-medium">{ingredient.name}</span>
                            </div>
                            <div className="grid grid-cols-2 text-sm border-b pb-2 last:border-0 last:pb-0">
                                <span className="text-muted-foreground font-semibold uppercase tracking-tighter text-[11px]">Description:</span>
                                <span className="font-medium">{ingredient.description || "—"}</span>
                            </div>
                            <div className="grid grid-cols-2 text-sm border-b pb-2 last:border-0 last:pb-0">
                                <span className="text-muted-foreground font-semibold uppercase tracking-tighter text-[11px]">Brand:</span>
                                <span className="font-medium">{ingredient.brand_name || "—"}</span>
                            </div>
                            <div className="grid grid-cols-2 text-sm border-b pb-2 last:border-0 last:pb-0">
                                <span className="text-muted-foreground font-semibold uppercase tracking-tighter text-[11px]">Category:</span>
                                <span className="font-medium">{ingredient.category_name || "—"}</span>
                            </div>
                            <div className="grid grid-cols-2 text-sm border-b pb-2 last:border-0 last:pb-0">
                                <span className="text-muted-foreground font-semibold uppercase tracking-tighter text-[11px]">Total Quantity (Unit Count):</span>
                                <span className="font-medium">
                                    {ingredient.unit_count != null ? Number(ingredient.unit_count).toFixed(2) : "0.00"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 text-sm border-b pb-2 last:border-0 last:pb-0">
                                <span className="text-muted-foreground font-semibold uppercase tracking-tighter text-[11px]">Unit:</span>
                                <span className="font-medium">
                                    {ingredient.unit_name || "N/A"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 text-sm border-b pb-2 last:border-0 last:pb-0">
                                <span className="text-muted-foreground font-semibold uppercase tracking-tighter text-[11px]">Current Price:</span>
                                <span className="font-medium font-mono">
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
                                    min="0"
                                    placeholder="0.00"
                                    className="font-mono font-medium"
                                    value={requestedPrice}
                                    onChange={(e) => setRequestedPrice(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason for Price Change *</Label>
                            <span className="text-xs text-muted-foreground">Please provide a valid business reason.</span>
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
                            <Button type="submit" disabled={isSubmitting} className={isEdit ? "bg-amber-600 hover:bg-amber-700" : ""}>
                                {isSubmitting ? "Saving..." : (isEdit ? "Update Request" : "Submit Request")}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
