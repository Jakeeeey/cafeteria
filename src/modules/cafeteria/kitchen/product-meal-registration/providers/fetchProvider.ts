import type { Meal, MealCategory, Ingredient, CreateMealRequest, UpdateMealRequest, MealWithIngredients } from "../types";

const BASE = "/api/cafeteria/kitchen/product-meal-registration";

// ─── GET all meals ──────────────────────────────────────────────────────
export async function fetchMeals(): Promise<MealWithIngredients[]> {
  const res = await fetch(BASE, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch meals (${res.status})`);
  }
  const json = await res.json();
  const data = Array.isArray(json) ? json : (json.data ?? json.content ?? []);

  // log raw payload so we can see whether the server is returning
  // meal_ingredients/ingredients at all
  console.debug("[fetchMeals] raw data:", data);

  return (data as any[]).map((m) => {
    let rawIngredients: any = m.ingredients || m.meal_ingredients || [];
    // Directus may wrap relational arrays in a `{ data: [...] }` object
    if (rawIngredients && !Array.isArray(rawIngredients) && rawIngredients.data) {
      rawIngredients = rawIngredients.data;
    }
    // final guard – ensure we have an array
    if (!Array.isArray(rawIngredients)) rawIngredients = [];

    return {
      ...m,
      cost_per_serving: Number(m.cost_per_serving) || 0,
      ingredients: rawIngredients.map((ing: any) => {
        const ingData = ing.ingredient || {};
        const unitOfMeasurement = ingData.unit_of_measurement;
        const unit =
          (typeof unitOfMeasurement === "object"
            ? unitOfMeasurement?.unit_name || unitOfMeasurement?.name || unitOfMeasurement?.abbreviation
            : null) ||
          ingData.unit ||
          ingData.unit_name ||
          ingData.unit_abbreviation ||
          ingData.uom_name ||
          ingData.uom ||
          ingData.measurement_unit ||
          ingData.measure ||
          ingData.short_name ||
          ingData.abbreviation ||
          ingData.unit_of_measure ||
          ingData.unit_measure ||
          ingData.units ||
          "";

        return {
          ...ing,
          ingredient: {
            ...ingData,
            unit,
          },
        };
      }),
    };
  });
}

// ─── GET meal categories ─────────────────────────────────────────────────
export async function fetchMealCategories(): Promise<MealCategory[]> {
  const res = await fetch(`${BASE}?categories=true`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch meal categories (${res.status})`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : (json.data ?? json.content ?? []);
}

// ─── GET ingredients ────────────────────────────────────────────────────
// Use the standalone ingredient-registration API instead of the meal route.
// That endpoint is already responsible for normalising the shape and
// expanding the necessary relations, so we can just forward its result.
export async function fetchIngredients(): Promise<Ingredient[]> {
  const res = await fetch("/api/cafeteria/kitchen/ingredient-registration", { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch ingredients (${res.status})`);
  }
  const json = await res.json();
  const ingredients = Array.isArray(json) ? json : (json.data ?? json.content ?? []);

  // keep same normalization as before (unit field) in case the other route
  // does not already supply it.
  return ingredients.map((ing: any) => {
    const unitOfMeasurement = ing.unit_of_measurement;
    const unit =
      (typeof unitOfMeasurement === "object"
        ? unitOfMeasurement?.unit_name || unitOfMeasurement?.name || unitOfMeasurement?.abbreviation
        : null) ||
      ing.unit ||
      ing.unit_name ||
      ing.unit_abbreviation ||
      ing.uom_name ||
      ing.uom ||
      ing.measurement_unit ||
      ing.measure ||
      ing.short_name ||
      ing.abbreviation ||
      ing.unit_of_measure ||
      ing.unit_measure ||
      ing.units ||
      "";

    return {
      ...ing,
      unit,
    };
  });
}

// ─── POST – create meal ─────────────────────────────────────────────────
export async function createMeal(data: CreateMealRequest): Promise<void> {
  const formData = new FormData();
  formData.append("name", data.name);
  if (data.description) formData.append("description", data.description);
  if (data.image) {
    if (data.image instanceof File) {
      formData.append("image", data.image);
    } else {
      // If it's a string URL, don't include in formData, handle separately
      // But for now, assume it's File
    }
  }
  formData.append("serving", data.serving.toString());
  formData.append("cost_per_serving", data.cost_per_serving.toString());
  if (data.category_id) formData.append("category_id", data.category_id.toString());
  formData.append("ingredients", JSON.stringify(data.ingredients));

  const res = await fetch(BASE, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `Failed to create meal (${res.status})`);
  }
}

// ─── PUT – update meal ──────────────────────────────────────────────────
export async function updateMeal(data: UpdateMealRequest): Promise<void> {
  const formData = new FormData();
  formData.append("id", data.id.toString());
  if (data.name) formData.append("name", data.name);
  if (data.description !== undefined) formData.append("description", data.description);
  if (data.image) {
    if (data.image instanceof File) {
      formData.append("image", data.image);
    }
  }
  if (data.serving) formData.append("serving", data.serving.toString());
  if (data.cost_per_serving !== undefined) formData.append("cost_per_serving", data.cost_per_serving.toString());
  if (data.category_id !== undefined) formData.append("category_id", data.category_id?.toString() || "");
  if (data.ingredients) formData.append("ingredients", JSON.stringify(data.ingredients));

  const res = await fetch(BASE, {
    method: "PUT",
    body: formData,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `Failed to update meal (${res.status})`);
  }
}

// ─── DELETE – delete meal ───────────────────────────────────────────────
export async function deleteMeal(id: number): Promise<void> {
  const res = await fetch(BASE, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `Failed to delete meal (${res.status})`);
  }
}