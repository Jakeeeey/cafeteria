"use client";

import { format, parseISO } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import type { Brand } from "../types";

interface BrandViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand | null;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy h:mm a");
  } catch {
    return value;
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium break-all">{value}</span>
    </div>
  );
}

export default function BrandViewDialog({
  open,
  onOpenChange,
  brand,
}: BrandViewDialogProps) {
  if (!brand) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Brand Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <Row label="Brand Name" value={brand.brand_name} />
          <Row label="SKU Code" value={brand.sku_code ?? "—"} />
          <Separator />
          <Row label="Created By" value={brand.created_by ?? "—"} />
          <Row label="Created At" value={formatDate(brand.created_at)} />
          <Row label="Updated By" value={brand.updated_by ?? "—"} />
          <Row label="Updated At" value={formatDate(brand.updated_at)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
