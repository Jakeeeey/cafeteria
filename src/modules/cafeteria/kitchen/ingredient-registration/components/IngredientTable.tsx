"use client";

import * as React from "react";
import { EyeIcon, PencilIcon } from "lucide-react";

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

import type { Ingredient } from "../types";

interface IngredientTableProps {
  ingredients: Ingredient[];
  isLoading: boolean;
  onEdit: (ingredient: Ingredient) => void;
  onView?: (ingredient: Ingredient) => void;
  itemsPerPage?: number;
}

export default function IngredientTable({
  ingredients,
  isLoading,
  onEdit,
  onView,
  itemsPerPage = 10,
}: IngredientTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.max(1, Math.ceil(ingredients.length / itemsPerPage));
  const paginatedIngredients = ingredients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrevious = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // Reset to page 1 when ingredients list changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [ingredients]);

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Description</TableHead>
            <TableHead className="hidden md:table-cell">Brand</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead>Unit of Measurement</TableHead>
            <TableHead className="text-right">Unit</TableHead>
            <TableHead className="text-right">Cost per Unit</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="hidden lg:table-cell text-center">Shelf Life</TableHead>
            <TableHead className="w-24 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 11 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : ingredients.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={11}
                className="h-32 text-center text-muted-foreground"
              >
                No ingredients registered yet.
              </TableCell>
            </TableRow>
          ) : (
            paginatedIngredients.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell className="text-center text-muted-foreground text-sm">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground max-w-[180px] truncate">
                  {row.description ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {row.brand_name ? (
                    <Badge variant="outline">{row.brand_name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {row.category_name ? (
                    <Badge variant="secondary">{row.category_name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {row.unit_abbreviation
                    ? `${row.unit_name} (${row.unit_abbreviation})`
                    : (row.unit_name ?? "—")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {Number(row.unit_count).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4,
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ₱{Number(row.cost_per_unit ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </TableCell>
                <TableCell className="text-center">
                  {row.is_active === 1 ? (
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-center">
                  {row.shelf_life != null ? (
                    `${row.shelf_life} days`
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View details"
                      onClick={() => onView?.(row)}
                    >
                      <EyeIcon className="size-4" />
                      <span className="sr-only">View details</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit ingredient"
                      onClick={() => onEdit(row)}
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
