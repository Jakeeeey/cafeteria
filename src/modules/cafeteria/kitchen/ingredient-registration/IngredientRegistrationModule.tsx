"use client";

import * as React from "react";
import { PlusIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const ALL = "__all__";

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

  // ─ Search + filter state ──────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [filterBrand, setFilterBrand] = React.useState(ALL);
  const [filterCategory, setFilterCategory] = React.useState(ALL);
  const [filterSupplier, setFilterSupplier] = React.useState(ALL);

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
    // Load options on mount so filters are populated immediately
    loadOptions();
  }, [loadIngredients, loadOptions]);

  // ─── Open dialog handlers ────────────────────────────────────────────────
  function openAddDialog() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEditDialog(ingredient: Ingredient) {
    setEditTarget(ingredient);
    setDialogOpen(true);
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
      throw err;
    }
  }

  // ─── Has active filters ───────────────────────────────────────────────────
  const hasFilters =
    search.trim() !== "" ||
    filterBrand !== ALL ||
    filterCategory !== ALL ||
    filterSupplier !== ALL;

  function clearFilters() {
    setSearch("");
    setFilterBrand(ALL);
    setFilterCategory(ALL);
    setFilterSupplier(ALL);
  }

  // ─── Filtered list ───────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    let result = ingredients;

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q) ||
          (i.brand_name ?? "").toLowerCase().includes(q) ||
          (i.category_name ?? "").toLowerCase().includes(q) ||
          (i.supplier_name ?? "").toLowerCase().includes(q)
      );
    }

    if (filterBrand !== ALL) {
      result = result.filter(
        (i) => String(i.brand_id) === filterBrand
      );
    }

    if (filterCategory !== ALL) {
      result = result.filter(
        (i) => String(i.category_id) === filterCategory
      );
    }

    if (filterSupplier !== ALL) {
      result = result.filter(
        (i) => String(i.supplier) === filterSupplier
      );
    }

    return result;
  }, [ingredients, search, filterBrand, filterCategory, filterSupplier]);

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

      {/* ─ Search + Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <Input
          className="h-9 w-64"
          placeholder="Search by name, brand, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Brand filter */}
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Brands</SelectItem>
            {options.brands.map((b) => (
              <SelectItem key={b.value} value={String(b.value)}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Categories</SelectItem>
            {options.categories.map((c) => (
              <SelectItem key={c.value} value={String(c.value)}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Supplier filter */}
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Suppliers</SelectItem>
            {options.suppliers.map((s) => (
              <SelectItem key={s.value} value={String(s.value)}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon className="size-3.5 mr-1" />
            Clear
          </Button>
        )}
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
