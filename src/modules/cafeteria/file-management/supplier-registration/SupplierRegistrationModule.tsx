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

import SupplierTable from "./components/SupplierTable";
import SupplierFormDialog from "./components/SupplierFormDialog";
import SupplierViewDialog from "./components/SupplierViewDialog";
import {
	createSupplier,
	fetchOptions,
	fetchSuppliers,
	updateSupplier,
} from "./providers/fetchProviders";
import type {
	IngredientSupplier,
	IngredientSupplierFormValues,
	SupplierOptions,
} from "./types";

const EMPTY_OPTIONS: SupplierOptions = { ingredients: [] };

const STATUS_ALL = "all";
const STATUS_ACTIVE = "active";
const STATUS_INACTIVE = "inactive";

export default function SupplierRegistrationModule() {
	// ─ List state ─────────────────────────────────────────────────────────
	const [suppliers, setSuppliers] = React.useState<IngredientSupplier[]>([]);
	const [listLoading, setListLoading] = React.useState(true);

	// ─ Options state ──────────────────────────────────────────────────────
	const [options, setOptions] = React.useState<SupplierOptions>(EMPTY_OPTIONS);
	const [optionsLoading, setOptionsLoading] = React.useState(false);

	// ─ Dialog state ───────────────────────────────────────────────────────
	const [formOpen, setFormOpen] = React.useState(false);
	const [editTarget, setEditTarget] = React.useState<IngredientSupplier | null>(null);

	// ─ View dialog state ──────────────────────────────────────────────────
	const [viewOpen, setViewOpen] = React.useState(false);
	const [viewTarget, setViewTarget] = React.useState<IngredientSupplier | null>(null);

	// ─ Search state ───────────────────────────────────────────────────────
	const [search, setSearch] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<string>(STATUS_ALL);

	// ─── Load suppliers ───────────────────────────────────────────────────
	const loadSuppliers = React.useCallback(async () => {
		setListLoading(true);
		try {
			const data = await fetchSuppliers();
			setSuppliers(data);
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Failed to load suppliers.");
		} finally {
			setListLoading(false);
		}
	}, []);

	// ─── Load ingredient options ──────────────────────────────────────────
	const loadOptions = React.useCallback(async () => {
		setOptionsLoading(true);
		try {
			const data = await fetchOptions();
			setOptions(data);
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Failed to load options.");
		} finally {
			setOptionsLoading(false);
		}
	}, []);

	React.useEffect(() => {
		loadSuppliers();
		loadOptions();
	}, [loadSuppliers, loadOptions]);

	// ─── Dialog openers ───────────────────────────────────────────────────
	function openAddDialog() {
		setEditTarget(null);
		setFormOpen(true);
	}

	function openEditDialog(supplier: IngredientSupplier) {
		setEditTarget(supplier);
		setFormOpen(true);
	}

	function openViewDialog(supplier: IngredientSupplier) {
		setViewTarget(supplier);
		setViewOpen(true);
	}

	// ─── Submit handler ───────────────────────────────────────────────────
	async function handleFormSubmit(values: IngredientSupplierFormValues, id?: number) {
		try {
			if (id != null) {
				await updateSupplier(id, values);
				toast.success("Supplier updated successfully.");
			} else {
				await createSupplier(values);
				toast.success("Supplier registered successfully.");
			}
			setFormOpen(false);
			await loadSuppliers();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Something went wrong.");
			throw err;
		}
	}

	// ─── Filtered list ────────────────────────────────────────────────────
	const filtered = React.useMemo(() => {
		let result = suppliers;
		const q = search.trim().toLowerCase();
		if (q) {
			result = result.filter((s) => s.name.toLowerCase().includes(q));
		}
		if (statusFilter === STATUS_ACTIVE) {
			result = result.filter((s) => Number(s.is_active) === 1);
		} else if (statusFilter === STATUS_INACTIVE) {
			result = result.filter((s) => Number(s.is_active) === 0);
		}
		return result;
	}, [suppliers, search, statusFilter]);

	const hasFilters = search.trim() !== "" || statusFilter !== STATUS_ALL;

	function clearFilters() {
		setSearch("");
		setStatusFilter(STATUS_ALL);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold tracking-tight">Supplier Registration</h2>
					<p className="text-sm text-muted-foreground">
						Manage ingredient suppliers and their sourced ingredients.
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						title="Refresh list"
						disabled={listLoading}
						onClick={loadSuppliers}
					>
						<RefreshCwIcon className={`size-4 ${listLoading ? "animate-spin" : ""}`} />
						<span className="sr-only">Refresh</span>
					</Button>
					<Button onClick={openAddDialog}>
						<PlusIcon className="size-4" />
						Add Supplier
					</Button>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<Input
					className="h-9 w-64"
					placeholder="Search by name…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="h-9 w-40">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={STATUS_ALL}>All Status</SelectItem>
						<SelectItem value={STATUS_ACTIVE}>Active</SelectItem>
						<SelectItem value={STATUS_INACTIVE}>Inactive</SelectItem>
					</SelectContent>
				</Select>

				{hasFilters && (
					<Button variant="ghost" size="sm" onClick={clearFilters}>
						<XIcon className="size-3.5 mr-1" />
						Clear
					</Button>
				)}
			</div>

			<SupplierTable
				suppliers={filtered}
				isLoading={listLoading}
				onView={openViewDialog}
				onEdit={openEditDialog}
			/>

			<SupplierFormDialog
				open={formOpen}
				onOpenChange={setFormOpen}
				editTarget={editTarget}
				ingredients={options.ingredients}
				optionsLoading={optionsLoading}
				existingSuppliers={suppliers}
				onSubmit={handleFormSubmit}
			/>

			<SupplierViewDialog
				open={viewOpen}
				onOpenChange={setViewOpen}
				supplier={viewTarget}
				ingredients={options.ingredients}
			/>
		</div>
	);
}

