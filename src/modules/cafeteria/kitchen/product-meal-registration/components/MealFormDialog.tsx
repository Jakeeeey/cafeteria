"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon, PlusIcon, TrashIcon, XIcon, UploadCloudIcon, Check, ChevronsUpDown } from "lucide-react";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { MealWithIngredients, MealCategory, Ingredient, CreateMealRequest, UpdateMealRequest } from "../types";

// ─── Zod schema ──────────────────────────────────────────────────────────────
const ingredientSchema = z.object({
  ingredient_id: z.number({ message: "Ingredient is required" }).min(1, "Required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
});

const schema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().min(1, "Description is required").max(5000),
  image: z.union([z.instanceof(File), z.string()]).refine((val) => val !== undefined && val !== "", {
    message: "Image is required",
  }),
  serving: z.number().int().positive("Serving must be greater than 0"),
  cost_per_serving: z.number().min(0.01, "Cost per serving must be greater than 0"),
  category_id: z.number({ message: "Category is required" }).int(),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient is required"),
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
interface MealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: MealWithIngredients | null;
  categories: MealCategory[];
  ingredients: Ingredient[];
  onCreate: (data: CreateMealRequest) => Promise<void>;
  onUpdate: (data: UpdateMealRequest) => Promise<void>;
  optionsLoading: boolean;
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function MealFormDialog({
  open,
  onOpenChange,
  editTarget,
  categories,
  ingredients,
  onCreate,
  onUpdate,
  optionsLoading,
}: MealFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        {open && (
          <MealFormInner
            key={editTarget?.id ?? "new"}
            editTarget={editTarget}
            categories={categories}
            ingredients={ingredients}
            onCreate={onCreate}
            onUpdate={onUpdate}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface InnerProps extends Omit<MealFormDialogProps, "open" | "onOpenChange" | "optionsLoading"> {
  onClose: () => void;
}

function MealFormInner({
  editTarget,
  categories,
  ingredients,
  onCreate,
  onUpdate,
  onClose,
}: InnerProps) {
  const isEdit = editTarget !== null;
  const [isAddIngOpen, setIsAddIngOpen] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editTarget?.name ?? "",
      description: editTarget?.description ?? "",
      image: editTarget?.image ?? undefined,
      serving: editTarget?.serving ?? 1,
      cost_per_serving: editTarget?.cost_per_serving ?? 0,
      category_id: editTarget?.category_id ?? undefined,
      ingredients: editTarget?.ingredients?.map((ing) => ({
        ingredient_id: ing.ingredient_id,
        quantity: Number(ing.quantity),
      })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  const { isSubmitting } = form.formState;
  const watchedIngredients = form.watch("ingredients");
  const watchedImage = form.watch("image");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (watchedImage instanceof File) {
      const url = URL.createObjectURL(watchedImage);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof watchedImage === "string" && watchedImage) {
      if (watchedImage.startsWith("/assets/")) {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";
        setPreviewUrl(`${baseUrl}${watchedImage}`);
      } else {
        setPreviewUrl(watchedImage);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [watchedImage]);

  const handleSubmit = form.handleSubmit(async (values) => {
    console.log("[MealFormDialog] Submitting values:", values);
    const sanitizedIngredients = values.ingredients.map(ing => ({
      ingredient_id: Number(ing.ingredient_id),
      quantity: Number(ing.quantity),
    }));

    const data = {
      name: values.name,
      description: values.description || undefined,
      image: values.image || undefined,
      serving: values.serving,
      cost_per_serving: values.cost_per_serving,
      category_id: values.category_id || undefined,
      ingredients: sanitizedIngredients,
    };

    if (isEdit) {
      await onUpdate({ ...data, id: editTarget!.id });
    } else {
      await onCreate(data);
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Meal" : "Register Meal"}</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Chicken Fried Rice" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Textarea placeholder="Meal description…" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Image <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {previewUrl && (
                          <div className="relative group aspect-video w-full max-w-[240px] overflow-hidden rounded-lg border-2 border-muted bg-muted shadow-sm">
                            <img
                              src={previewUrl}
                              alt="Meal preview"
                              className="h-full w-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => onChange(undefined)}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div
                          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
                            isDragging
                              ? "border-primary bg-primary/10"
                              : "border-muted-foreground/25 hover:bg-muted/50 hover:border-muted-foreground/50"
                          } ${previewUrl ? "opacity-50 pointer-events-none hidden" : ""}`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) onChange(file);
                          }}
                        >
                          <UploadCloudIcon className="mb-2 h-8 w-8 text-muted-foreground/80" />
                          <div className="mb-2 text-sm text-center">
                            <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                          </div>
                          <p className="text-xs text-muted-foreground">
                            SVG, PNG, JPG or WEBP
                          </p>
                          <Input
                            type="file"
                            accept="image/*"
                            {...field}
                            className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onChange(file);
                            }}
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="serving"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serving <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost_per_serving"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Serving <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          step="any"
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                      <Select
                        value={toSelectString(field.value)}
                        onValueChange={(val) => field.onChange(fromSelectString(val))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Ingredients</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddIngOpen(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="rounded-md border overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-muted-foreground/20 overscroll-contain"
                onWheel={(e) => e.stopPropagation()}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient Name</TableHead>
                      <TableHead className="w-24">Unit</TableHead>
                      <TableHead className="w-32">Quantity</TableHead>
                      <TableHead className="w-20 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                          No ingredients added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fields.map((field, index) => {
                        const ingredient = ingredients.find(i => String(i.id) === String(watchedIngredients[index]?.ingredient_id));
                        return (
                          <TableRow key={field.id}>
                            <TableCell className="font-medium">
                              <input
                                type="hidden"
                                {...form.register(`ingredients.${index}.ingredient_id`, { valueAsNumber: true })}
                              />
                              {ingredient?.name || "Unknown"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {ingredient?.unit || "—"}
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`ingredients.${index}.quantity`}
                                render={({ field: qtyField }) => (
                                  <Input
                                    type="number"
                                    className="h-8"
                                    {...qtyField}
                                    step="any"
                                    value={qtyField.value === 0 ? "" : qtyField.value}
                                    onChange={(e) => qtyField.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="h-8 w-8 text-destructive"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {form.formState.errors.ingredients && (
                <p className="text-sm font-medium text-destructive mt-2">
                  {form.formState.errors.ingredients.message}
                </p>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Update" : "Create"} Meal
            </Button>
          </DialogFooter>
        </form>
      </Form>

      <AddIngredientDialog
        open={isAddIngOpen}
        onOpenChange={setIsAddIngOpen}
        ingredients={ingredients}
        existingIngredientIds={watchedIngredients.map(ing => ing.ingredient_id)}
        onAdd={(newItem) => {
          append(newItem);
          setIsAddIngOpen(false);
        }}
      />
    </>
  );
}

// ─── Sub-Component for the Ingredient Pop-up ───────────────────────────────
interface AddIngProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: Ingredient[];
  existingIngredientIds: number[];
  onAdd: (data: { ingredient_id: number; quantity: number }) => void;
}

function AddIngredientDialog({ open: dialogOpen, onOpenChange, ingredients, existingIngredientIds, onAdd }: AddIngProps) {
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [qty, setQty] = React.useState<number>(1);
  const [openPopover, setOpenPopover] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Filter based on existing ingredients AND search term
  const selectableIngredients = React.useMemo(() => {
    return ingredients.filter((ing) => {
      if (existingIngredientIds.includes(ing.id)) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return ing.name.toLowerCase().includes(term);
    });
  }, [ingredients, existingIngredientIds, searchTerm]);

  const selectedIngredient = ingredients.find((ing) => String(ing.id) === String(selectedId));

  const handleConfirm = () => {
    if (!selectedId) return;
    onAdd({ ingredient_id: Number(selectedId), quantity: qty });
    setSelectedId("");
    setQty(1);
    setSearchTerm("");
    setOpenPopover(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Ingredient</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2 text-left">
            <label className="text-sm font-medium">Select Ingredient</label>
            <Popover open={openPopover} onOpenChange={setOpenPopover}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    placeholder="Search ingredient..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (!openPopover) setOpenPopover(true);
                      if (selectedId) setSelectedId(""); // clear selection if typing new search
                    }}
                    onClick={() => {
                      if (!openPopover) setOpenPopover(true);
                    }}
                    className="pr-10"
                  />
                  <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50" />
                </div>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[var(--radix-popover-trigger-width)] p-0" 
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()} // dont autofocus internal search
              >
                <Command>
                  <CommandList 
                    className="max-h-[240px] overflow-y-auto overscroll-contain"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <CommandEmpty>No matching ingredients found.</CommandEmpty>
                    <CommandGroup>
                      {selectableIngredients.map((ing) => (
                        <CommandItem
                          key={ing.id}
                          value={ing.name}
                          onSelect={() => {
                            setSelectedId(String(ing.id));
                            setSearchTerm(ing.name);
                            setOpenPopover(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedId === String(ing.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{ing.name}</span>
                            <span className="text-[10px] text-primary/60 font-semibold uppercase tracking-wider -mt-0.5">
                              {ing.unit || "—"}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Quantity</label>
              {selectedIngredient && (
                <span className="text-[10px] font-semibold text-primary/80 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                  {selectedIngredient.unit || "—"}
                </span>
              )}
            </div>
            <Input
              type="number"
              min={0.01}
              step="any"
              value={qty === 0 ? "" : qty}
              onChange={(e) => setQty(e.target.value === "" ? 0 : Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selectedId || qty <= 0}>Add to List</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}