"use client";

import { format, parseISO } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { Ingredient } from "../types";

interface IngredientViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: Ingredient | null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy h:mm a");
  } catch {
    return value;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium break-all">{children}</span>
    </div>
  );
}

export default function IngredientViewDialog({
  open,
  onOpenChange,
  ingredient,
}: IngredientViewDialogProps) {
  if (!ingredient) return null;

  const totalAmount = Number(ingredient.cost_per_unit ?? 0) * Number(ingredient.unit_count);
  const uom = ingredient.unit_abbreviation
    ? `${ingredient.unit_name} (${ingredient.unit_abbreviation})`
    : (ingredient.unit_name ?? "—");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ingredient Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          {/* Basic info */}
          <Row label="Name">{ingredient.name}</Row>
          <Row label="Description">
            {ingredient.description ?? <span className="text-muted-foreground">—</span>}
          </Row>

          <Separator />

          {/* Classification */}
          <Row label="Brand">
            {ingredient.brand_name ? (
              <Badge variant="outline">{ingredient.brand_name}</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
          <Row label="Category">
            {ingredient.category_name ? (
              <Badge variant="secondary">{ingredient.category_name}</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
          <Row label="Supplier">
            {ingredient.supplier_name ?? <span className="text-muted-foreground">—</span>}
          </Row>

          <Separator />

          {/* Quantity & pricing */}
          <Row label="Unit of Measurement">{uom}</Row>
          <Row label="Unit">
            {Number(ingredient.unit_count).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 4,
            })}
          </Row>
          <Row label="Cost per Unit">
            ₱{Number(ingredient.cost_per_unit ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}
          </Row>
          <Row label="Total Amount">
            ₱{totalAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}
          </Row>

          <Separator />

          {/* Timestamps */}
          <Row label="Created At">{formatDate(ingredient.created_at)}</Row>
          <Row label="Updated At">{formatDate(ingredient.updated_at)}</Row>
        </div>
      </DialogContent>
    </Dialog>
  );
}
