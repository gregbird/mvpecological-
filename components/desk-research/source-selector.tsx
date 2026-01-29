"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FindingSource } from "./finding-card";

export interface DataSource {
  id: FindingSource;
  name: string;
  description: string;
  types: string[];
  status: "available" | "partial" | "unavailable";
}

const DATA_SOURCES: DataSource[] = [
  {
    id: "npws",
    name: "NPWS",
    description: "Designated sites (SAC, SPA, NHA, pNHA)",
    types: ["designated_site"],
    status: "available",
  },
  {
    id: "gbif",
    name: "GBIF",
    description: "Global species occurrence records",
    types: ["species_record"],
    status: "available",
  },
  {
    id: "nbdc",
    name: "NBDC",
    description: "Irish species records & protected species",
    types: ["species_record"],
    status: "available",
  },
  {
    id: "epa",
    name: "EPA",
    description: "Water quality & environmental data",
    types: ["water_quality"],
    status: "partial",
  },
  {
    id: "catchments",
    name: "Catchments.ie",
    description: "River catchment information",
    types: ["catchment"],
    status: "partial",
  },
];

interface SourceSelectorProps {
  selectedSources: FindingSource[];
  onSourcesChange: (sources: FindingSource[]) => void;
  disabled?: boolean;
}

export function SourceSelector({
  selectedSources,
  onSourcesChange,
  disabled = false,
}: SourceSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const toggleSource = (sourceId: FindingSource) => {
    if (selectedSources.includes(sourceId)) {
      onSourcesChange(selectedSources.filter((s) => s !== sourceId));
    } else {
      onSourcesChange([...selectedSources, sourceId]);
    }
  };

  const selectAll = () => {
    const availableSources = DATA_SOURCES.filter(
      (s) => s.status !== "unavailable"
    ).map((s) => s.id);
    onSourcesChange(availableSources);
  };

  const clearAll = () => {
    onSourcesChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px]"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedSources.length === 0
              ? "Select sources..."
              : `${selectedSources.length} source${selectedSources.length > 1 ? "s" : ""} selected`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search sources..." />
          <CommandList>
            <CommandEmpty>No sources found.</CommandEmpty>
            <CommandGroup>
              <div className="flex items-center justify-between px-2 py-1.5 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={clearAll}
                >
                  Clear
                </Button>
              </div>
              {DATA_SOURCES.map((source) => (
                <CommandItem
                  key={source.id}
                  value={source.id}
                  onSelect={() => toggleSource(source.id)}
                  disabled={source.status === "unavailable"}
                  className="flex items-start gap-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 mt-0.5",
                      selectedSources.includes(source.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{source.name}</span>
                      {source.status === "partial" && (
                        <Badge variant="secondary" className="text-xs">
                          Partial
                        </Badge>
                      )}
                      {source.status === "unavailable" && (
                        <Badge variant="outline" className="text-xs">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {source.description}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Get available data sources
 */
export function getAvailableSources(): DataSource[] {
  return DATA_SOURCES.filter((s) => s.status !== "unavailable");
}

/**
 * Get source display info
 */
export function getSourceInfo(sourceId: FindingSource): DataSource | undefined {
  return DATA_SOURCES.find((s) => s.id === sourceId);
}
