"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import type { Ingredient, IngredientFormValues, IngredientOptions } from "../types";

// ─── Zod schema ──────────────────────────────────────────────────────────────
// Avoid z.coerce.* — coerce types produce `unknown` as input type in Zod v4,
// which breaks @hookform/resolvers' Resolver type parameter.
// The number input field already delivers a number via valueAsNumber.

const schema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(5000),
  brand_id: z.number().nullable(),
  category_id: z.number().nullable(),
  unit_of_measurement: z.number().min(1, "Unit of measurement is required"),
  unit_count: z.number().positive("Unit count must be greater than 0"),
  cost_per_unit: z.number().positive("Cost per unit must be greater than 0"),
  is_active: z.number(),
  shelf_life: z.number().positive("Shelf life must be greater than 0").nullable(),
});

type FormSchema = z.infer<typeof schema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NONE_VALUE = "__none__";

function toSelectString(val: number | null | undefined): string {
  return val == null ? NONE_VALUE : String(val);
}

function fromSelectString(val: string): number | null {
  return val === NONE_VALUE ? null : Number(val);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface IngredientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: Ingredient | null;
  options: IngredientOptions;
  optionsLoading: boolean;
  existingIngredients: Ingredient[];
  onSubmit: (values: IngredientFormValues, id?: number) => Promise<void>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function IngredientFormDialog({
  open,
  onOpenChange,
  editTarget,
  options,
  optionsLoading,
  existingIngredients,
  onSubmit,
}: IngredientFormDialogProps) {
  const isEdit = editTarget !== null;

  const form = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      brand_id: null,
      category_id: null,
      unit_of_measurement: 0,
      unit_count: 1,
      cost_per_unit: 0,
      is_active: 1,
      shelf_life: null,
    },
  });

  const { isSubmitting } = form.formState;

  // Custom validation for unique name
  const validateUniqueName = (name: string): boolean => {
    const trimmedName = name.trim().toLowerCase();
    const isDuplicate = existingIngredients.some(
      (ingredient) =>
        ingredient.name.toLowerCase() === trimmedName &&
        ingredient.id !== editTarget?.id
    );
    return !isDuplicate;
  };

  // Populate form when editing
  React.useEffect(() => {
    if (open && editTarget) {
      form.reset({
        name: editTarget.name,
        description: editTarget.description ?? "",
        brand_id: editTarget.brand_id ?? null,
        category_id: editTarget.category_id ?? null,
        unit_of_measurement: editTarget.unit_of_measurement,
        unit_count: Number(editTarget.unit_count),
        cost_per_unit: Number(editTarget.cost_per_unit),
        is_active: editTarget.is_active,
        shelf_life: editTarget.shelf_life ?? null,
      });
    } else if (open && !editTarget) {
      form.reset({
        name: "",
        description: "",
        brand_id: null,
        category_id: null,
        unit_of_measurement: 0,
        unit_count: 1,
        cost_per_unit: 0,
        is_active: 1,
        shelf_life: null,
      });
    }
  }, [open, editTarget, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    // Validate unique name before submission
    if (!validateUniqueName(values.name)) {
      form.setError("name", {
        type: "manual",
        message: "An ingredient with this name already exists.",
      });
      return;
    }

    await onSubmit(
      {
        name: values.name,
        description: values.description ?? "",
        brand_id: values.brand_id,
        category_id: values.category_id,
        unit_of_measurement: values.unit_of_measurement,
        unit_count: values.unit_count,
        cost_per_unit: values.cost_per_unit,
        is_active: values.is_active,
        shelf_life: values.shelf_life,
      },
      editTarget?.id
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Ingredient" : "Register Ingredient"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. All-Purpose Flour"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        const value = e.target.value;
                        if (value && !validateUniqueName(value)) {
                          form.setError("name", {
                            type: "manual",
                            message: "An ingredient with this name already exists.",
                          });
                        } else {
                          form.clearErrors("name");
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description…"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Brand + Category (side by side on sm+) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Brand */}
              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <SearchableSelect
                      className="w-full"
                      disabled={optionsLoading}
                      value={toSelectString(field.value)}
                      onValueChange={(v) => field.onChange(fromSelectString(v))}
                      placeholder="Select brand..."
                      options={[
                        { value: NONE_VALUE, label: "None" },
                        ...options.brands.map((b) => ({
                          value: String(b.value),
                          label: b.label,
                        })),
                      ]}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <SearchableSelect
                      className="w-full"
                      disabled={optionsLoading}
                      value={toSelectString(field.value)}
                      onValueChange={(v) => field.onChange(fromSelectString(v))}
                      placeholder="Select category..."
                      options={[
                        { value: NONE_VALUE, label: "None" },
                        ...options.categories.map((c) => ({
                          value: String(c.value),
                          label: c.label,
                        })),
                      ]}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Unit of Measurement + Unit Count (side by side) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Unit of Measurement */}
              <FormField
                control={form.control}
                name="unit_of_measurement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Unit of Measurement{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      disabled={optionsLoading}
                      value={field.value != null ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select unit…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.units.map((u) => (
                          <SelectItem key={u.value} value={String(u.value)}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Count */}
              <FormField
                control={form.control}
                name="unit_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Unit Count <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cost per Unit */}
            <FormField
              control={form.control}
              name="cost_per_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Cost per Unit <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isEdit}
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const val = e.target.valueAsNumber;
                        field.onChange(isNaN(val) ? 0 : val);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status + Shelf Life (side by side) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Status (Active/Inactive) */}
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Status <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Active</SelectItem>
                        <SelectItem value="0">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Shelf Life */}
              <FormField
                control={form.control}
                name="shelf_life"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shelf Life (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 30"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? null : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || optionsLoading}>
                {isSubmitting && (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                )}
                {isEdit ? "Save Changes" : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
