"use client";

import { format, parseISO } from "date-fns";
import {
  PackageIcon,
  TagIcon,
  LayersIcon,
  TruckIcon,
  RulerIcon,
  CoinsIcon,
  ActivityIcon,
  TimerIcon,
  CalendarIcon,
  ClockIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

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

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="mt-0.5 text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </div>
        <div className="font-medium text-sm break-words">{children}</div>
      </div>
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <PackageIcon className="size-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{ingredient.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {ingredient.is_active === 1 ? (
                  <Badge variant="default" className="bg-green-600 text-xs">
                    <ActivityIcon className="size-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    <ActivityIcon className="size-3 mr-1" />
                    Inactive
                  </Badge>
                )}
                {ingredient.shelf_life != null && (
                  <Badge variant="outline" className="text-xs">
                    <TimerIcon className="size-3 mr-1" />
                    {ingredient.shelf_life} days shelf life
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description Card */}
          {ingredient.description && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {ingredient.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pricing Overview - Highlighted Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                  <CoinsIcon className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Cost Per Unit</span>
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  ₱{Number(ingredient.cost_per_unit ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                  <CoinsIcon className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Total Amount</span>
                </div>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  ₱{totalAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Classification Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <LayersIcon className="size-4" />
              Classification
            </h3>
            <div className="space-y-1">
              <InfoRow icon={TagIcon} label="Brand">
                {ingredient.brand_name ? (
                  <Badge variant="outline" className="font-normal">
                    {ingredient.brand_name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">No brand specified</span>
                )}
              </InfoRow>
              <InfoRow icon={LayersIcon} label="Category">
                {ingredient.category_name ? (
                  <Badge variant="secondary" className="font-normal">
                    {ingredient.category_name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">No category specified</span>
                )}
              </InfoRow>
              <InfoRow icon={TruckIcon} label="Supplier">
                {ingredient.supplier_name ?? (
                  <span className="text-muted-foreground text-sm">No supplier specified</span>
                )}
              </InfoRow>
            </div>
          </div>

          <Separator />

          {/* Measurement Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <RulerIcon className="size-4" />
              Measurements
            </h3>
            <div className="space-y-1">
              <InfoRow icon={RulerIcon} label="Unit of Measurement">
                <Badge variant="outline" className="font-normal">
                  {uom}
                </Badge>
              </InfoRow>
              <InfoRow icon={PackageIcon} label="Unit Count">
                <span className="tabular-nums">
                  {Number(ingredient.unit_count).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4,
                  })}
                </span>
              </InfoRow>
            </div>
          </div>

          <Separator />

          {/* Timestamps Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ClockIcon className="size-4" />
              Activity Timeline
            </h3>
            <div className="space-y-1">
              <InfoRow icon={CalendarIcon} label="Created">
                <span className="text-sm">{formatDate(ingredient.created_at)}</span>
              </InfoRow>
              <InfoRow icon={ClockIcon} label="Last Updated">
                <span className="text-sm">{formatDate(ingredient.updated_at)}</span>
              </InfoRow>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
