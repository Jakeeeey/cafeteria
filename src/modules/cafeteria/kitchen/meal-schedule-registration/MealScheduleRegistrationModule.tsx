"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import MealPalettePanel from "./components/MealPalettePanel";
import ScheduleCalendar from "./components/ScheduleCalendar";
import MealReviewDialog from "./components/MealReviewDialog";
import DuplicateWarningDialog from "./components/DuplicateWarningDialog";
import {
  fetchCurrentUserId,
  fetchMeals,
  submitSchedule,
  checkDuplicateMeals
} from "./providers/fetchProvider";
import type {
  DayOfWeek,
  Meal,
  MealCategory,
  MealType,
  ScheduleEntry,
  WeeklySchedule,
} from "./types";
import {
  buildEmptyWeeklySchedule,
  buildSubmitPayload,
  countScheduleEntries,
  formatWeekRange,
  getMondayOfWeek,
  getWeekDates,
  groupMealsByCategory,
  shiftWeek,
  toISODate,
} from "./utils/scheduleUtils";

// ─── localStorage persistence helpers ────────────────────────────────────────

const STORAGE_WEEK_KEY = "msr-week";
const scheduleStorageKey = (iso: string) => `msr-schedule-${iso}`;

function readStoredMonday(): Date {
  if (typeof window === "undefined") return getMondayOfWeek(new Date());
  try {
    const s = window.localStorage.getItem(STORAGE_WEEK_KEY);
    if (s) return getMondayOfWeek(new Date(s));
  } catch { /* ignore */ }
  return getMondayOfWeek(new Date());
}

function readStoredSchedule(isoMonday: string): WeeklySchedule {
  if (typeof window === "undefined") return buildEmptyWeeklySchedule();
  try {
    const s = window.localStorage.getItem(scheduleStorageKey(isoMonday));
    if (s) return JSON.parse(s) as WeeklySchedule;
  } catch { /* ignore */ }
  return buildEmptyWeeklySchedule();
}

// ─── Module ──────────────────────────────────────────────────────────────────

export default function MealScheduleRegistrationModule() {
  // ─── Meals catalogue ────────────────────────────────────────────────────
  const [meals, setMeals] = React.useState<Meal[]>([]);
  const [categories, setCategories] = React.useState<MealCategory[]>([]);
  const [mealsLoading, setMealsLoading] = React.useState(true);

  // ─── Week navigation ────────────────────────────────────────────────────
  const [currentMonday, setCurrentMonday] = React.useState<Date>(readStoredMonday);
  const currentIsoMondayRef = React.useRef(toISODate(readStoredMonday()));
  const weekDates = React.useMemo(
    () => getWeekDates(currentMonday),
    [currentMonday]
  );
  const weekRange = React.useMemo(
    () => formatWeekRange(currentMonday),
    [currentMonday]
  );

  // ─── Weekly schedule state ─────────────────────────────────────────────────
  const [schedule, setSchedule] = React.useState<WeeklySchedule>(() =>
    readStoredSchedule(toISODate(readStoredMonday()))
  );
  // ─── Current user ──────────────────────────────────────────────────────────────────
  const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);
  // ─── Review dialog ───────────────────────────────────────────────────────
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // ─── Duplicate warning dialog ─────────────────────────────────────────────
  const [duplicateWarningOpen, setDuplicateWarningOpen] = React.useState(false);
  const [duplicateMeals, setDuplicateMeals] = React.useState<Array<{ date: string; mealType: string; mealName: string }>>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = React.useState(false);

  // ─── Load meals on mount ─────────────────────────────────────────────────
  const loadMeals = React.useCallback(async () => {
    setMealsLoading(true);
    try {
      const data = await fetchMeals();
      setMeals(data);
      setCategories(groupMealsByCategory(data));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load meals.");
    } finally {
      setMealsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadMeals();
    fetchCurrentUserId().then(setCurrentUserId);
  }, [loadMeals]);

  // ─── Persist current week + sync ref when week changes ──────────────────
  React.useEffect(() => {
    currentIsoMondayRef.current = toISODate(currentMonday);
    try { localStorage.setItem(STORAGE_WEEK_KEY, currentIsoMondayRef.current); } catch { /* ignore */ }
  }, [currentMonday]);

  // ─── Load schedule from localStorage on week change (skip initial mount) ─
  const isFirstWeekRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstWeekRender.current) { isFirstWeekRender.current = false; return; }
    setSchedule(readStoredSchedule(toISODate(currentMonday)));
  }, [currentMonday]);

  // ─── Save schedule to localStorage whenever it changes ───────────────────
  React.useEffect(() => {
    try {
      localStorage.setItem(scheduleStorageKey(currentIsoMondayRef.current), JSON.stringify(schedule));
    } catch { /* ignore */ }
  }, [schedule]);

  // ─── Week navigation handlers ────────────────────────────────────────────
  function goToPrevWeek() {
    setCurrentMonday((prev) => shiftWeek(prev, -1));
  }
  function goToNextWeek() {
    setCurrentMonday((prev) => shiftWeek(prev, 1));
  }

  // ─── Schedule mutation handlers ──────────────────────────────────────────
  function handleAddEntry(
    day: DayOfWeek,
    mealType: MealType,
    entry: ScheduleEntry
  ) {
    setSchedule((prev) => {
      const next = { ...prev };
      next[day] = { ...next[day] };
      next[day][mealType] = [...next[day][mealType], entry];
      return next;
    });
  }

  function handleRemoveEntry(day: DayOfWeek, mealType: MealType, uid: string) {
    setSchedule((prev) => {
      const next = { ...prev };
      next[day] = { ...next[day] };
      next[day][mealType] = next[day][mealType].filter((e) => e.uid !== uid);
      return next;
    });
  }

  function handleUpdateQuantity(
    day: DayOfWeek,
    mealType: MealType,
    uid: string,
    quantity: number
  ) {
    setSchedule((prev) => {
      const next = { ...prev };
      next[day] = { ...next[day] };
      next[day][mealType] = next[day][mealType].map((e) =>
        e.uid === uid ? { ...e, quantity } : e
      );
      return next;
    });
  }

  // ─── Clear schedule ────────────────────────────────────────────────────────
  function handleClearSchedule() {
    setSchedule(buildEmptyWeeklySchedule());
    toast.success("Schedule cleared.");
  }

  // ─── "Done Scheduling" → check duplicates → open review dialog ───────────
  const entryCount = React.useMemo(
    () => countScheduleEntries(schedule),
    [schedule]
  );

  async function handleOpenReview() {
    if (entryCount === 0) {
      toast.warning(
        "No meals scheduled yet. Drag meals into the calendar first."
      );
      return;
    }

    // Collect all scheduled meals (date + meal type + meal name)
    const scheduledMeals: Array<{ date: string; mealType: string; mealName: string }> = [];

    for (const day of Object.keys(schedule)) {
      const daySchedule = schedule[day as DayOfWeek];
      const dayIndex = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day);

      if (dayIndex !== -1) {
        const date = new Date(currentMonday);
        date.setDate(date.getDate() + dayIndex);
        const dateStr = toISODate(date);

        for (const mealType of Object.keys(daySchedule)) {
          const entries = daySchedule[mealType as MealType];
          for (const entry of entries) {
            scheduledMeals.push({
              date: dateStr,
              mealType: mealType,
              mealName: entry.meal.name
            });
          }
        }
      }
    }

    // Check for duplicate meals
    setIsCheckingDuplicates(true);
    try {
      const { approved, cancelled } = await checkDuplicateMeals(scheduledMeals);

      // If there are approved duplicates, block submission
      if (approved.length > 0) {
        const formattedMeals = approved.map(m => {
          const date = new Date(m.date);
          const dateStr = date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          return `${m.mealName} (${m.mealType}) on ${dateStr}`;
        }).join("; ");

        toast.error(
          `Cannot schedule meals. The following meals already have approved purchase orders: ${formattedMeals}`
        );
        return;
      }

      // If there are cancelled/rejected duplicates, show warning
      if (cancelled.length > 0) {
        setDuplicateMeals(cancelled);
        setDuplicateWarningOpen(true);
        return;
      }

      // No conflicts, proceed to review
      setReviewOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to check for existing purchase orders.");
    } finally {
      setIsCheckingDuplicates(false);
    }
  }

  function handleConfirmDuplicate() {
    setDuplicateWarningOpen(false);
    setReviewOpen(true);
  }

  function handleCancelDuplicate() {
    setDuplicateWarningOpen(false);
    setDuplicateMeals([]);
  }

  // ─── Confirm and submit ──────────────────────────────────────────────────
  async function handleConfirmSubmit() {
    if (!currentUserId) {
      toast.error("Could not read your account. Please refresh and try again.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { scheduleItems, poItems, totalEstimatedCost } = buildSubmitPayload(
        schedule,
        weekDates,
        currentUserId,
        currentUserId
      );

      await submitSchedule({
        week_start: toISODate(currentMonday),
        schedules: scheduleItems,
        po_items: poItems,
        total_estimated_cost: totalEstimatedCost,
        created_by: currentUserId,
      });

      toast.success("Schedule submitted and purchase order created!");
      setReviewOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit schedule.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Meal Schedule Registration
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag meals into the weekly calendar, set quantities, then click{" "}
            <span className="font-medium">Done Scheduling</span>.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">

          {entryCount > 0 && (
            <Button
              variant="outline"
              size="icon"
              title="Clear all scheduled meals for this week"
              onClick={handleClearSchedule}
            >
              <Trash2Icon className="size-4" />
              <span className="sr-only">Clear schedule</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            title="Refresh meals"
            disabled={mealsLoading}
            onClick={loadMeals}
          >
            <RefreshCwIcon
              className={`size-4 ${mealsLoading ? "animate-spin" : ""}`}
            />
            <span className="sr-only">Refresh</span>
          </Button>

          

          <Button
            onClick={handleOpenReview}
            disabled={entryCount === 0 || isCheckingDuplicates}
          >
            {isCheckingDuplicates ? "Checking..." : "Done Scheduling"}
            {entryCount > 0 && !isCheckingDuplicates && (
              <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs tabular-nums">
                {entryCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* ── Week navigator ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={goToPrevWeek} title="Previous week">
          <ChevronLeftIcon className="size-4" />
          <span className="sr-only">Previous week</span>
        </Button>
        <span className="text-sm font-medium tabular-nums">{weekRange}</span>
        <Button variant="outline" size="icon" onClick={goToNextWeek} title="Next week">
          <ChevronRightIcon className="size-4" />
          <span className="sr-only">Next week</span>
        </Button>
      </div>

      {/* ── Main area: palette + calendar ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Palette panel — fixed width on large screens */}
        <div className="w-full lg:w-52 xl:w-60 shrink-0">
          <MealPalettePanel
            categories={categories}
            isLoading={mealsLoading}
          />
        </div>

        {/* Calendar — fills remaining width */}
        <div className="flex-1 min-w-0">
          <ScheduleCalendar
            schedule={schedule}
            meals={meals}
            weekDates={weekDates}
            onAddEntry={handleAddEntry}
            onRemoveEntry={handleRemoveEntry}
            onUpdateQuantity={handleUpdateQuantity}
          />
        </div>
      </div>

      {/* ── Review / confirmation dialog ──────────────────────────────────── */}
      <MealReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        schedule={schedule}
        weekRange={weekRange}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmSubmit}
      />

      {/* ── Duplicate warning dialog ──────────────────────────────────────── */}
      <DuplicateWarningDialog
        open={duplicateWarningOpen}
        onOpenChange={setDuplicateWarningOpen}
        dates={duplicateMeals}
        onConfirm={handleConfirmDuplicate}
        onCancel={handleCancelDuplicate}
      />
    </div>
  );
}
