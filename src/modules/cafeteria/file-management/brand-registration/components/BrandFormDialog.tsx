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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import type { Brand, BrandFormValues } from "../types";

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  brand_name: z.string().min(1, "Brand name is required").max(255),
  sku_code: z.string().max(50).optional().default(""),
});

type FormSchema = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface BrandFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: Brand | null;
  onSubmit: (values: BrandFormValues, brand_id?: number) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BrandFormDialog({
  open,
  onOpenChange,
  editTarget,
  onSubmit,
}: BrandFormDialogProps) {
  const isEdit = editTarget !== null;

  const form = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { brand_name: "", sku_code: "" },
  });

  const { isSubmitting } = form.formState;

  React.useEffect(() => {
    if (open && editTarget) {
      form.reset({
        brand_name: editTarget.brand_name,
        sku_code: editTarget.sku_code ?? "",
      });
    } else if (open && !editTarget) {
      form.reset({ brand_name: "", sku_code: "" });
    }
  }, [open, editTarget, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(
      { brand_name: values.brand_name, sku_code: values.sku_code ?? "" },
      editTarget?.brand_id
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Brand" : "Add Brand"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Brand Name */}
            <FormField
              control={form.control}
              name="brand_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Brand Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Nestle" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SKU Code */}
            <FormField
              control={form.control}
              name="sku_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. NES-001" {...field} />
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
                {isEdit ? "Save Changes" : "Add Brand"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
