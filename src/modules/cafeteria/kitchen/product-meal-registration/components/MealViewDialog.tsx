"use client";

import * as React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  UtensilsIcon, 
  InfoIcon, 
  ClipboardListIcon, 
  UsersIcon, 
  CircleDollarSignIcon 
} from "lucide-react";
import type { MealWithIngredients } from "../types";

interface MealViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: MealWithIngredients | null;
}

export default function MealViewDialog({ open, onOpenChange, meal }: MealViewDialogProps) {
  if (!meal) return null;

  const imageUrl = meal.image?.startsWith('/assets/')
    ? `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')}${meal.image}`
    : meal.image;

  // Sum of all ingredient (cost_per_unit * quantity) values
  const totalIngredientCost = (meal.ingredients ?? []).reduce((sum, ing) => {
    const qty = Number(ing.quantity) || 0;
    const unitCost = Number(ing.ingredient?.cost_per_unit) || 0;
    return sum + (qty * unitCost);
  }, 0);

  // Total cost = servings × cost per serving
  const totalCost = Number(meal.serving ?? 0) * Number(meal.cost_per_serving ?? 0);

  // Net = Total Cost - Total Ingredient Cost
  const netAmount = totalCost - totalIngredientCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <UtensilsIcon className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Meal Details</span>
          </div>
          <DialogTitle className="text-3xl font-bold tracking-tight">{meal.name}</DialogTitle>
          <div className="flex items-center gap-2 mt-3">
            {meal.category ? (
              <Badge 
                variant="secondary" 
                className="px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
              >
                {meal.category.name}
              </Badge>
            ) : (
              <Badge variant="outline" className="px-3 py-1 text-xs font-medium text-muted-foreground italic">
                Uncategorized
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 px-6 pb-6 overflow-hidden min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Left Column: Image and Description */}
            <div className="space-y-6 overflow-y-auto pr-2 pb-4 h-full">
              {meal.image ? (
                <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted shadow-sm">
                  <img
                    src={imageUrl}
                    alt={meal.name}
                    className="h-full w-full object-cover transition-transform hover:scale-105 duration-500"
                  />
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center rounded-xl border bg-muted/50">
                  <UtensilsIcon className="size-12 text-muted-foreground/20" />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <InfoIcon className="size-4 text-primary" />
                  Description
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap p-4 rounded-xl border bg-muted/20 shadow-sm">
                  {meal.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl border bg-card shadow-sm flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">
                    <UsersIcon className="size-3.5" />
                    Servings
                  </div>
                  <div className="text-lg font-bold text-foreground">{meal.serving}</div>
                </div>
                <div className="p-3 rounded-xl border bg-card shadow-sm flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">
                    <CircleDollarSignIcon className="size-3.5 text-muted-foreground" />
                    Cost/Serving
                  </div>
                  <div className="text-lg font-bold text-foreground">
                    ₱{Number(meal.cost_per_serving).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Ingredients */}
            <div className="flex flex-col space-y-4 overflow-hidden h-full pb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground shrink-0 mt-4 lg:mt-0">
                <ClipboardListIcon className="size-4 text-primary" />
                Ingredients Used
              </div>
              
              <div className="rounded-xl border shadow-sm overflow-x-hidden overflow-y-auto flex-1 bg-card w-full">
                <Table className="w-full">
                  <TableHeader className="bg-muted/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Ingredient Name</TableHead>
                      <TableHead className="w-24 sm:w-32 whitespace-nowrap">Unit</TableHead>
                      <TableHead className="w-20 sm:w-24 text-right whitespace-nowrap">Quantity</TableHead>
                      <TableHead className="w-24 sm:w-32 text-right whitespace-nowrap">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meal.ingredients && meal.ingredients.length > 0 ? (
                      <>
                        {meal.ingredients.map((ing, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium text-sm whitespace-nowrap max-w-[150px] truncate" title={ing.ingredient?.name || "Unknown"}>
                              {ing.ingredient?.name || "Unknown"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                              {ing.ingredient?.unit || "Piece(s)"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-sm whitespace-nowrap">
                              {Number(ing.quantity).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-sm whitespace-nowrap">
                              ₱{(Number(ing.ingredient?.cost_per_unit ?? 0) * Number(ing.quantity ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total ingredient cost row */}
                        <TableRow className="bg-muted/50 border-t-2">
                          <TableCell className="text-[11px] sm:text-xs text-muted-foreground italic py-3">
                            {meal.ingredients.length} ingredient{meal.ingredients.length > 1 ? 's' : ''} total
                          </TableCell>
                          <TableCell colSpan={2} className="text-sm font-semibold text-right text-foreground py-3 whitespace-nowrap">
                            Total Ingredient Cost
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-foreground py-3 whitespace-nowrap">
                            ₱{totalIngredientCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>

                        {/* Total Cost row */}
                        <TableRow className="bg-green-500/10 dark:bg-green-500/20">
                          <TableCell className="text-[11px] sm:text-xs text-muted-foreground italic py-3 break-words min-w-[120px]">
                            ({meal.serving} serv. × ₱{Number(meal.cost_per_serving).toFixed(2)})
                          </TableCell>
                          <TableCell colSpan={2} className="text-sm font-semibold text-right text-green-700 dark:text-green-400 py-3 whitespace-nowrap">
                            Total Projected Revenue
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-green-700 dark:text-green-400 py-3 whitespace-nowrap">
                            ₱{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>

                        {/* Net Cost row */}
                        <TableRow className={netAmount >= 0 ? "bg-blue-500/10 dark:bg-blue-500/20" : "bg-red-500/10 dark:bg-red-500/20"}>
                          <TableCell className="text-[11px] sm:text-xs text-muted-foreground italic py-3 break-words min-w-[120px]">
                            (Proj. Revenue − Ing. Cost)
                          </TableCell>
                          <TableCell colSpan={2} className={`text-sm font-semibold text-right py-3 whitespace-nowrap ${netAmount >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"}`}>
                            Net Income
                          </TableCell>
                          <TableCell className={`text-right font-mono font-bold text-sm py-3 whitespace-nowrap ${netAmount >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"}`}>
                            ₱{netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                          No ingredients listed.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>


            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
