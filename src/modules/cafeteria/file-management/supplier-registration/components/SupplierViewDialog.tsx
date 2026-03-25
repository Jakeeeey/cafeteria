"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import type { IngredientOption, IngredientSupplier } from "../types";

interface SupplierViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: IngredientSupplier | null;
  ingredients: IngredientOption[];
}

function v(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export default function SupplierViewDialog({
  open,
  onOpenChange,
  supplier,
  ingredients,
}: SupplierViewDialogProps) {
  const ingredientMap = React.useMemo(() => {
    return new Map(ingredients.map((i) => [i.id, i.name] as const));
  }, [ingredients]);

  const ingredientNames = React.useMemo(() => {
    const ids = supplier?.ingredient_ids ?? [];
    return ids
      .map((id) => ingredientMap.get(id))
      .filter(Boolean) as string[];
  }, [ingredientMap, supplier?.ingredient_ids]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Details</DialogTitle>
        </DialogHeader>

        {!supplier ? (
          <div className="text-sm text-muted-foreground">No supplier selected.</div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="text-lg font-semibold leading-tight">{supplier.name}</div>
                  </div>
                  <div>
                    {supplier.is_active === 1 ? (
                      <StatusBadge tone="success">Active</StatusBadge>
                    ) : (
                      <StatusBadge tone="destructive">Inactive</StatusBadge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Shortcut</div>
                    <div className="font-medium">{v(supplier.short_cut)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Contact Number</div>
                    <div className="font-medium">{v(supplier.contact_number)}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted-foreground">Address</div>
                    <div className="font-medium">{v(supplier.address)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Barangay</div>
                    <div className="font-medium">{v(supplier.brgy)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">City</div>
                    <div className="font-medium">{v(supplier.city)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Province</div>
                    <div className="font-medium">{v(supplier.province)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Country</div>
                    <div className="font-medium">{v(supplier.country)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold">Ingredients</div>
                  <div className="text-sm text-muted-foreground">
                    Ingredients assigned to this supplier.
                  </div>
                </div>

                <Separator />

                {ingredientNames.length === 0 ? (
                  <div className="text-sm text-muted-foreground">—</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {ingredientNames.slice(0, 24).map((name, index) => (
                      <Badge key={`${name}-${index}`} variant="secondary" className="font-normal">
                        {name}
                      </Badge>
                    ))}
                    {ingredientNames.length > 24 && (
                      <Badge variant="secondary" className="font-normal">
                        +{ingredientNames.length - 24} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
