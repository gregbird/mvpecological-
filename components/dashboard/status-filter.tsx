"use client";

import * as React from "react";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FilterState = {
  status: ("draft" | "active" | "completed" | "archived")[];
  phase: ("desk_research" | "field_research" | "reporting")[];
  health: ("on_track" | "at_risk" | "overdue")[];
};

interface StatusFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const statusOptions = [
  { value: "draft" as const, label: "Draft" },
  { value: "active" as const, label: "Active" },
  { value: "completed" as const, label: "Completed" },
  { value: "archived" as const, label: "Archived" },
];

const phaseOptions = [
  { value: "desk_research" as const, label: "Desk Research" },
  { value: "field_research" as const, label: "Field Research" },
  { value: "reporting" as const, label: "Reporting" },
];

const healthOptions = [
  { value: "on_track" as const, label: "On Track", color: "bg-green-500" },
  { value: "at_risk" as const, label: "At Risk", color: "bg-amber-500" },
  { value: "overdue" as const, label: "Overdue", color: "bg-red-500" },
];

export function StatusFilter({ filters, onFiltersChange }: StatusFilterProps) {
  const activeFilterCount =
    filters.status.length + filters.phase.length + filters.health.length;

  const toggleStatus = (status: FilterState["status"][number]) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const togglePhase = (phase: FilterState["phase"][number]) => {
    const newPhase = filters.phase.includes(phase)
      ? filters.phase.filter((p) => p !== phase)
      : [...filters.phase, phase];
    onFiltersChange({ ...filters, phase: newPhase });
  };

  const toggleHealth = (health: FilterState["health"][number]) => {
    const newHealth = filters.health.includes(health)
      ? filters.health.filter((h) => h !== health)
      : [...filters.health, health];
    onFiltersChange({ ...filters, health: newHealth });
  };

  const clearFilters = () => {
    onFiltersChange({ status: [], phase: [], health: [] });
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {statusOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.status.includes(option.value)}
              onCheckedChange={() => toggleStatus(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Phase</DropdownMenuLabel>
          {phaseOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.phase.includes(option.value)}
              onCheckedChange={() => togglePhase(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Health</DropdownMenuLabel>
          {healthOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.health.includes(option.value)}
              onCheckedChange={() => toggleHealth(option.value)}
            >
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${option.color}`} />
                {option.label}
              </div>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
