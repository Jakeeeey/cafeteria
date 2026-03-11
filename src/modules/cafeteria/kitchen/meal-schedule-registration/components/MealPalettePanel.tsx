"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import type { Meal, MealCategory } from "../types";

// ─── Drag transfer key ────────────────────────────────────────────────────────

export const DND_MEAL_KEY = "application/x-meal-id";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MealPalettePanelProps {
  categories: MealCategory[];
  isLoading: boolean;
}

// ─── Draggable meal card ──────────────────────────────────────────────────────

function MealCard({ meal }: { meal: Meal }) {
  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(DND_MEAL_KEY, String(meal.id));
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex cursor-grab items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing active:opacity-70 select-none"
      title={`Drag to schedule: ${meal.name}`}
    >
      <GripVerticalIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate font-medium">{meal.name}</span>
      <Badge variant="outline" className="shrink-0 text-xs tabular-nums">
        ×{meal.serving_size}
      </Badge>
    </div>
  );
}

// ─── Category group ───────────────────────────────────────────────────────────

function CategoryGroup({ category }: { category: MealCategory }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {category.name}
      </p>
      {category.meals.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground italic">No meals</p>
      ) : (
        category.meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function MealPalettePanel({
  categories,
  isLoading,
}: MealPalettePanelProps) {
  return (
    <aside className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-3">
      <div>
        <h3 className="text-sm font-semibold">Available Meals</h3>
        <p className="text-xs text-muted-foreground">
          Drag a meal into the schedule table.
        </p>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto max-h-[calc(75vh-12rem)]">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))
        ) : categories.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No meals registered yet.
          </p>
        ) : (
          categories.map((cat) => (
            <CategoryGroup
              key={cat.name}
              category={cat}
            />
          ))
        )}
      </div>
    </aside>
  );
}
