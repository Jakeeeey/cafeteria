"use client"

import React, { useState } from "react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import type { PriceRequest, RejectValues } from "../types"

interface RejectConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    request: PriceRequest | null
    onReject: (values: RejectValues) => Promise<void>
}

export default function RejectConfirmDialog({
    open,
    onOpenChange,
    request,
    onReject,
}: RejectConfirmDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleReject = async () => {
        if (!request) return

        setIsSubmitting(true)
        try {
            await onReject({ id: request.id })
            onOpenChange(false)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>
                        You are about to reject the price change request for{" "}
                        <span className="font-medium">{request?.ingredient_name}</span>. This
                        action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        No
                    </Button>
                    <Button
                        variant="destructive"
                        type="button"
                        onClick={handleReject}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Rejecting..." : "Yes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
