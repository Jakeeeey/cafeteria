"use client";

import { format, parseISO } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import type { Category } from "../types";

interface CategoryViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
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

export default function CategoryViewDialog({
  open,
  onOpenChange,
  category,
}: CategoryViewDialogProps) {
  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Category Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <Row label="Category Name" value={category.category_name} />
          <Separator />
          <Row label="Created By" value={category.created_by ?? "—"} />
          <Row label="Created At" value={formatDate(category.created_at)} />
          <Row label="Updated By" value={category.updated_by ?? "—"} />
          <Row label="Updated At" value={formatDate(category.updated_at)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
