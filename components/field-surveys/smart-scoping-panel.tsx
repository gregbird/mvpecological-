'use client'

import * as React from 'react'
import {
  Target,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar,
  Shield,
  Search,
  CheckCircle2,
  Circle,
  Plus,
  Download,
  FileText,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import {
  habitatSpeciesMapping,
  getSpeciesForHabitats,
  calculateSpeciesPriority,
  type SpeciesRecommendation,
} from '@/lib/data/habitat-species-mapping'
import type { DeskResearchFinding } from '@/types/database'

interface SmartScopingPanelProps {
  findings: DeskResearchFinding[]
  habitatCodes?: string[]
  onAddToSurvey?: (species: SpeciesRecommendation) => void
  onGenerateChecklist?: (species: SpeciesRecommendation[]) => void
  className?: string
}

interface EnrichedSpecies extends SpeciesRecommendation {
  gbifRecordCount: number
  distanceToNearestRecord: number
  calculatedPriority: 'high' | 'medium' | 'low'
  habitats: string[]
}

const PRIORITY_CONFIG = {
  high: {
    label: 'High Priority',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    badgeVariant: 'destructive' as const,
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium Priority',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    badgeVariant: 'secondary' as const,
    icon: Circle,
  },
  low: {
    label: 'Low Priority',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    badgeVariant: 'outline' as const,
    icon: Circle,
  },
}

export function SmartScopingPanel({
  findings,
  habitatCodes = [],
  onAddToSurvey,
  onGenerateChecklist,
  className,
}: SmartScopingPanelProps) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [selectedSpecies, setSelectedSpecies] = React.useState<Set<string>>(new Set())
  const [expandedPriority, setExpandedPriority] = React.useState<Record<string, boolean>>({
    high: true,
    medium: false,
    low: false,
  })

  // Extract species records from findings for enrichment
  const speciesRecords = React.useMemo(() => {
    return findings.filter((f) => f.data_type === 'species_record')
  }, [findings])

  // Extract designated sites for context
  const designatedSites = React.useMemo(() => {
    return findings.filter((f) => f.data_type === 'designated_site')
  }, [findings])

  // Extract habitats from deep research if available
  const extractedHabitatCodes = React.useMemo(() => {
    const codes = new Set<string>(habitatCodes)

    // Try to extract habitat codes from designated site deep research
    for (const site of designatedSites) {
      const rawData = site.raw_data as Record<string, unknown> | null
      if (rawData?.deepResearch) {
        const deepResearch = rawData.deepResearch as Record<string, unknown>
        const habitats = deepResearch.habitats as Array<{ habitatCode?: string }> | undefined
        if (habitats) {
          for (const h of habitats) {
            if (h.habitatCode) {
              codes.add(h.habitatCode)
            }
          }
        }
      }
    }

    return Array.from(codes)
  }, [habitatCodes, designatedSites])

  // Get species recommendations and enrich with GBIF data
  const enrichedSpecies = React.useMemo(() => {
    // Get base recommendations from habitat mapping
    const baseSpecies = getSpeciesForHabitats(extractedHabitatCodes)

    // Create a map to track GBIF records by scientific name
    const gbifRecordsBySpecies: Record<string, { count: number; minDistance: number }> = {}

    for (const record of speciesRecords) {
      const rawData = record.raw_data as Record<string, unknown> | null
      const scientificName = (rawData?.scientificName || rawData?.scientific_name) as
        | string
        | undefined
      if (scientificName) {
        const normalizedName = scientificName.toLowerCase()

        if (!gbifRecordsBySpecies[normalizedName]) {
          gbifRecordsBySpecies[normalizedName] = { count: 0, minDistance: Infinity }
        }
        gbifRecordsBySpecies[normalizedName].count++

        const distance = record.distance_from_boundary_km
        if (distance !== null && distance < gbifRecordsBySpecies[normalizedName].minDistance) {
          gbifRecordsBySpecies[normalizedName].minDistance = distance
        }
      }
    }

    // Track which habitats each species is associated with
    const speciesHabitatMap: Record<string, string[]> = {}
    for (const code of extractedHabitatCodes) {
      const mapping = habitatSpeciesMapping[code]
      if (mapping) {
        for (const species of mapping.species) {
          if (!speciesHabitatMap[species.scientificName]) {
            speciesHabitatMap[species.scientificName] = []
          }
          speciesHabitatMap[species.scientificName].push(code)
        }
      }
    }

    // Enrich each species with GBIF data and calculate priority
    const enriched: EnrichedSpecies[] = baseSpecies.map((species) => {
      const normalizedName = species.scientificName.toLowerCase()
      const gbifData = gbifRecordsBySpecies[normalizedName] || { count: 0, minDistance: Infinity }

      const nearDesignatedSite = designatedSites.some((s) => {
        const distance = s.distance_from_boundary_km
        return distance !== null && distance < 5
      })

      // Check if species is a qualifying interest of a nearby SAC
      const isQualifyingInterest = designatedSites.some((s) => {
        const rawData = s.raw_data as Record<string, unknown> | null
        const deepResearch = rawData?.deepResearch as Record<string, unknown> | undefined
        const speciesList = deepResearch?.species as Array<{ scientificName?: string }> | undefined
        return speciesList?.some((sp) =>
          sp.scientificName?.toLowerCase().includes(species.scientificName.toLowerCase())
        )
      })

      const calculatedPriority = calculateSpeciesPriority(
        species,
        gbifData.count,
        gbifData.minDistance === Infinity ? 10 : gbifData.minDistance,
        nearDesignatedSite,
        isQualifyingInterest
      )

      return {
        ...species,
        gbifRecordCount: gbifData.count,
        distanceToNearestRecord: gbifData.minDistance === Infinity ? -1 : gbifData.minDistance,
        calculatedPriority,
        habitats: speciesHabitatMap[species.scientificName] || [],
      }
    })

    // Sort by priority
    return enriched.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.calculatedPriority] - priorityOrder[b.calculatedPriority]
    })
  }, [extractedHabitatCodes, speciesRecords, designatedSites])

  // Group by calculated priority
  const speciesByPriority = React.useMemo(() => {
    const groups: Record<'high' | 'medium' | 'low', EnrichedSpecies[]> = {
      high: [],
      medium: [],
      low: [],
    }

    for (const species of enrichedSpecies) {
      groups[species.calculatedPriority].push(species)
    }

    return groups
  }, [enrichedSpecies])

  // Toggle species selection
  const toggleSpecies = (scientificName: string) => {
    setSelectedSpecies((prev) => {
      const next = new Set(prev)
      if (next.has(scientificName)) {
        next.delete(scientificName)
      } else {
        next.add(scientificName)
      }
      return next
    })
  }

  // Select all in priority group
  const selectAllInGroup = (priority: 'high' | 'medium' | 'low') => {
    setSelectedSpecies((prev) => {
      const next = new Set(prev)
      for (const species of speciesByPriority[priority]) {
        next.add(species.scientificName)
      }
      return next
    })
  }

  // Get selected species objects
  const getSelectedSpecies = (): SpeciesRecommendation[] => {
    return enrichedSpecies.filter((s) => selectedSpecies.has(s.scientificName))
  }

  // Handle generate checklist
  const handleGenerateChecklist = () => {
    const selected = getSelectedSpecies()
    if (selected.length === 0) {
      // Select all high priority by default
      const highPriority = speciesByPriority.high
      onGenerateChecklist?.(highPriority)
    } else {
      onGenerateChecklist?.(selected)
    }
  }

  if (enrichedSpecies.length === 0) {
    return (
      <Card className={cn('border-amber-200 bg-amber-50/50', className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">Smart Scoping</CardTitle>
          </div>
          <CardDescription>
            No habitat data available. Complete GIS Mapping and Data Gathering to get species
            recommendations.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn('border-purple-200 bg-purple-50/50', className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Smart Scoping - Species Survey Targets</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{enrichedSpecies.length} species</Badge>
                <Badge variant="destructive">{speciesByPriority.high.length} high priority</Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
            <CardDescription>
              Based on habitats identified in Desk Research, these species should be targeted during
              field surveys
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Habitat Context */}
            {extractedHabitatCodes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-muted-foreground mr-2 text-sm">Habitats identified:</span>
                {extractedHabitatCodes.map((code) => (
                  <Badge key={code} variant="outline" className="text-xs">
                    {code}
                    {habitatSpeciesMapping[code] && (
                      <span className="text-muted-foreground ml-1">
                        ({habitatSpeciesMapping[code].habitatName})
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            )}

            {/* Priority Groups */}
            <ScrollArea className="max-h-125 pr-4">
              <div className="space-y-4">
                {(['high', 'medium', 'low'] as const).map((priority) => {
                  const config = PRIORITY_CONFIG[priority]
                  const species = speciesByPriority[priority]
                  const Icon = config.icon

                  if (species.length === 0) return null

                  return (
                    <Collapsible
                      key={priority}
                      open={expandedPriority[priority]}
                      onOpenChange={(open) =>
                        setExpandedPriority((prev) => ({ ...prev, [priority]: open }))
                      }
                    >
                      <div className={cn('rounded-lg border', config.bgColor)}>
                        <CollapsibleTrigger className="flex w-full items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <Icon className={cn('h-4 w-4', config.color)} />
                            <span className={cn('font-medium', config.color)}>{config.label}</span>
                            <Badge variant={config.badgeVariant} className="ml-2">
                              {species.length}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                selectAllInGroup(priority)
                              }}
                            >
                              Select All
                            </Button>
                            {expandedPriority[priority] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="space-y-2 p-3 pt-0">
                            {species.map((s) => (
                              <div
                                key={s.scientificName}
                                className={cn(
                                  'rounded-lg border bg-white p-3 transition-colors',
                                  selectedSpecies.has(s.scientificName) &&
                                    'border-purple-400 ring-1 ring-purple-400'
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={selectedSpecies.has(s.scientificName)}
                                    onCheckedChange={() => toggleSpecies(s.scientificName)}
                                    className="mt-1"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-medium">{s.species}</span>
                                      <span className="text-muted-foreground text-sm italic">
                                        ({s.scientificName})
                                      </span>
                                    </div>

                                    <div className="mt-1.5 space-y-1 text-sm">
                                      <div className="flex items-start gap-1.5">
                                        <span className="text-muted-foreground shrink-0">Why:</span>
                                        <span>{s.reason}</span>
                                      </div>

                                      {s.gbifRecordCount > 0 && (
                                        <div className="flex items-center gap-1.5">
                                          <Search className="h-3.5 w-3.5 text-blue-500" />
                                          <span className="text-blue-700">
                                            {s.gbifRecordCount} GBIF record
                                            {s.gbifRecordCount > 1 ? 's' : ''}
                                            {s.distanceToNearestRecord >= 0 && (
                                              <span className="text-muted-foreground">
                                                {' '}
                                                (nearest: {s.distanceToNearestRecord.toFixed(1)}km)
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-1.5">
                                        <FileText className="text-muted-foreground h-3.5 w-3.5" />
                                        <span className="text-muted-foreground">
                                          Survey: {s.surveyType}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                                        <span className="text-muted-foreground">
                                          Best: {s.optimalMonths.slice(0, 4).join(', ')}
                                          {s.optimalMonths.length > 4 && '...'}
                                        </span>
                                      </div>

                                      <div className="mt-1.5 flex flex-wrap gap-1">
                                        {s.protectionStatus.map((status) => (
                                          <Badge
                                            key={status}
                                            variant="outline"
                                            className="text-[10px]"
                                          >
                                            <Shield className="mr-1 h-2.5 w-2.5" />
                                            {status}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {onAddToSurvey && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onAddToSurvey(s)}
                                      className="shrink-0"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )
                })}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-muted-foreground text-sm">
                {selectedSpecies.size > 0 ? (
                  <span>
                    <CheckCircle2 className="mr-1 inline h-4 w-4 text-green-600" />
                    {selectedSpecies.size} species selected
                  </span>
                ) : (
                  <span>Select species for field checklist</span>
                )}
              </div>

              <div className="flex gap-2">
                {onGenerateChecklist && (
                  <Button onClick={handleGenerateChecklist} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Generate Field Checklist
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
