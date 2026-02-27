"use client";

import * as React from "react";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import IngredientTable from "./components/IngredientTable";
import IngredientFormDialog from "./components/IngredientFormDialog";
import {
  fetchIngredients,
  fetchOptions,
  createIngredient,
  updateIngredient,
} from "./providers/fetchProvider";
import type {
  Ingredient,
  IngredientFormValues,
  IngredientOptions,
} from "./types";

// ─── Default empty options (used while loading) ──────────────────────────────
const EMPTY_OPTIONS: IngredientOptions = {
  brands: [],
  categories: [],
  units: [],
  suppliers: [],
};

export default function IngredientRegistrationModule() {
  // ─ Ingredient list state ──────────────────────────────────────────────
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
  const [listLoading, setListLoading] = React.useState(true);

  // ─ Options (dropdown FK data) state ──────────────────────────────────
  const [options, setOptions] = React.useState<IngredientOptions>(EMPTY_OPTIONS);
  const [optionsLoading, setOptionsLoading] = React.useState(false);

  // ─ Dialog state ────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Ingredient | null>(null);

  // ─ Search state ────────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("");

  // ─── Load ingredients ──────────────────────────────────────────────────────
  const loadIngredients = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchIngredients();
      setIngredients(data);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load ingredients.");
    } finally {
      setListLoading(false);
    }
  }, []);

  // ─── Load options (brands/categories/units/suppliers) ──────────────────────
  const loadOptions = React.useCallback(async () => {
    setOptionsLoading(true);
    try {
      const data = await fetchOptions();
      setOptions(data);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load form options.");
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  // ─── Open dialog handlers ────────────────────────────────────────────────
  function openAddDialog() {
    setEditTarget(null);
    setDialogOpen(true);
    loadOptions();
  }

  function openEditDialog(ingredient: Ingredient) {
    setEditTarget(ingredient);
    setDialogOpen(true);
    loadOptions();
  }

  // ─── Form submit handler ──────────────────────────────────────────────────
  async function handleFormSubmit(
    values: IngredientFormValues,
    id?: number
  ) {
    try {
      if (id != null) {
        await updateIngredient(id, values);
        toast.success("Ingredient updated successfully.");
      } else {
        await createIngredient(values);
        toast.success("Ingredient registered successfully.");
      }
      setDialogOpen(false);
      await loadIngredients();
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong.");
      // Re-throw so the form keeps the submitting state locked until error is shown
      throw err;
    }
  }

  // ─── Filtered list ───────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        (i.brand_name ?? "").toLowerCase().includes(q) ||
        (i.category_name ?? "").toLowerCase().includes(q) ||
        (i.supplier_name ?? "").toLowerCase().includes(q)
    );
  }, [ingredients, search]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ─ Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Ingredient Registration
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage kitchen ingredients.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            title="Refresh list"
            disabled={listLoading}
            onClick={loadIngredients}
          >
            <RefreshCwIcon
              className={`size-4 ${listLoading ? "animate-spin" : ""}`}
            />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button onClick={openAddDialog}>
            <PlusIcon className="size-4" />
            Add Ingredient
          </Button>
        </div>
      </div>

      {/* ─ Search ───────────────────────────────────────────────────────────── */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by name, brand, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ─ Table ────────────────────────────────────────────────────────────── */}
      <IngredientTable
        ingredients={filtered}
        isLoading={listLoading}
        onEdit={openEditDialog}
      />

      {/* ─ Add / Edit dialog ───────────────────────────────────────────────── */}
      <IngredientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTarget={editTarget}
        options={options}
        optionsLoading={optionsLoading}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
