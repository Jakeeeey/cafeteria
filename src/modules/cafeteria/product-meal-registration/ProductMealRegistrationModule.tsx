"use client";

import * as React from "react";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import MealTable from "./components/MealTable";
import MealFormDialog from "./components/MealFormDialog";
import MealViewDialog from "./components/MealViewDialog";
import {
  fetchMeals,
  fetchMealCategories,
  fetchIngredients,
  createMeal,
  updateMeal,
  deleteMeal,
} from "./providers/fetchProvider";
import type {
  MealWithIngredients,
  MealCategory,
  Ingredient,
  CreateMealRequest,
  UpdateMealRequest,
} from "./types";

// ─── Default empty arrays ──────────────────────────────
const EMPTY_MEALS: MealWithIngredients[] = [];
const EMPTY_CATEGORIES: MealCategory[] = [];
const EMPTY_INGREDIENTS: Ingredient[] = [];

export default function ProductMealRegistrationModule() {
  // ─ Meal list state ──────────────────────────────────────────────
  const [meals, setMeals] = React.useState<MealWithIngredients[]>(EMPTY_MEALS);
  const [listLoading, setListLoading] = React.useState(true);

  // ─ Options state ────────────────────────────────────────────────
  const [categories, setCategories] = React.useState<MealCategory[]>(EMPTY_CATEGORIES);
  const [ingredients, setIngredients] = React.useState<Ingredient[]>(EMPTY_INGREDIENTS);
  const [optionsLoading, setOptionsLoading] = React.useState(false);

  // ─ Dialog state ────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<MealWithIngredients | null>(null);

  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [viewTarget, setViewTarget] = React.useState<MealWithIngredients | null>(null);

  // ─ Search state ─────────────────────────────────────────────────
  const [search, setSearch] = React.useState("");

  // ─── Load meals ──────────────────────────────────────────────────────
  const loadMeals = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchMeals();
      setMeals(data);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load meals.");
    } finally {
      setListLoading(false);
    }
  }, []);

  // ─── Load options ──────────────────────────────────────────────────────
  const loadOptions = React.useCallback(async () => {
    setOptionsLoading(true);
    try {
      const [cats, ings] = await Promise.all([
        fetchMealCategories(),
        fetchIngredients(),
      ]);
      setCategories(cats);
      setIngredients(ings);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load options.");
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const init = async () => {
      await loadOptions();
      await loadMeals();
    };
    init();
  }, [loadMeals, loadOptions]);

  // ─── Open dialog handlers ────────────────────────────────────────────────
  function openAddDialog() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEditDialog(meal: MealWithIngredients) {
    setEditTarget(meal);
    setDialogOpen(true);
  }

  function openViewDialog(meal: MealWithIngredients) {
    setViewTarget(meal);
    setViewDialogOpen(true);
  }

  // ─── Handle create ───────────────────────────────────────────────────────
  async function handleCreate(data: CreateMealRequest) {
    const isDuplicate = meals.some(
      (m) => m.name.toLowerCase().trim() === data.name.toLowerCase().trim()
    );
    if (isDuplicate) {
      toast.error("Meal name already exists.");
      return;
    }

    try {
      await createMeal(data);
      toast.success("Meal created successfully.");
      setDialogOpen(false);
      loadMeals();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create meal.");
    }
  }

  // ─── Handle update ───────────────────────────────────────────────────────
  async function handleUpdate(data: UpdateMealRequest) {
    if (data.name) {
      const isDuplicate = meals.some(
        (m) => m.id !== data.id && m.name.toLowerCase().trim() === data.name!.toLowerCase().trim()
      );
      if (isDuplicate) {
        toast.error("Meal name already exists.");
        return;
      }
    }

    try {
      await updateMeal(data);
      toast.success("Meal updated successfully.");
      setDialogOpen(false);
      loadMeals();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update meal.");
    }
  }

  // ─── Handle delete ───────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    try {
      await deleteMeal(id);
      toast.success("Meal deleted successfully.");
      loadMeals();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete meal.");
    }
  }

  // ─── Derived meal list with ingredient names filled from global list ──
  const displayMeals = React.useMemo(() => {
    // when the ingredient lookup arrives later, we merge the name in here
    if (!ingredients || ingredients.length === 0) {
      return meals;
    }
    return meals.map((meal) => {
      if (!meal.ingredients || meal.ingredients.length === 0) return meal;
      const merged = meal.ingredients.map((ing) => {
        const fallback = ingredients.find((a) => String(a.id) === String(ing.ingredient_id));
        if (fallback) {
          return {
            ...ing,
            ingredient: {
              ...(ing.ingredient || {}),
              ...fallback,
            },
          };
        }
        return ing;
      });
      return { ...meal, ingredients: merged };
    });
  }, [meals, ingredients]);

  // ─── Filtered meals ──────────────────────────────────────────────────────
  const filteredMeals = React.useMemo(() => {
    return displayMeals.filter((meal) =>
      meal.name.toLowerCase().includes(search.toLowerCase()) ||
      (meal.description && meal.description.toLowerCase().includes(search.toLowerCase()))
    );
  }, [displayMeals, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meal Registration</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMeals}
            disabled={listLoading}
          >
            <RefreshCwIcon className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openAddDialog}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Meal
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search meals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <MealTable
        meals={filteredMeals}
        loading={listLoading}
        onEdit={openEditDialog}
        onView={openViewDialog}
        onDelete={handleDelete}
        allIngredients={ingredients}
      />

      {/* Dialog */}
      <MealFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTarget={editTarget}
        categories={categories}
        ingredients={ingredients}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        optionsLoading={optionsLoading}
      />

      <MealViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        meal={viewTarget}
      />
    </div>
  );
}