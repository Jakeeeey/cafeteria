"use client";

import * as React from "react";
import { XIcon } from "lucide-react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type {
  DayOfWeek,
  Meal,
  MealType,
  ScheduleEntry,
  WeeklySchedule,
} from "../types";
import { DAYS_OF_WEEK, MEAL_TYPES } from "../types";
import { DND_MEAL_KEY } from "./MealPalettePanel";
import { generateUid } from "../utils/scheduleUtils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScheduleCalendarProps {
  schedule: WeeklySchedule;
  meals: Meal[];
  weekDates: Record<DayOfWeek, string>;
  onAddEntry: (day: DayOfWeek, mealType: MealType, entry: ScheduleEntry) => void;
  onRemoveEntry: (day: DayOfWeek, mealType: MealType, uid: string) => void;
  onUpdateQuantity: (
    day: DayOfWeek,
    mealType: MealType,
    uid: string,
    quantity: number
  ) => void;
}

// ─── Scheduled meal card (placed inside the calendar) ────────────────────────

function ScheduledMealCard({
  entry,
  onRemove,
  onUpdateQuantity,
}: {
  entry: ScheduleEntry;
  onRemove: () => void;
  onUpdateQuantity: (qty: number) => void;
}) {
  function handleQtyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      onUpdateQuantity(val);
    }
  }

  return (
    <div className="group relative flex flex-col gap-1.5 rounded-md border bg-card p-2 shadow-sm text-xs">
      <div className="flex items-start justify-between gap-1">
        <span className="font-medium leading-tight line-clamp-2 flex-1">
          {entry.meal.name}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
          title="Remove"
        >
          <XIcon className="size-3" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <Label className="text-[10px] text-muted-foreground shrink-0">Quantity</Label>
        <Input
          type="number"
          min={1}
          value={entry.quantity}
          onChange={handleQtyChange}
          className="h-6 w-14 px-1.5 text-xs text-center"
        />
        <Badge variant="secondary" className="text-[10px] shrink-0">
          ×{entry.meal.serving_size}
        </Badge>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {entry.quantity * entry.meal.serving_size} total servings
      </p>
    </div>
  );
}

// ─── Drop cell (one day × one meal type) ─────────────────────────────────────

function DropCell({
  day: _day,
  mealType: _mealType,
  entries,
  onDrop,
  onRemove,
  onUpdateQuantity,
}: {
  day: DayOfWeek;
  mealType: MealType;
  entries: ScheduleEntry[];
  onDrop: (mealId: number) => void;
  onRemove: (uid: string) => void;
  onUpdateQuantity: (uid: string, qty: number) => void;
}) {
  const [isDragOver, setIsDragOver] = React.useState(false);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes(DND_MEAL_KEY)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const mealIdStr = e.dataTransfer.getData(DND_MEAL_KEY);
    const mealId = parseInt(mealIdStr, 10);
    if (!isNaN(mealId)) {
      onDrop(mealId);
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        "min-h-[80px] rounded-md border-2 border-dashed p-1.5 transition-colors flex flex-col gap-1.5",
        isDragOver
          ? "border-primary bg-primary/5"
          : entries.length > 0
          ? "border-transparent bg-muted/20"
          : "border-muted-foreground/20 bg-transparent",
      ].join(" ")}
    >
      {entries.length === 0 && !isDragOver && (
        <p className="text-[10px] text-muted-foreground/50 text-center mt-4 select-none">
          Drop here
        </p>
      )}
      {entries.map((entry) => (
        <ScheduledMealCard
          key={entry.uid}
          entry={entry}
          onRemove={() => onRemove(entry.uid)}
          onUpdateQuantity={(qty) => onUpdateQuantity(entry.uid, qty)}
        />
      ))}
    </div>
  );
}

// ─── Main calendar grid ───────────────────────────────────────────────────────

export default function ScheduleCalendar({
  schedule,
  meals,
  weekDates,
  onAddEntry,
  onRemoveEntry,
  onUpdateQuantity,
}: ScheduleCalendarProps) {
  // Build a lookup map from meal id → Meal
  const mealMap = React.useMemo(() => {
    const map = new Map<number, Meal>();
    for (const m of meals) map.set(m.id, m);
    return map;
  }, [meals]);

  function handleDrop(day: DayOfWeek, mealType: MealType, mealId: number) {
    const meal = mealMap.get(mealId);
    if (!meal) return;

    const alreadyScheduled = schedule[day][mealType].some(
      (e) => e.meal.id === mealId
    );
    if (alreadyScheduled) {
      toast.warning(
        `"${meal.name}" is already scheduled for ${day} ${mealType}. Remove it first if you want to change the quantity.`
      );
      return;
    }

    const entry: ScheduleEntry = {
      uid: generateUid(),
      meal,
      quantity: 1,
    };
    onAddEntry(day, mealType, entry);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs" style={{ minWidth: 700 }}>
        <thead>
          <tr>
            {/* Meal Type header column */}
            <th className="w-24 shrink-0 border bg-muted/50 px-2 py-2 text-left font-semibold text-muted-foreground">
              Meal Type
            </th>
            {DAYS_OF_WEEK.map((day) => (
              <th
                key={day}
                className="border bg-muted/50 px-2 py-2 text-center font-semibold min-w-[130px]"
              >
                <div>{day}</div>
                <div className="text-[10px] font-normal text-muted-foreground">
                  {weekDates[day]}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEAL_TYPES.map((mt) => (
            <tr key={mt}>
              <td className="border bg-muted/30 px-2 py-2 font-medium text-muted-foreground align-top">
                {mt}
              </td>
              {DAYS_OF_WEEK.map((day) => (
                <td key={day} className="border p-1.5 align-top">
                  <DropCell
                    day={day}
                    mealType={mt}
                    entries={schedule[day][mt]}
                    onDrop={(mealId) => handleDrop(day, mt, mealId)}
                    onRemove={(uid) => onRemoveEntry(day, mt, uid)}
                    onUpdateQuantity={(uid, qty) =>
                      onUpdateQuantity(day, mt, uid, qty)
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
