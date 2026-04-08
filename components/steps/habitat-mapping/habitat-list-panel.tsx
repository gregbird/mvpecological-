'use client'

import * as React from 'react'
import { Loader2, Shield, TreePine, Fish, Layers, Plus, Eye, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DeskResearchFinding, HabitatPolygon } from '@/types/database'
import type { FindingsByType } from '@/lib/utils/group-findings-by-type'

import { HabitatListItem } from './habitat-list-item'
import { FindingItem } from './finding-item'

interface FindingGroupProps {
  icon: React.ReactNode
  label: string
  findings: DeskResearchFinding[]
  groupKey?: string
  visibleFindingGroups?: Set<string>
  toggleFindingGroup?: (group: string) => void
  onFindingClick?: (finding: DeskResearchFinding) => void
}

function FindingGroup({
  icon,
  label,
  findings,
  groupKey,
  visibleFindingGroups,
  toggleFindingGroup,
  onFindingClick,
}: FindingGroupProps) {
  if (findings.length === 0) return null

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="flex-1 text-sm font-medium">
          {label} ({findings.length})
        </span>
        {groupKey && visibleFindingGroups && toggleFindingGroup && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground rounded p-0.5"
            onClick={() => toggleFindingGroup(groupKey)}
            title={visibleFindingGroups.has(groupKey) ? 'Hide on map' : 'Show on map'}
          >
            {visibleFindingGroups.has(groupKey) ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {findings.map((finding) => (
          <FindingItem
            key={finding.id}
            finding={finding}
            onClick={onFindingClick ? () => onFindingClick(finding) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

interface HabitatListPanelProps {
  projectId: string
  filteredHabitats: HabitatPolygon[]
  savedFindings: DeskResearchFinding[]
  findingsByType: FindingsByType
  findingsLoading: boolean
  selectedHabitat: HabitatPolygon | null
  visibleFindingGroups: Set<string>
  toggleFindingGroup: (group: string) => void
  onSelectHabitat: (habitat: HabitatPolygon) => void
  onEditHabitat: (habitat: HabitatPolygon) => void
  onDeleteHabitat: (habitat: HabitatPolygon) => void
  onAddHabitat: () => void
  onFindingClick: (finding: DeskResearchFinding) => void
}

export function HabitatListPanel({
  projectId,
  filteredHabitats,
  savedFindings,
  findingsByType,
  findingsLoading,
  selectedHabitat,
  visibleFindingGroups,
  toggleFindingGroup,
  onSelectHabitat,
  onEditHabitat,
  onDeleteHabitat,
  onAddHabitat,
  onFindingClick,
}: HabitatListPanelProps) {
  // Persist active tab in sessionStorage
  const tabCacheKey = `habitat-mapping-tab-${projectId}`
  const [activeTab, setActiveTab] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(tabCacheKey)
      if (cached === 'habitats' || cached === 'findings') return cached
    }
    return 'habitats'
  })

  React.useEffect(() => {
    sessionStorage.setItem(tabCacheKey, activeTab)
  }, [activeTab, tabCacheKey])

  return (
    <Card className="flex h-full w-full flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-3 pt-3">
          <TabsList className="grid w-auto shrink-0 grid-cols-2">
            <TabsTrigger value="habitats" className="text-xs">
              Habitats ({filteredHabitats.length})
            </TabsTrigger>
            <TabsTrigger value="findings" className="text-xs">
              Desk Research ({savedFindings.length})
            </TabsTrigger>
          </TabsList>
          <Button size="sm" className="ml-auto shrink-0" onClick={onAddHabitat}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Habitat
          </Button>
        </div>

        {/* Keep both tabs mounted, toggle visibility via CSS */}
        <div className="relative min-h-0 flex-1">
          {/* Mapped Habitats Tab */}
          <div
            className={cn(
              'absolute inset-0',
              activeTab === 'habitats' ? 'visible z-10' : 'invisible z-0'
            )}
          >
            <CardContent className="h-full p-3">
              {filteredHabitats.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
                  No habitats mapped yet. Click &quot;Add Habitat&quot; or draw a polygon on the map
                  below.
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-2 pr-3">
                    {filteredHabitats.map((habitat) => (
                      <HabitatListItem
                        key={habitat.id}
                        habitat={habitat}
                        isSelected={selectedHabitat?.id === habitat.id}
                        onSelect={() => onSelectHabitat(habitat)}
                        onEdit={() => onEditHabitat(habitat)}
                        onDelete={() => onDeleteHabitat(habitat)}
                        disabled={false}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </div>

          {/* Desk Research Findings Tab */}
          <div
            className={cn(
              'absolute inset-0',
              activeTab === 'findings' ? 'visible z-10' : 'invisible z-0'
            )}
          >
            <CardContent className="h-full p-3">
              {findingsLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : savedFindings.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
                  No saved findings from Data Gathering. Complete Step 2 first.
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-4 pr-3">
                    <FindingGroup
                      icon={<Shield className="text-primary h-4 w-4" />}
                      label="Designated Sites"
                      findings={findingsByType.designated_site}
                      groupKey="designated_site"
                      visibleFindingGroups={visibleFindingGroups}
                      toggleFindingGroup={toggleFindingGroup}
                      onFindingClick={onFindingClick}
                    />
                    <FindingGroup
                      icon={<TreePine className="text-primary h-4 w-4" />}
                      label="Species Records"
                      findings={findingsByType.species_record}
                      groupKey="species_record"
                      visibleFindingGroups={visibleFindingGroups}
                      toggleFindingGroup={toggleFindingGroup}
                      onFindingClick={onFindingClick}
                    />
                    <FindingGroup
                      icon={<Fish className="text-primary h-4 w-4" />}
                      label="Aquatic Features"
                      findings={findingsByType.aquatic}
                      groupKey="aquatic"
                      visibleFindingGroups={visibleFindingGroups}
                      toggleFindingGroup={toggleFindingGroup}
                      onFindingClick={onFindingClick}
                    />
                    <FindingGroup
                      icon={<Layers className="text-primary h-4 w-4" />}
                      label="Habitats"
                      findings={findingsByType.habitat}
                    />
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </div>
        </div>
      </Tabs>
    </Card>
  )
}
