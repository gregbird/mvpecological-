'use client'

import * as React from 'react'
import { ChevronDown, Layers, Eye, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DATASET_GROUPS,
  getGroupColorClasses,
  type DatasetLayer,
} from '@/lib/config/dataset-layers'

interface DatasetLayersPanelProps {
  visibleLayers: string[]
  onLayerToggle: (layerId: string, visible: boolean) => void
  onGroupToggle?: (groupId: string, visible: boolean) => void
  className?: string
}

export function DatasetLayersPanel({
  visibleLayers,
  onLayerToggle,
  onGroupToggle,
  className,
}: DatasetLayersPanelProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['npws'])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  const isGroupPartiallyVisible = (layers: DatasetLayer[]) => {
    const visibleCount = layers.filter((l) => visibleLayers.includes(l.id)).length
    return visibleCount > 0 && visibleCount < layers.length
  }

  const isGroupFullyVisible = (layers: DatasetLayer[]) => {
    return layers.every((l) => visibleLayers.includes(l.id))
  }

  const handleGroupToggle = (groupId: string, layers: DatasetLayer[]) => {
    const allVisible = isGroupFullyVisible(layers)
    if (onGroupToggle) {
      onGroupToggle(groupId, !allVisible)
    } else {
      // Toggle all layers in the group
      layers.forEach((layer) => {
        onLayerToggle(layer.id, !allVisible)
      })
    }
  }

  return (
    <div className={cn('border-border bg-card rounded-lg border', className)}>
      <div className="border-border flex items-center gap-2 border-b px-4 py-3">
        <Layers className="text-muted-foreground h-4 w-4" />
        <h3 className="text-foreground text-sm font-semibold">Dataset Layers</h3>
      </div>

      <ScrollArea className="h-80">
        <div className="p-2">
          {DATASET_GROUPS.map((group) => {
            const isExpanded = expandedGroups.includes(group.id)
            const colorClasses = getGroupColorClasses(group.id)
            const GroupIcon = group.icon
            const groupFullyVisible = isGroupFullyVisible(group.layers)
            const groupPartiallyVisible = isGroupPartiallyVisible(group.layers)

            return (
              <Collapsible
                key={group.id}
                open={isExpanded}
                onOpenChange={() => toggleGroup(group.id)}
                className="mb-1"
              >
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        'flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        'hover:bg-muted text-foreground'
                      )}
                    >
                      <ChevronDown
                        className={cn(
                          'text-muted-foreground h-4 w-4 transition-transform',
                          !isExpanded && '-rotate-90'
                        )}
                      />
                      <GroupIcon className={cn('h-4 w-4', colorClasses.text)} />
                      <span className="flex-1 text-left">{group.label}</span>
                    </button>
                  </CollapsibleTrigger>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleGroupToggle(group.id, group.layers)
                    }}
                    title={groupFullyVisible ? 'Hide all layers' : 'Show all layers'}
                  >
                    {groupFullyVisible ? (
                      <Eye className="h-4 w-4 text-emerald-600" />
                    ) : groupPartiallyVisible ? (
                      <Eye className="text-muted-foreground h-4 w-4" />
                    ) : (
                      <EyeOff className="text-muted-foreground h-4 w-4" />
                    )}
                  </Button>
                </div>

                <CollapsibleContent>
                  <div className="border-border ml-5 space-y-1 border-l-2 py-1 pl-4">
                    {group.layers.map((layer) => {
                      const isVisible = visibleLayers.includes(layer.id)

                      return (
                        <div
                          key={layer.id}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                            isVisible ? colorClasses.bgLight : 'hover:bg-muted'
                          )}
                        >
                          <Switch
                            id={`layer-${layer.id}`}
                            checked={isVisible}
                            onCheckedChange={(checked: boolean) => onLayerToggle(layer.id, checked)}
                            className="shrink-0"
                          />
                          {layer.color && (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: layer.color }}
                            />
                          )}
                          <Label
                            htmlFor={`layer-${layer.id}`}
                            className={cn(
                              'cursor-pointer text-xs leading-tight',
                              isVisible ? colorClasses.text : 'text-muted-foreground'
                            )}
                            title={layer.description}
                          >
                            {layer.label}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </ScrollArea>

      <div className="border-border text-muted-foreground border-t px-4 py-2 text-xs">
        {visibleLayers.length} layer{visibleLayers.length !== 1 ? 's' : ''} active
      </div>
    </div>
  )
}
