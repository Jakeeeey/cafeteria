"use client";

import * as React from "react";
import { PencilIcon } from "lucide-react";

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
}

export default function IngredientTable({
  ingredients,
  isLoading,
  onEdit,
}: IngredientTableProps) {
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
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Unit Count</TableHead>
            <TableHead className="hidden lg:table-cell text-right">Cost per Unit</TableHead>
            <TableHead className="hidden lg:table-cell">Supplier</TableHead>
            <TableHead className="w-16 text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 10 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : ingredients.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
                className="h-32 text-center text-muted-foreground"
              >
                No ingredients registered yet.
              </TableCell>
            </TableRow>
          ) : (
            ingredients.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell className="text-center text-muted-foreground text-sm">
                  {index + 1}
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
                <TableCell className="hidden lg:table-cell text-right tabular-nums">₱
                  {Number(row.cost_per_unit ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {row.supplier_name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit ingredient"
                    onClick={() => onEdit(row)}
                  >
                    <PencilIcon className="size-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
