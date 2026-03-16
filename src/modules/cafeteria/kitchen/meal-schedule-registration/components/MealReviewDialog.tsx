"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { WeeklySchedule } from "../types";
import {
  aggregateIngredients,
  buildReviewRows,
  type ReviewRow,
} from "../utils/scheduleUtils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MealReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: WeeklySchedule;
  weekRange: string;
  isSubmitting: boolean;
  onConfirm: () => Promise<void>;
}

// ─── Schedule rows table ─────────────────────────────────────────────────────

function ScheduleRowsTable({ rows }: { rows: ReviewRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No meals scheduled.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead>Meal Type</TableHead>
            <TableHead>Meal</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Serving Size</TableHead>
            <TableHead className="text-right">Total Servings</TableHead>
            <TableHead>Ingredients</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-medium whitespace-nowrap">
                {row.day}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{row.meal_type}</Badge>
              </TableCell>
              <TableCell>{row.meal_name}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.quantity}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.serving_size}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {row.total_servings}
              </TableCell>
              <TableCell>
                {row.ingredients.length === 0 ? (
                  <span className="text-muted-foreground text-xs">—</span>
                ) : (
                  <ul className="space-y-0.5">
                    {row.ingredients.map((ing) => (
                      <li key={ing.ingredient_id} className="text-xs">
                        <span className="font-medium">
                          {ing.ingredient_name ?? `Ingredient #${ing.ingredient_id}`}
                        </span>
                        {" "}
                        <span className="text-muted-foreground">
                          ×{Number(ing.quantity_per_serving).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 4,
                          })}
                          {ing.unit_name ? ` ${ing.unit_name}` : ""}{" "}
                          per serving
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Aggregated ingredients table ────────────────────────────────────────────

function AggregatedIngredientsTable({ schedule }: { schedule: WeeklySchedule }) {
  const aggregated = React.useMemo(
    () => aggregateIngredients(schedule),
    [schedule]
  );

  if (aggregated.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-2">
        No ingredients to aggregate.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Ingredient</TableHead>
            <TableHead className="text-right">Total Required</TableHead>
            <TableHead>Unit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aggregated.map((ing, idx) => (
            <TableRow key={ing.ingredient_id}>
              <TableCell className="text-muted-foreground text-sm">
                {idx + 1}
              </TableCell>
              <TableCell className="font-medium">
                {ing.ingredient_name ?? `Ingredient #${ing.ingredient_id}`}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {Number(ing.total_quantity).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 4,
                })}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {ing.unit_name ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main dialog ─────────────────────────────────────────────────────────────

export default function MealReviewDialog({
  open,
  onOpenChange,
  schedule,
  weekRange,
  isSubmitting,
  onConfirm,
}: MealReviewDialogProps) {
  const rows = React.useMemo(() => buildReviewRows(schedule), [schedule]);

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Schedule</DialogTitle>
          <DialogDescription>
            Week of {weekRange} — {rows.length} meal{rows.length !== 1 ? "s" : ""} scheduled.
            Review everything below before confirming.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* ── Schedule breakdown ────────────────────────────────────────── */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Scheduled Meals</h4>
            <ScheduleRowsTable rows={rows} />
          </div>

          <Separator />

          {/* ── Aggregated ingredients / purchase order preview ──────────── */}
          <div>
            <h4 className="text-sm font-semibold mb-2">
              Ingredient Purchase Order Preview
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              Total ingredient quantities needed for all scheduled meals.
            </p>
            <AggregatedIngredientsTable schedule={schedule} />
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Done"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
