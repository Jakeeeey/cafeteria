"use client";

import * as React from "react";
import { PlusIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import CategoryTable from "./components/CategoryTable";
import CategoryFormDialog from "./components/CategoryFormDialog";
import CategoryViewDialog from "./components/CategoryViewDialog";
import {
  fetchCategories,
  createCategory,
  updateCategory,
} from "./providers/fetchProviders";
import type { Category, CategoryFormValues } from "./types";

export default function CategoryRegistrationModule() {
  // ─ List state ─────────────────────────────────────────────────────────
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [listLoading, setListLoading] = React.useState(true);

  // ─ Form dialog state ───────────────────────────────────────────────────
  const [formOpen, setFormOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Category | null>(null);

  // ─ View dialog state ───────────────────────────────────────────────────
  const [viewOpen, setViewOpen] = React.useState(false);
  const [viewTarget, setViewTarget] = React.useState<Category | null>(null);

  // ─ Search + filter state ───────────────────────────────────────────────
  const [search, setSearch] = React.useState("");

  // ─── Load categories ───────────────────────────────────────────────────────
  const loadCategories = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load categories.");
    } finally {
      setListLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ─── Dialog openers ────────────────────────────────────────────────────────
  function openAddDialog() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditTarget(category);
    setFormOpen(true);
  }

  function openViewDialog(category: Category) {
    setViewTarget(category);
    setViewOpen(true);
  }

  // ─── Form submit handler ───────────────────────────────────────────────────
  async function handleFormSubmit(
    values: CategoryFormValues,
    category_id?: number
  ) {
    try {
      if (category_id != null) {
        await updateCategory(category_id, values);
        toast.success("Category updated successfully.");
      } else {
        await createCategory(values);
        toast.success("Category registered successfully.");
      }
      setFormOpen(false);
      await loadCategories();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      throw err;
    }
  }

  // ─── Filtered list ─────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    let result = categories;

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((c) =>
        c.category_name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [categories, search]);

  const hasFilters = search.trim() !== "";

  function clearFilters() {
    setSearch("");
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ─ Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Category Registration
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage cafeteria categories.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            title="Refresh list"
            disabled={listLoading}
            onClick={loadCategories}
          >
            <RefreshCwIcon
              className={`size-4 ${listLoading ? "animate-spin" : ""}`}
            />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button onClick={openAddDialog}>
            <PlusIcon className="size-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* ─ Search + Filter ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-9 w-64"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon className="size-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* ─ Table ────────────────────────────────────────────────────────────── */}
      <CategoryTable
        categories={filtered}
        isLoading={listLoading}
        onView={openViewDialog}
        onEdit={openEditDialog}
      />

      {/* ─ Add / Edit dialog ────────────────────────────────────────────────── */}
      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        onSubmit={handleFormSubmit}
      />

      {/* ─ View dialog ──────────────────────────────────────────────────────── */}
      <CategoryViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        category={viewTarget}
      />
    </div>
  );
}
