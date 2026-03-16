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

import type { PriceRequest, ApproveValues, RejectValues } from "../types"
import RejectConfirmDialog from "./RejectConfirmDialog"

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—"
    try {
        return new Intl.DateTimeFormat("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(dateStr))
    } catch {
        return dateStr
    }
}

interface ApproveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    request: PriceRequest | null
    onApprove: (values: ApproveValues) => Promise<void>
    onReject: (values: RejectValues) => Promise<void>
}

export default function ApproveDialog({
    open,
    onOpenChange,
    request,
    onApprove,
    onReject,
}: ApproveDialogProps) {
    const [notes, setNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)

    React.useEffect(() => {
        if (open) {
            setNotes("")
            setRejectConfirmOpen(false)
        }
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

    const handleReject = () => {
        if (!request) return
        setRejectConfirmOpen(true)
    }

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>View Price Change Request</DialogTitle>
                    <DialogDescription>
                        Review the details for <span className="font-medium">{request?.ingredient_name}</span>.
                    </DialogDescription>
                </DialogHeader>

                {request && (
                    <div className="grid gap-6">
                        <div className="rounded-lg bg-muted p-4 grid gap-2 text-sm">
                            <div className="grid grid-cols-3 items-center">
                                <span className="text-muted-foreground col-span-1">Old Price:</span>
                                <span className="font-medium col-span-2">₱{Number(request.old_cost).toFixed(4)}</span>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <span className="text-muted-foreground col-span-1">New Price:</span>
                                <span className="font-medium col-span-2">₱{Number(request.new_cost).toFixed(4)}</span>
                            </div>
                        </div>

                        <div className="rounded-lg border p-4 grid gap-4 text-sm">
                            <div className="grid grid-cols-3 gap-2 items-start">
                                <span className="text-muted-foreground col-span-1">Change</span>
                                <span className="font-medium col-span-2">
                                    {(() => {
                                        const diff = Number(request.new_cost) - Number(request.old_cost)
                                        const pct = Number(request.old_cost) !== 0
                                            ? (diff / Number(request.old_cost)) * 100
                                            : 0
                                        const sign = diff >= 0 ? "+" : ""
                                        return `${sign}₱${Math.abs(diff).toFixed(2)} (${sign}${pct.toFixed(1)}%)`
                                    })()}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-start">
                                <span className="text-muted-foreground col-span-1">Requested by</span>
                                <span className="col-span-2">
                                    {request.requested_by_name
                                        ? request.requested_by_name
                                        : <span className="text-muted-foreground text-xs">ID: {request.requested_by}</span>
                                    }
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-start">
                                <span className="text-muted-foreground col-span-1">Reason</span>
                                <span className="text-sm col-span-2 whitespace-pre-line break-words">
                                    {request.request_reason
                                        ? request.request_reason
                                        : <span className="text-muted-foreground">—</span>
                                    }
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-start">
                                <span className="text-muted-foreground col-span-1">Date</span>
                                <span className="text-sm text-muted-foreground col-span-2">
                                    {formatDate(request.requested_at)}
                                </span>
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

                        <div className="flex justify-between gap-2 mt-2">
                            <Button
                                variant="destructive"
                                type="button"
                                onClick={handleReject}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Processing..." : "Reject"}
                            </Button>
                            <div className="flex gap-2">
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
                                    {isSubmitting ? "Processing..." : "Approve"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        <RejectConfirmDialog
            open={rejectConfirmOpen}
            onOpenChange={setRejectConfirmOpen}
            request={request}
            onReject={onReject}
        />
        </>
    )
}
