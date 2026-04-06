"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon } from "lucide-react";

interface ScheduledMeal {
  date: string;
  mealType: string;
  mealName: string;
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dates: ScheduledMeal[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DuplicateWarningDialog({
  open,
  onOpenChange,
  dates,
  onConfirm,
  onCancel,
}: DuplicateWarningDialogProps) {
  const formatMeal = (meal: ScheduledMeal) => {
    const date = new Date(meal.date);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return `${meal.mealName} (${meal.mealType}) on ${dateStr}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
            <DialogTitle>Duplicate Meal Schedule Detected</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            You are scheduling meals that previously had cancelled or rejected purchase orders:
          </DialogDescription>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {dates.map((meal, idx) => (
              <li key={idx}>{formatMeal(meal)}</li>
            ))}
          </ul>
          <p className="pt-2 text-sm font-semibold text-muted-foreground">
            Are you sure you want to do this again?
          </p>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            No
          </Button>
          <Button onClick={onConfirm}>Yes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
