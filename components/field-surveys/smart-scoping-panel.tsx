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

  // Extract aquatic features
  const aquaticFeatures = React.useMemo(() => {
    return findings.filter((f) => f.data_type === 'water_quality')
  }, [findings])

  // Extract habitats from multiple sources
  const extractedHabitatCodes = React.useMemo(() => {
    const codes = new Set<string>(habitatCodes)

    // 1. Try to extract habitat codes from designated site deep research
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

      // 2. Infer habitats from site names
      const title = (site.title || '').toLowerCase()
      const siteName = (((rawData?.SITE_NAME || rawData?.siteName) as string) || '').toLowerCase()
      const combinedName = `${title} ${siteName}`

      if (combinedName.includes('bog') || combinedName.includes('peatland')) {
        codes.add('PB1') // Raised Bog
        codes.add('PB2') // Blanket Bog
      }
      if (combinedName.includes('river') || combinedName.includes('stream')) {
        codes.add('FW2') // Depositing Rivers
      }
      if (combinedName.includes('lake') || combinedName.includes('lough')) {
        codes.add('FL3') // Mesotrophic Lakes
      }
      if (combinedName.includes('woodland') || combinedName.includes('forest')) {
        codes.add('WN1') // Oak-Birch-Holly Woodland
        codes.add('WN2') // Oak-Ash-Hazel Woodland
      }
      if (combinedName.includes('fen') || combinedName.includes('marsh')) {
        codes.add('PF1') // Rich Fen
        codes.add('GS4') // Wet Grassland
      }
      if (combinedName.includes('heath')) {
        codes.add('HH1') // Dry Heath
        codes.add('HH3') // Wet Heath
      }
      if (combinedName.includes('dune') || combinedName.includes('coastal')) {
        codes.add('CD2') // Marram Dunes
        codes.add('CM1') // Salt Marsh
      }
    }

    // 3. Add habitats based on aquatic features
    if (aquaticFeatures.length > 0) {
      codes.add('FW2') // Rivers
      codes.add('FW4') // Drainage Ditches
    }

    // 4. Always add common habitats that need checking
    if (codes.size === 0) {
      // If no habitats found, add basic survey habitats
      codes.add('WL1') // Hedgerows - almost always present
      codes.add('GA1') // Improved Grassland - common
    }

    return Array.from(codes)
  }, [habitatCodes, designatedSites, aquaticFeatures])

  // Get species recommendations and enrich with GBIF data
  const enrichedSpecies = React.useMemo(() => {
    // Get base recommendations from habitat mapping
    const baseSpecies = getSpeciesForHabitats(extractedHabitatCodes)

    // Create a map to track species records (from GBIF/NBDC)
    const recordedSpeciesMap: Record<
      string,
      {
        count: number
        minDistance: number
        title: string
        isProtected: boolean
        taxonGroup: string
        designations: string[]
      }
    > = {}

    for (const record of speciesRecords) {
      const rawData = record.raw_data as Record<string, unknown> | null
      const scientificName = (rawData?.scientificName || rawData?.scientific_name) as
        | string
        | undefined
      if (scientificName) {
        const normalizedName = scientificName.toLowerCase()

        if (!recordedSpeciesMap[normalizedName]) {
          recordedSpeciesMap[normalizedName] = {
            count: 0,
            minDistance: Infinity,
            title: record.title || scientificName,
            isProtected: record.is_protected || (rawData?.isProtected as boolean) || false,
            taxonGroup: (rawData?.taxonGroup || rawData?.class || 'Unknown') as string,
            designations: (rawData?.designations as string[]) || [],
          }
        }
        recordedSpeciesMap[normalizedName].count++

        const distance = record.distance_from_boundary_km
        if (distance !== null && distance < recordedSpeciesMap[normalizedName].minDistance) {
          recordedSpeciesMap[normalizedName].minDistance = distance
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

    const nearDesignatedSite = designatedSites.some((s) => {
      const distance = s.distance_from_boundary_km
      return distance !== null && distance < 5
    })

    // Enrich habitat-based species with recorded data
    const enriched: EnrichedSpecies[] = baseSpecies.map((species) => {
      const normalizedName = species.scientificName.toLowerCase()
      const recordData = recordedSpeciesMap[normalizedName]

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
        recordData?.count || 0,
        recordData?.minDistance === Infinity ? 10 : (recordData?.minDistance ?? 10),
        nearDesignatedSite,
        isQualifyingInterest
      )

      return {
        ...species,
        gbifRecordCount: recordData?.count || 0,
        distanceToNearestRecord:
          recordData?.minDistance === Infinity ? -1 : (recordData?.minDistance ?? -1),
        calculatedPriority,
        habitats: speciesHabitatMap[species.scientificName] || [],
      }
    })

    // Add protected species from records that aren't in habitat mapping
    const existingScientificNames = new Set(baseSpecies.map((s) => s.scientificName.toLowerCase()))

    for (const [normalizedName, data] of Object.entries(recordedSpeciesMap)) {
      if (!existingScientificNames.has(normalizedName) && data.isProtected) {
        // This is a protected species from records not covered by habitat mapping
        const surveyType = getSurveyTypeForTaxon(data.taxonGroup)

        enriched.push({
          species: data.title,
          scientificName: normalizedName
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          reason: `${data.count} record(s) found within search area`,
          priority: 'high',
          surveyType,
          optimalMonths: getOptimalMonthsForTaxon(data.taxonGroup),
          protectionStatus:
            data.designations.length > 0 ? data.designations : ['Protected Species'],
          gbifRecordCount: data.count,
          distanceToNearestRecord: data.minDistance === Infinity ? -1 : data.minDistance,
          calculatedPriority: 'high', // Protected species with records = high priority
          habitats: [],
        })
      }
    }

    // Sort by priority
    return enriched.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.calculatedPriority] - priorityOrder[b.calculatedPriority]
    })
  }, [extractedHabitatCodes, speciesRecords, designatedSites])

  // Helper function to get survey type based on taxon group
  function getSurveyTypeForTaxon(taxonGroup: string): string {
    const group = taxonGroup.toLowerCase()
    if (group.includes('bird') || group === 'aves') return 'Bird Survey'
    if (group.includes('mammal') || group === 'mammalia') return 'Mammal Survey'
    if (group.includes('bat') || group.includes('chiroptera')) return 'Bat Survey'
    if (group.includes('amphibian')) return 'Amphibian Survey'
    if (group.includes('reptile')) return 'Reptile Survey'
    if (group.includes('fish')) return 'Fish Survey'
    if (group.includes('insect') || group.includes('invertebrate')) return 'Invertebrate Survey'
    if (group.includes('plant') || group.includes('flora')) return 'Botanical Survey'
    return 'Species Survey'
  }

  // Helper function to get optimal survey months based on taxon
  function getOptimalMonthsForTaxon(taxonGroup: string): string[] {
    const group = taxonGroup.toLowerCase()
    if (group.includes('bird') || group === 'aves') return ['Mar', 'Apr', 'May', 'Jun', 'Jul']
    if (group.includes('bat') || group.includes('chiroptera'))
      return ['May', 'Jun', 'Jul', 'Aug', 'Sep']
    if (group.includes('amphibian')) return ['Mar', 'Apr', 'May', 'Jun']
    if (group.includes('reptile')) return ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
    return ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
  }

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
                        <div className="flex w-full items-center justify-between p-3">
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex flex-1 items-center gap-2 text-left"
                            >
                              <Icon className={cn('h-4 w-4', config.color)} />
                              <span className={cn('font-medium', config.color)}>
                                {config.label}
                              </span>
                              <Badge variant={config.badgeVariant} className="ml-2">
                                {species.length}
                              </Badge>
                              {expandedPriority[priority] ? (
                                <ChevronUp className="ml-auto h-4 w-4" />
                              ) : (
                                <ChevronDown className="ml-auto h-4 w-4" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 text-xs"
                            onClick={() => selectAllInGroup(priority)}
                          >
                            Select All
                          </Button>
                        </div>

                        <CollapsibleContent>
                          <div className="max-h-64 space-y-2 overflow-y-auto p-3 pt-0">
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
