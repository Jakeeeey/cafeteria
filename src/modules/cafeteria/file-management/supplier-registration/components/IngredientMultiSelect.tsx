"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

import type { IngredientOption } from "../types";

interface IngredientMultiSelectProps {
  options: IngredientOption[];
  value: number[];
  onValueChange: (value: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function IngredientMultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select ingredients…",
  disabled = false,
  className,
}: IngredientMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => new Set(value), [value]);

  const labelMap = React.useMemo(() => {
    return new Map(options.map((o) => [o.id, o.name] as const));
  }, [options]);

  const selectedLabels = React.useMemo(() => {
    if (value.length === 0) return [] as string[];
    return value.map((id) => labelMap.get(id)).filter(Boolean) as string[];
  }, [labelMap, value]);

  const triggerLabel = React.useMemo(() => {
    if (value.length === 0) return placeholder;
    const first = selectedLabels[0];
    if (!first) return `${value.length} selected`;
    return value.length === 1 ? first : `${first} +${value.length - 1}`;
  }, [placeholder, selectedLabels, value.length]);

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onValueChange(Array.from(next));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select ingredients"
            className={cn(
              "w-full justify-between",
              value.length === 0 && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search ingredients…" />
            <div
              className="max-h-[280px] overflow-y-auto overscroll-contain"
              onWheelCapture={(e) => e.stopPropagation()}
            >
              <CommandList className="max-h-none overflow-visible">
                <CommandEmpty>No ingredients found.</CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => {
                    const isSelected = selected.has(opt.id);
                    return (
                      <CommandItem
                        key={opt.id}
                        value={opt.name}
                        onSelect={() => toggle(opt.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {opt.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.slice(0, 12).map((id) => (
            <Badge key={id} variant="secondary" className="font-normal">
              {labelMap.get(id) ?? String(id)}
            </Badge>
          ))}
          {selectedLabels.length > 12 && (
            <Badge variant="secondary" className="font-normal">
              +{selectedLabels.length - 12} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
