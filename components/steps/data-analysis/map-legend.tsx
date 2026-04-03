'use client'

import * as React from 'react'
import { Loader2, Layers, Sparkles, ChevronDown, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DATASET_GROUPS, getGroupColorClasses } from '@/lib/config/dataset-layers'

/** Legend item display */
export interface LegendEntry {
  id: string
  label: string
  color: string
  type: 'line' | 'fill' | 'circle'
}

export interface OverlayOption {
  id: string
  label: string
  color: string
}

interface MapLegendProps {
  overlayOptions: OverlayOption[]
  visibleOverlays: Set<string>
  onToggleOverlay: (id: string) => void
  legendEntries: LegendEntry[]
  deselectedLegendIds: Set<string>
  onToggleLegendItem: (id: string) => void
  displayedLegendEntries: LegendEntry[]
  aiLegend: string | null
  isGeneratingLegend: boolean
  onGenerateAiLegend: () => void
}

export function MapLegend({
  overlayOptions,
  visibleOverlays,
  onToggleOverlay,
  legendEntries,
  deselectedLegendIds,
  onToggleLegendItem,
  displayedLegendEntries,
  aiLegend,
  isGeneratingLegend,
  onGenerateAiLegend,
}: MapLegendProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['overlays'])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId]
    )
  }

  return (
    <>
      {/* Layer Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4" />
            Map Layers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 pt-0">
          {/* Data Overlays */}
          <Collapsible
            open={expandedGroups.includes('overlays')}
            onOpenChange={() => toggleGroup('overlays')}
          >
            <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-sm font-medium">
              {expandedGroups.includes('overlays') ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Project Data
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-2 pl-5">
              {overlayOptions.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: opt.color }} />
                    <span className="text-xs">{opt.label}</span>
                  </div>
                  <Switch
                    checked={visibleOverlays.has(opt.id)}
                    onCheckedChange={() => onToggleOverlay(opt.id)}
                    className="scale-75"
                  />
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* NPWS / EPA layer groups from dataset config */}
          {DATASET_GROUPS.slice(0, 2).map((group) => {
            const colors = getGroupColorClasses(group.id)
            const isExpanded = expandedGroups.includes(group.id)
            return (
              <Collapsible
                key={group.id}
                open={isExpanded}
                onOpenChange={() => toggleGroup(group.id)}
              >
                <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-sm font-medium">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <span className={cn(colors.text)}>{group.label}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-2 pl-5">
                  {group.layers.map((layer) => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-2"
                      title={layer.description}
                    >
                      <div
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-xs">{layer.label}</span>
                    </div>
                  ))}
                  <p className="text-muted-foreground text-[10px]">
                    Toggle in GIS Mapping step (Step 1)
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </CardContent>
      </Card>

      {/* Legend with selection */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Legend</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onGenerateAiLegend}
              disabled={isGeneratingLegend || displayedLegendEntries.length === 0}
            >
              {isGeneratingLegend ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              AI Legend
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {legendEntries.length === 0 ? (
            <p className="text-muted-foreground text-xs">No layers visible</p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-1.5">
                {legendEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`legend-${entry.id}`}
                      checked={!deselectedLegendIds.has(entry.id)}
                      onCheckedChange={() => onToggleLegendItem(entry.id)}
                      className="h-3.5 w-3.5"
                    />
                    {entry.type === 'line' ? (
                      <div className="h-0.5 w-4" style={{ backgroundColor: entry.color }} />
                    ) : entry.type === 'fill' ? (
                      <div
                        className="h-3 w-4 rounded-sm border"
                        style={{
                          backgroundColor: entry.color + '33',
                          borderColor: entry.color,
                        }}
                      />
                    ) : (
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                    )}
                    <label
                      htmlFor={`legend-${entry.id}`}
                      className={cn(
                        'cursor-pointer text-xs',
                        deselectedLegendIds.has(entry.id) && 'text-muted-foreground line-through'
                      )}
                    >
                      {entry.label}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* AI-generated legend description */}
          {aiLegend && (
            <div className="bg-muted/50 mt-3 rounded-md border p-2">
              <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase">
                AI Description
              </p>
              <p className="text-xs leading-relaxed">{aiLegend}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
