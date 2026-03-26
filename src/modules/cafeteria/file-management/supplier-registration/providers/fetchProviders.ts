import type {
	IngredientSupplier,
	IngredientSupplierFormValues,
	SupplierOptions,
} from "../types";

const BASE = "/api/cafeteria/file-management/supplier-registration";

// ─── GET – list suppliers ───────────────────────────────────────────────────
export async function fetchSuppliers(): Promise<IngredientSupplier[]> {
	const res = await fetch(BASE, { cache: "no-store" });
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(text || `Failed to fetch suppliers (${res.status})`);
	}
	const json = await res.json();
	return Array.isArray(json) ? json : (json.data ?? json.content ?? []);
}

// ─── GET – ingredient options for assignment ────────────────────────────────
export async function fetchOptions(): Promise<SupplierOptions> {
	const res = await fetch(`${BASE}?options=true`, { cache: "no-store" });
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(text || `Failed to fetch options (${res.status})`);
	}
	return res.json();
}

// ─── POST – create supplier ────────────────────────────────────────────────
export async function createSupplier(data: IngredientSupplierFormValues): Promise<void> {
	const res = await fetch(BASE, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const json = await res.json().catch(() => ({}));
		throw new Error(json.message ?? `Failed to create supplier (${res.status})`);
	}
}

// ─── PUT – update supplier ────────────────────────────────────────────────
export async function updateSupplier(
	id: number,
	data: IngredientSupplierFormValues
): Promise<void> {
	const res = await fetch(BASE, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id, ...data }),
	});
	if (!res.ok) {
		const json = await res.json().catch(() => ({}));
		throw new Error(json.message ?? `Failed to update supplier (${res.status})`);
	}
}

