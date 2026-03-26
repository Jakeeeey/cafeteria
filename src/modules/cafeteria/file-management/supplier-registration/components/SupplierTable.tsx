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
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

import type { IngredientSupplier } from "../types";

interface SupplierTableProps {
  suppliers: IngredientSupplier[];
  isLoading: boolean;
  onView: (supplier: IngredientSupplier) => void;
  onEdit: (supplier: IngredientSupplier) => void;
  itemsPerPage?: number;
}

function cell(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? v : "—";
}

export default function SupplierTable({
  suppliers,
  isLoading,
  onView,
  onEdit,
  itemsPerPage = 10,
}: SupplierTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.max(1, Math.ceil(suppliers.length / itemsPerPage));
  const paginated = suppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [suppliers]);

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-28">Shortcut</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Barangay</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Province</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Contact Number</TableHead>
            <TableHead className="w-24 text-center">Active</TableHead>
            <TableHead className="w-24 text-center">Actions</TableHead>
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
          ) : suppliers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={11}
                className="h-32 text-center text-muted-foreground"
              >
                No suppliers registered yet.
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((row, index) => (
              <TableRow key={row.id} className="hover:bg-muted/50">
                <TableCell className="text-center text-muted-foreground text-sm">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </TableCell>
                <TableCell className="font-medium max-w-[220px] truncate" title={row.name}>
                  {row.name}
                </TableCell>
                <TableCell className="max-w-[110px] truncate" title={row.short_cut ?? undefined}>
                  {cell(row.short_cut)}
                </TableCell>
                <TableCell className="max-w-[240px] truncate" title={row.address ?? undefined}>
                  {cell(row.address)}
                </TableCell>
                <TableCell className="max-w-[140px] truncate" title={row.brgy ?? undefined}>
                  {cell(row.brgy)}
                </TableCell>
                <TableCell className="max-w-[140px] truncate" title={row.city ?? undefined}>
                  {cell(row.city)}
                </TableCell>
                <TableCell className="max-w-[140px] truncate" title={row.province ?? undefined}>
                  {cell(row.province)}
                </TableCell>
                <TableCell className="max-w-[140px] truncate" title={row.country ?? undefined}>
                  {cell(row.country)}
                </TableCell>
                <TableCell className="max-w-[160px] truncate" title={row.contact_number ?? undefined}>
                  {cell(row.contact_number)}
                </TableCell>
                <TableCell className="text-center">
                  {row.is_active === 1 ? (
                    <StatusBadge tone="success">Active</StatusBadge>
                  ) : (
                    <StatusBadge tone="destructive">Inactive</StatusBadge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View supplier"
                      onClick={() => onView(row)}
                    >
                      <EyeIcon className="size-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit supplier"
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
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
