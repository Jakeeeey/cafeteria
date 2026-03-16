// src/app/api/cafeteria/kitchen/product-meal-registration/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 15_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  return url.replace(/\/$/, "");
}

function staticToken(): string {
  const token = process.env.DIRECTUS_STATIC_TOKEN;
  if (!token) throw new Error("DIRECTUS_STATIC_TOKEN is not configured.");
  return token;
}

function folderId(): string {
  return process.env.DIRECTUS_FOLDER_CAFETERIA_ASSETS || "b12891f3-2299-40a3-9ce0-41b6f2cb3901";
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${staticToken()}`,
  };
}

async function proxyFetch(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categories = searchParams.get("categories");
    const ingredients = searchParams.get("ingredients");

    if (categories) {
      const res = await proxyFetch(`${baseUrl()}/items/meal_categories`, {
        method: "GET",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const error = await parseJson(res);
        return NextResponse.json(error, { status: res.status });
      }
      const data = await parseJson(res);
      return NextResponse.json(data.data || []);
    }

    if (ingredients) {
      const res = await proxyFetch(
        `${baseUrl()}/items/ingredients?fields=*,unit_of_measurement.*`,
        {
          method: "GET",
          headers: authHeaders(),
        }
      );
      if (!res.ok) {
        const error = await parseJson(res);
        return NextResponse.json(error, { status: res.status });
      }
      const data = await parseJson(res);
      return NextResponse.json(data.data || []);
    }

    const res = await proxyFetch(
      `${baseUrl()}/items/meals?fields=*,category.*`,
      {
        method: "GET",
        headers: authHeaders(),
      }
    );
    if (!res.ok) {
      const error = await parseJson(res);
      return NextResponse.json(error, { status: res.status });
    }
    const data = await parseJson(res);

    const catRes = await proxyFetch(`${baseUrl()}/items/meal_categories`, {
      method: "GET",
      headers: authHeaders(),
    });
    const catData = await parseJson(catRes);
    const cats = (catData?.data || []) as any[];

    const mealIds = (data.data || []).map((m: any) => Number(m.id));
    console.log("[GET] Looking for ingredients for meals:", mealIds);

    let ingredientMap: Record<number, any[]> = {};
    if (mealIds.length > 0) {
      // Use *.* to expand all first-level relations automatically
      const ingrRes = await proxyFetch(
        `${baseUrl()}/items/meal_ingredients?fields=*.*&filter[meal_id][_in]=${mealIds.join(",")}&limit=-1`,
        { method: "GET", headers: authHeaders() }
      );
      const ingrData = await parseJson(ingrRes);
      const allIngrList = Array.isArray(ingrData)
        ? ingrData
        : (ingrData?.data ?? ingrData?.content ?? []);

      console.log(`[GET] Received ${allIngrList.length} ingredient records from Directus`);

      allIngrList.forEach((rec: any) => {
        // Directus might return meal_id as a number, a string, or an object
        const mid = rec.meal_id?.id ?? rec.meal_id;
        const midNum = Number(mid);

        if (!isNaN(midNum)) {
          if (!ingredientMap[midNum]) ingredientMap[midNum] = [];

          // Map either 'ingredient_id' or 'ingredient' to the 'ingredient' field
          // Directus often uses the field name for the expanded object
          const ingredientObj = rec.ingredient_id || rec.ingredient;

          const mapped = {
            ...rec,
            ingredient_id: typeof ingredientObj === "object" ? ingredientObj.id : (rec.ingredient_id ?? rec.ingredient),
            ingredient: typeof ingredientObj === "object" ? ingredientObj : null
          };
          ingredientMap[midNum].push(mapped);
        }
      });
    }

    const rawMeals = (data.data || []);
    const meals = rawMeals.map((meal: any) => {
      const mid = Number(meal.id);
      const category = meal.category || cats.find((c) => Number(c.id) === Number(meal.category_id)) || null;
      const ingr = ingredientMap[mid] || [];
      return {
        ...meal,
        cost_per_serving: Number(meal.cost_per_serving) || 0,
        category,
        ingredients: ingr,
      };
    });
    return NextResponse.json(meals);
  } catch (err: any) {
    console.error("GET error:", err);
    return NextResponse.json(
      { message: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let body: any;
    let imageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = {
        name: formData.get("name"),
        description: formData.get("description"),
        serving: parseInt(formData.get("serving") as string),
        cost_per_serving: parseFloat(formData.get("cost_per_serving") as string) || 0,
        category_id: formData.get("category_id") ? parseInt(formData.get("category_id") as string) : null,
        ingredients: JSON.parse(formData.get("ingredients") as string),
      };
      const maybeImage = formData.get("image");
      imageFile = maybeImage instanceof File && maybeImage.size > 0 ? maybeImage : null;
    } else {
      body = await request.json();
      imageFile = null;
    }

    const { name, description, serving, cost_per_serving, category_id, ingredients } = body;

    let imageUrl = null;
    if (imageFile) {
      const uploadFormData = new FormData();
      // 🔥 CRITICAL: Append folder FIRST or ensure it is part of the form data
      uploadFormData.append("folder", folderId());
      // Explicitly providing the filename ensures Directus identifies it correctly
      uploadFormData.append("file", imageFile, imageFile.name);

      const uploadRes = await proxyFetch(`${baseUrl()}/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${staticToken()}`,
          Accept: "application/json",
        },
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        const error = await parseJson(uploadRes);
        console.error("[POST] Image Upload Failed:", error);
        return NextResponse.json(error, { status: uploadRes.status });
      }

      const uploadData = await parseJson(uploadRes);
      // Store just the UUID if it's a File field, but we'll stick to the current path-style for now 
      // as it was already using it. However, if the field is a File type, it should be just the ID.
      // Based on common patterns in this project, it seems it expects the asset path.
      imageUrl = `/assets/${uploadData.data.id}`;
    }

    const mealData = {
      name,
      description,
      image: imageUrl,
      serving,
      cost_per_serving,
      category_id,
    };

    const mealRes = await proxyFetch(`${baseUrl()}/items/meals`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(mealData),
    });

    if (!mealRes.ok) {
      const error = await parseJson(mealRes);
      return NextResponse.json(error, { status: mealRes.status });
    }

    const meal = await parseJson(mealRes);
    console.log("[POST] Directus Meal Creation Response:", JSON.stringify(meal));
    const mealId = meal?.data?.id ?? meal?.id;

    if (!mealId) {
      console.error("[POST] API failed to return a meal ID:", meal);
      throw new Error("Failed to retrieve ID of the created meal.");
    }

    console.log("[POST] Created Meal ID:", mealId);

    if (ingredients && ingredients.length > 0) {
      const payload = ingredients.map((ing: any) => ({
        meal_id: mealId,
        ingredient_id: Number(ing.ingredient_id),
        quantity: Number(ing.quantity),
      }));

      console.log(`[POST] Bulk saving ${ingredients.length} ingredients:`, JSON.stringify(payload));
      const ingrUrl = `${baseUrl()}/items/meal_ingredients`;
      console.log(`[POST] URL: ${ingrUrl}`);

      const res = await proxyFetch(ingrUrl, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await parseJson(res);
        console.error("[POST] Bulk save failed:", err);
        throw new Error(`Failed to save ingredients: ${JSON.stringify(err)}`);
      }
      console.log("[POST] Ingredients saved successfully");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST error:", err);
    return NextResponse.json(
      { message: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let body: any;
    let imageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = {
        id: parseInt(formData.get("id") as string),
        name: formData.get("name"),
        description: formData.get("description"),
        serving: parseInt(formData.get("serving") as string),
        cost_per_serving: parseFloat(formData.get("cost_per_serving") as string) || 0,
        category_id: formData.get("category_id") ? parseInt(formData.get("category_id") as string) : null,
        ingredients: JSON.parse(formData.get("ingredients") as string),
      };
      const maybeImage = formData.get("image");
      imageFile = maybeImage instanceof File && maybeImage.size > 0 ? maybeImage : null;
    } else {
      body = await request.json();
      imageFile = null;
    }

    const { id, name, description, serving, cost_per_serving, category_id, ingredients } = body;

    let imageUrl = null;
    if (imageFile) {
      const uploadFormData = new FormData();
      uploadFormData.append("folder", folderId());
      uploadFormData.append("file", imageFile, imageFile.name);

      const uploadRes = await proxyFetch(`${baseUrl()}/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${staticToken()}`,
          Accept: "application/json",
        },
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        const error = await parseJson(uploadRes);
        console.error("[PUT] Image Upload Failed:", error);
        return NextResponse.json(error, { status: uploadRes.status });
      }

      const uploadData = await parseJson(uploadRes);
      imageUrl = `/assets/${uploadData.data.id}`;
    }

    const mealData = {
      name,
      description,
      ...(imageUrl && { image: imageUrl }),
      serving,
      cost_per_serving,
      category_id,
    };

    const mealRes = await proxyFetch(`${baseUrl()}/items/meals/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(mealData),
    });

    if (!mealRes.ok) {
      const error = await parseJson(mealRes);
      return NextResponse.json(error, { status: mealRes.status });
    }

    // 🔥 CRITICAL: Directus Bulk Delete Fix
    // Directus does not support bulk DELETE with a query filter like `?filter[meal_id]=${id}`.
    // We must first fetch the IDs of the records to delete, then send them in the request body.
    const existingRes = await proxyFetch(
      `${baseUrl()}/items/meal_ingredients?filter[meal_id][_eq]=${id}&fields=id`,
      { method: "GET", headers: authHeaders() }
    );
    const existingData = await parseJson(existingRes);
    const existingIds: number[] = (existingData?.data ?? []).map((r: any) => r.id);

    if (existingIds.length > 0) {
      await proxyFetch(`${baseUrl()}/items/meal_ingredients`, {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify(existingIds),
      });
    }

    if (ingredients && ingredients.length > 0) {
      const payload = ingredients.map((ing: any) => ({
        meal_id: id,
        ingredient_id: Number(ing.ingredient_id),
        quantity: Number(ing.quantity),
      }));

      console.log(`[PUT] Bulk saving ${ingredients.length} ingredients:`, JSON.stringify(payload));

      const res = await proxyFetch(`${baseUrl()}/items/meal_ingredients`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await parseJson(res);
        console.error("[PUT] Bulk save failed:", err);
        throw new Error(`Failed to save ingredients: ${JSON.stringify(err)}`);
      }
      console.log("[PUT] Ingredients saved successfully");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT error:", err);
    return NextResponse.json(
      { message: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    const mealRes = await proxyFetch(`${baseUrl()}/items/meals/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        deleted_at: new Date().toISOString(),
      }),
    });

    if (!mealRes.ok) {
      const error = await parseJson(mealRes);
      return NextResponse.json(error, { status: mealRes.status });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE error:", err);
    return NextResponse.json(
      { message: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
