"use client";

import * as React from "react";
import { PencilIcon, EyeIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import type { MealWithIngredients, Ingredient } from "../types";

interface MealTableProps {
  meals: MealWithIngredients[];
  loading: boolean;
  onEdit: (meal: MealWithIngredients) => void;
  onView: (meal: MealWithIngredients) => void;
  onDelete: (id: number) => void;
  allIngredients?: Ingredient[]; // used as lookup fallback
  itemsPerPage?: number;
}

export default function MealTable({
  meals,
  loading,
  onEdit,
  onView,
  onDelete,
  allIngredients,
  itemsPerPage = 10,
}: MealTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.max(1, Math.ceil(meals.length / itemsPerPage));
  const paginatedMeals = meals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrevious = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // Reset to page 1 when meals list changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [meals]);

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Description</TableHead>
            <TableHead className="hidden md:table-cell">Ingredients</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="w-24 text-right">Serving</TableHead>
            <TableHead className="hidden lg:table-cell w-32 text-right">Cost per Serving</TableHead>
            <TableHead className="w-24 text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : meals.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-32 text-center text-muted-foreground"
              >
                No meals registered yet.
              </TableCell>
            </TableRow>
          ) : (
            paginatedMeals.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell className="w-24 text-center text-muted-foreground text-sm">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    {row.image && (
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                        <img
                          src={row.image.startsWith('/assets/')
                            ? `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')}${row.image}`
                            : row.image
                          }
                          alt={row.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <span className="truncate">{row.name}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground max-w-[180px] truncate">
                  {row.description ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground max-w-[180px] truncate">
                  {row.ingredients && row.ingredients.length > 0
                    ? row.ingredients
                      .map((ing) => {
                        let name = "";
                        let unit = "";
                        const quantity = Number(ing.quantity) || 0;
                        const relIngredient = ing.ingredient;
                        if (relIngredient) {
                          name = relIngredient.name || "";
                          unit = relIngredient.unit || "";
                        } else {
                          // fallback to global list
                          const fallback = allIngredients?.find(
                            (a) => a.id === ing.ingredient_id
                          );
                          if (fallback) {
                            name = fallback.name || "";
                            unit = fallback.unit || "";
                          }
                        }
                        return name ? `${name} x${quantity}` : "";
                      })
                      .filter(Boolean)
                      .join(", ")
                    : "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {row.category ? (
                    <Badge variant="outline">{row.category.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="w-24 text-right tabular-nums">
                  {row.serving}
                </TableCell>
                <TableCell className="hidden lg:table-cell w-32 text-right tabular-nums">
                  ₱{Number(row.cost_per_serving).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View meal"
                      onClick={() => onView(row)}
                      className="text-primary hover:text-primary/80 hover:bg-primary/5 h-8 w-8"
                    >
                      <EyeIcon className="size-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit meal"
                      onClick={() => onEdit(row)}
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                    >
                      <PencilIcon className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  </div>

                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end space-x-2 p-4 border-t">
        <div className="text-sm text-muted-foreground mr-4">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}