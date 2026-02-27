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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  unit_of_measurement: z.number({ message: "Unit of measurement is required" }),
  unit_count: z.number().positive("Unit count must be greater than 0"),
  supplier: z.number().nullable(),
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
  onSubmit: (values: IngredientFormValues, id?: number) => Promise<void>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function IngredientFormDialog({
  open,
  onOpenChange,
  editTarget,
  options,
  optionsLoading,
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
      unit_of_measurement: undefined as unknown as number,
      unit_count: 1,
      supplier: null,
    },
  });

  const { isSubmitting } = form.formState;

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
        supplier: editTarget.supplier ?? null,
      });
    } else if (open && !editTarget) {
      form.reset({
        name: "",
        description: "",
        brand_id: null,
        category_id: null,
        unit_of_measurement: undefined as unknown as number,
        unit_count: 1,
        supplier: null,
      });
    }
  }, [open, editTarget, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(
      {
        name: values.name,
        description: values.description ?? "",
        brand_id: values.brand_id,
        category_id: values.category_id,
        unit_of_measurement: values.unit_of_measurement,
        unit_count: values.unit_count,
        supplier: values.supplier,
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
                    <Input placeholder="e.g. All-Purpose Flour" {...field} />
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
                    <Select
                      disabled={optionsLoading}
                      value={toSelectString(field.value)}
                      onValueChange={(v) => field.onChange(fromSelectString(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select brand…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>
                          <span className="text-muted-foreground">None</span>
                        </SelectItem>
                        {options.brands.map((b) => (
                          <SelectItem key={b.value} value={String(b.value)}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select
                      disabled={optionsLoading}
                      value={toSelectString(field.value)}
                      onValueChange={(v) => field.onChange(fromSelectString(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>
                          <span className="text-muted-foreground">None</span>
                        </SelectItem>
                        {options.categories.map((c) => (
                          <SelectItem key={c.value} value={String(c.value)}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select
                    disabled={optionsLoading}
                    value={toSelectString(field.value)}
                    onValueChange={(v) => field.onChange(fromSelectString(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select supplier…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>
                        <span className="text-muted-foreground">None</span>
                      </SelectItem>
                      {options.suppliers.map((s) => (
                        <SelectItem key={s.value} value={String(s.value)}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
