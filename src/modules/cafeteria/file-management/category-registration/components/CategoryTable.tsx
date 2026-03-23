"use client";

import * as React from "react";
import { EyeIcon, PencilIcon } from "lucide-react";
import { format, parseISO } from "date-fns";

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

import type { Category } from "../types";

interface CategoryTableProps {
  categories: Category[];
  isLoading: boolean;
  onView: (category: Category) => void;
  onEdit: (category: Category) => void;
  itemsPerPage?: number;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export default function CategoryTable({
  categories,
  isLoading,
  onView,
  onEdit,
  itemsPerPage = 10,
}: CategoryTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.max(1, Math.ceil(categories.length / itemsPerPage));
  const paginated = categories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [categories]);

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-24 text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 4 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : categories.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-32 text-center text-muted-foreground"
              >
                No categories registered yet.
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((row, index) => (
              <TableRow key={row.category_id}>
                <TableCell className="text-center text-muted-foreground text-sm">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </TableCell>
                <TableCell className="font-medium">{row.category_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(row.created_at)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View category"
                      onClick={() => onView(row)}
                    >
                      <EyeIcon className="size-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit category"
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
