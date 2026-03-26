"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

import IngredientMultiSelect from "./IngredientMultiSelect";
import type {
  IngredientOption,
  IngredientSupplier,
  IngredientSupplierFormValues,
} from "../types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  short_cut: z.string().max(255),
  address: z.string().max(255),
  brgy: z.string().max(100),
  city: z.string().max(100),
  province: z.string().max(100),
  country: z.string().max(100),
  contact_number: z.string().max(20),
  is_active: z.number().int().min(0).max(1),
  ingredient_ids: z.array(z.number()),
});

type FormSchema = z.infer<typeof schema>;

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: IngredientSupplier | null;
  ingredients: IngredientOption[];
  optionsLoading: boolean;
  existingSuppliers: IngredientSupplier[];
  onSubmit: (values: IngredientSupplierFormValues, id?: number) => Promise<void>;
}

function toStringOrEmpty(value: string | null | undefined): string {
  return value ?? "";
}

export default function SupplierFormDialog({
  open,
  onOpenChange,
  editTarget,
  ingredients,
  optionsLoading,
  existingSuppliers,
  onSubmit,
}: SupplierFormDialogProps) {
  const isEdit = editTarget !== null;

  const form = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      short_cut: "",
      address: "",
      brgy: "",
      city: "",
      province: "",
      country: "",
      contact_number: "",
      is_active: 1,
      ingredient_ids: [],
    },
  });

  const { isSubmitting } = form.formState;

  React.useEffect(() => {
    if (open && editTarget) {
      form.reset({
        name: editTarget.name,
        short_cut: toStringOrEmpty(editTarget.short_cut),
        address: toStringOrEmpty(editTarget.address),
        brgy: toStringOrEmpty(editTarget.brgy),
        city: toStringOrEmpty(editTarget.city),
        province: toStringOrEmpty(editTarget.province),
        country: toStringOrEmpty(editTarget.country),
        contact_number: toStringOrEmpty(editTarget.contact_number),
        is_active: editTarget.is_active ?? 1,
        ingredient_ids: editTarget.ingredient_ids ?? [],
      });
    } else if (open && !editTarget) {
      form.reset({
        name: "",
        short_cut: "",
        address: "",
        brgy: "",
        city: "",
        province: "",
        country: "",
        contact_number: "",
        is_active: 1,
        ingredient_ids: [],
      });
    }
  }, [open, editTarget, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const trimmed = values.name.trim().toLowerCase();
    const isDuplicate = existingSuppliers.some((s) => {
      const sName = s.name.trim().toLowerCase();
      if (editTarget && s.id === editTarget.id) return false;
      return sName === trimmed;
    });

    if (isDuplicate) {
      form.setError("name", { message: "Supplier name already exists." });
      return;
    }

    await onSubmit(
      {
        name: values.name.trim(),
        short_cut: values.short_cut,
        address: values.address,
        brgy: values.brgy,
        city: values.city,
        province: values.province,
        country: values.country,
        contact_number: values.contact_number,
        is_active: values.is_active,
        ingredient_ids: values.ingredient_ids,
      },
      editTarget?.id
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <div className="text-sm font-semibold">Supplier Information</div>
                  <div className="text-sm text-muted-foreground">
                    Enter the supplier details and optionally assign ingredients.
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>
                          Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. ABC Trading" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="short_cut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shortcut</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. ABC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 0917xxxxxxx" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street / Unit / Building" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brgy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barangay</FormLabel>
                        <FormControl>
                          <Input placeholder="Barangay" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province</FormLabel>
                        <FormControl>
                          <Input placeholder="Province" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="Country" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Toggle supplier availability.
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === 1}
                            onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="ingredient_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingredients</FormLabel>
                  <FormControl>
                    <IngredientMultiSelect
                      options={ingredients}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={optionsLoading || ingredients.length === 0}
                      placeholder={optionsLoading ? "Loading ingredients…" : "Select ingredients…"}
                    />
                  </FormControl>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                )}
                {isEdit ? "Save Changes" : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
