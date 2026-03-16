"use client"

import React, { useState } from "react"
import {
    TrendingUpIcon,
    TrendingDownIcon,
    ArrowLeftRightIcon,
    UserIcon,
    CalendarIcon,
    MessageSquareIcon,
    FileTextIcon,
    CheckCircle2Icon,
    XCircleIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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

    if (!request) return null

    const priceDiff = Number(request.new_cost) - Number(request.old_cost)
    const pricePct = Number(request.old_cost) !== 0
        ? (priceDiff / Number(request.old_cost)) * 100
        : 0
    const isIncrease = priceDiff > 0
    const sign = priceDiff >= 0 ? "+" : ""

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isIncrease ? 'bg-orange-100 dark:bg-orange-950/30' : 'bg-green-100 dark:bg-green-950/30'}`}>
                            {isIncrease ? (
                                <TrendingUpIcon className="size-6 text-orange-600 dark:text-orange-400" />
                            ) : (
                                <TrendingDownIcon className="size-6 text-green-600 dark:text-green-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl">Price Change Request</DialogTitle>
                            <DialogDescription className="mt-1">
                                Review the price update for <span className="font-semibold text-foreground">{request.ingredient_name}</span>
                            </DialogDescription>
                        </div>
                        <Badge
                            variant={isIncrease ? "destructive" : "default"}
                            className={isIncrease ? "" : "bg-green-600"}
                        >
                            {isIncrease ? "Increase" : "Decrease"}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Price Comparison Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Old Price */}
                        <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/30 dark:to-slate-800/20 border-slate-200 dark:border-slate-700">
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                                    <ArrowLeftRightIcon className="size-4" />
                                    <span className="text-xs font-medium uppercase tracking-wider">Current Price</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                    ₱{Number(request.old_cost).toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    per unit
                                </div>
                            </CardContent>
                        </Card>

                        {/* New Price */}
                        <Card className={`bg-gradient-to-br ${
                            isIncrease
                                ? 'from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800'
                                : 'from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800'
                        }`}>
                            <CardContent className="pt-4">
                                <div className={`flex items-center gap-2 mb-1 ${
                                    isIncrease
                                        ? 'text-orange-600 dark:text-orange-400'
                                        : 'text-green-600 dark:text-green-400'
                                }`}>
                                    {isIncrease ? (
                                        <TrendingUpIcon className="size-4" />
                                    ) : (
                                        <TrendingDownIcon className="size-4" />
                                    )}
                                    <span className="text-xs font-medium uppercase tracking-wider">New Price</span>
                                </div>
                                <div className={`text-2xl font-bold tabular-nums ${
                                    isIncrease
                                        ? 'text-orange-900 dark:text-orange-100'
                                        : 'text-green-900 dark:text-green-100'
                                }`}>
                                    ₱{Number(request.new_cost).toFixed(2)}
                                </div>
                                <div className={`text-xs font-medium mt-1 ${
                                    isIncrease
                                        ? 'text-orange-700 dark:text-orange-300'
                                        : 'text-green-700 dark:text-green-300'
                                }`}>
                                    {sign}₱{Math.abs(priceDiff).toFixed(2)} ({sign}{pricePct.toFixed(1)}%)
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Separator />

                    {/* Request Details Section */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <FileTextIcon className="size-4" />
                            Request Details
                        </h3>
                        <div className="space-y-1">
                            {/* Requested by */}
                            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="mt-0.5 text-muted-foreground">
                                    <UserIcon className="size-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                        Requested By
                                    </div>
                                    <div className="font-medium text-sm">
                                        {request.requested_by_name || (
                                            <span className="text-muted-foreground">ID: {request.requested_by}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="mt-0.5 text-muted-foreground">
                                    <CalendarIcon className="size-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                        Request Date
                                    </div>
                                    <div className="font-medium text-sm">
                                        {formatDate(request.requested_at)}
                                    </div>
                                </div>
                            </div>

                            {/* Reason */}
                            {request.request_reason && (
                                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="mt-0.5 text-muted-foreground">
                                        <MessageSquareIcon className="size-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                            Reason for Change
                                        </div>
                                        <div className="text-sm leading-relaxed whitespace-pre-line break-words">
                                            {request.request_reason}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Approval Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="approval-notes" className="text-sm font-semibold flex items-center gap-2">
                            <FileTextIcon className="size-4" />
                            Approval Notes (Optional)
                        </Label>
                        <Textarea
                            id="approval-notes"
                            placeholder="Add any notes or comments about this approval..."
                            className="min-h-[100px] resize-none"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between gap-3 pt-2">
                        <Button
                            variant="destructive"
                            type="button"
                            onClick={handleReject}
                            disabled={isSubmitting}
                            className="gap-2"
                        >
                            <XCircleIcon className="size-4" />
                            {isSubmitting ? "Processing..." : "Reject Request"}
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
                                className="gap-2 bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle2Icon className="size-4" />
                                {isSubmitting ? "Processing..." : "Approve Request"}
                            </Button>
                        </div>
                    </div>
                </div>
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
