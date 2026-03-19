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

import BrandTable from "./components/BrandTable";
import BrandFormDialog from "./components/BrandFormDialog";
import BrandViewDialog from "./components/BrandViewDialog";
import { fetchBrands, createBrand, updateBrand } from "./providers/fetchProviders";
import type { Brand, BrandFormValues } from "./types";

const ALL = "__all__";
const HAS_SKU = "has_sku";
const NO_SKU = "no_sku";

export default function BrandRegistrationModule() {
  // ─ List state ─────────────────────────────────────────────────────────
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [listLoading, setListLoading] = React.useState(true);

  // ─ Form dialog state ───────────────────────────────────────────────────
  const [formOpen, setFormOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Brand | null>(null);

  // ─ View dialog state ───────────────────────────────────────────────────
  const [viewOpen, setViewOpen] = React.useState(false);
  const [viewTarget, setViewTarget] = React.useState<Brand | null>(null);

  // ─ Search + filter state ───────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [skuFilter, setSkuFilter] = React.useState(ALL);

  // ─── Load brands ───────────────────────────────────────────────────────────
  const loadBrands = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchBrands();
      setBrands(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load brands.");
    } finally {
      setListLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  // ─── Dialog openers ────────────────────────────────────────────────────────
  function openAddDialog() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEditDialog(brand: Brand) {
    setEditTarget(brand);
    setFormOpen(true);
  }

  function openViewDialog(brand: Brand) {
    setViewTarget(brand);
    setViewOpen(true);
  }

  // ─── Form submit handler ───────────────────────────────────────────────────
  async function handleFormSubmit(values: BrandFormValues, brand_id?: number) {
    try {
      if (brand_id != null) {
        await updateBrand(brand_id, values);
        toast.success("Brand updated successfully.");
      } else {
        await createBrand(values);
        toast.success("Brand registered successfully.");
      }
      setFormOpen(false);
      await loadBrands();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      throw err;
    }
  }

  // ─── Filtered list ─────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    let result = brands;

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (b) =>
          b.brand_name.toLowerCase().includes(q) ||
          (b.sku_code ?? "").toLowerCase().includes(q)
      );
    }

    if (skuFilter === HAS_SKU) {
      result = result.filter((b) => b.sku_code != null && b.sku_code !== "");
    } else if (skuFilter === NO_SKU) {
      result = result.filter((b) => b.sku_code == null || b.sku_code === "");
    }

    return result;
  }, [brands, search, skuFilter]);

  const hasFilters = search.trim() !== "" || skuFilter !== ALL;

  function clearFilters() {
    setSearch("");
    setSkuFilter(ALL);
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ─ Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Brand Registration
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage cafeteria brands.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            title="Refresh list"
            disabled={listLoading}
            onClick={loadBrands}
          >
            <RefreshCwIcon
              className={`size-4 ${listLoading ? "animate-spin" : ""}`}
            />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button onClick={openAddDialog}>
            <PlusIcon className="size-4" />
            Add Brand
          </Button>
        </div>
      </div>

      {/* ─ Search + Filter ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-9 w-64"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select value={skuFilter} onValueChange={setSkuFilter}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="SKU Code" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Brands</SelectItem>
            <SelectItem value={HAS_SKU}>Has SKU Code</SelectItem>
            <SelectItem value={NO_SKU}>No SKU Code</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon className="size-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* ─ Table ────────────────────────────────────────────────────────────── */}
      <BrandTable
        brands={filtered}
        isLoading={listLoading}
        onView={openViewDialog}
        onEdit={openEditDialog}
      />

      {/* ─ Add / Edit dialog ────────────────────────────────────────────────── */}
      <BrandFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
        onSubmit={handleFormSubmit}
      />

      {/* ─ View dialog ──────────────────────────────────────────────────────── */}
      <BrandViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        brand={viewTarget}
      />
    </div>
  );
}
