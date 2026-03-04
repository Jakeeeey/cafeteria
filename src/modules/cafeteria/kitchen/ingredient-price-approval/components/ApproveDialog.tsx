"use client"

import React, { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import type { PriceRequest, ApproveValues } from "../types"

interface ApproveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    request: PriceRequest | null
    onApprove: (values: ApproveValues) => Promise<void>
}

export default function ApproveDialog({
    open,
    onOpenChange,
    request,
    onApprove,
}: ApproveDialogProps) {
    const [notes, setNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    React.useEffect(() => {
        if (open) setNotes("")
    }, [open, request])

    const handleApprove = async () => {
        if (!request) return

        setIsSubmitting(true)
        try {
            await onApprove({ id: request.id, approval_notes: notes.trim() })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Approve Price Change</DialogTitle>
                    <DialogDescription>
                        You are about to approve the price change request for{" "}
                        <span className="font-medium">{request?.ingredient_name}</span>.
                    </DialogDescription>
                </DialogHeader>

                {request && (
                    <div className="grid gap-4 py-2">
                        <div className="rounded-lg bg-muted p-4 grid gap-2 text-sm">
                            <div className="grid grid-cols-2">
                                <span className="text-muted-foreground">Old Price:</span>
                                <span className="font-medium">₱{Number(request.old_cost).toFixed(4)}</span>
                            </div>
                            <div className="grid grid-cols-2">
                                <span className="text-muted-foreground">New Price:</span>
                                <span className="font-medium">₱{Number(request.new_cost).toFixed(4)}</span>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="approval-notes">Notes</Label>
                            <Textarea
                                id="approval-notes"
                                placeholder="Add approval notes (optional)..."
                                className="min-h-[100px] resize-none"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
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
                            <Button
                                type="button"
                                onClick={handleApprove}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Approving..." : "Approve"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
