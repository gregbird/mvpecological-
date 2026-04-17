'use client'

import * as React from 'react'
import { Check, Minus, Leaf, Trees, MapPin, Shield, ChevronDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { EvidenceEntity } from '@/hooks/steps/use-evidence-matrix'

/**
 * Sortable, filterable matrix of cross-source entities. Structure on purpose
 * mirrors a traditional evidence-review table: one row per entity, one column
 * per data source, each cell shows whether this source has this entity.
 *
 * Three view modes (top-level tabs) carve the same entity list differently:
 *   - Overlaps: entities confirmed in ≥2 source kinds (the "agreeing evidence")
 *   - Gaps:    entities in official data but NOT in company reports (where
 *              follow-up is likely needed)
 *   - All:     the full dataset, no filter
 *
 * Entity type is a secondary filter via chip buttons so a user can focus on,
 * say, species without losing the gaps/overlaps grouping.
 */

type ViewMode = 'overlaps' | 'gaps' | 'all'
type EntityType = EvidenceEntity['type']

const SOURCE_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'npws', label: 'NPWS' },
  { key: 'nbdc', label: 'NBDC' },
  { key: 'gbif', label: 'GBIF' },
  { key: 'epa', label: 'EPA' },
  { key: 'catchments', label: 'Catchments' },
  { key: 'manual', label: 'Manual' },
  { key: 'company_reports', label: 'Reports' },
]

const TYPE_META: Record<EntityType, { label: string; icon: React.ReactNode; color: string }> = {
  species: {
    label: 'Species',
    icon: <Leaf className="h-3.5 w-3.5" />,
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  habitat: {
    label: 'Habitat',
    icon: <Trees className="h-3.5 w-3.5" />,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  site: {
    label: 'Site',
    icon: <MapPin className="h-3.5 w-3.5" />,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  },
  designation: {
    label: 'Designation',
    icon: <Shield className="h-3.5 w-3.5" />,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  },
}

interface EvidenceTableProps {
  entities: EvidenceEntity[]
}

export function EvidenceTable({ entities }: EvidenceTableProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('overlaps')
  const [typeFilter, setTypeFilter] = React.useState<Set<EntityType>>(new Set())
  const [expandedKey, setExpandedKey] = React.useState<string | null>(null)

  const counts = React.useMemo(
    () => ({
      overlaps: entities.filter((e) => e.overlapCount > 1).length,
      gaps: entities.filter((e) => e.isGap).length,
      all: entities.length,
    }),
    [entities]
  )

  const typeCounts = React.useMemo(() => {
    const map: Record<EntityType, number> = {
      species: 0,
      habitat: 0,
      site: 0,
      designation: 0,
    }
    for (const e of entities) map[e.type] += 1
    return map
  }, [entities])

  const filtered = React.useMemo(() => {
    let list = entities
    if (viewMode === 'overlaps') list = list.filter((e) => e.overlapCount > 1)
    else if (viewMode === 'gaps') list = list.filter((e) => e.isGap)
    if (typeFilter.size > 0) list = list.filter((e) => typeFilter.has(e.type))
    return list
  }, [entities, viewMode, typeFilter])

  const toggleType = (type: EntityType) => {
    setTypeFilter((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="overlaps">
            Overlaps{' '}
            <Badge variant="secondary" className="ml-2">
              {counts.overlaps}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="gaps">
            Gaps{' '}
            <Badge variant="secondary" className="ml-2">
              {counts.gaps}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all">
            All{' '}
            <Badge variant="secondary" className="ml-2">
              {counts.all}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={viewMode} className="mt-4 space-y-3">
          {/* Type filter chips */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_META) as EntityType[]).map((type) => {
              const meta = TYPE_META[type]
              const active = typeFilter.has(type)
              return (
                <Button
                  key={type}
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => toggleType(type)}
                >
                  {meta.icon}
                  {meta.label}
                  <span className="text-muted-foreground text-xs">({typeCounts[type]})</span>
                </Button>
              )
            })}
            {typeFilter.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setTypeFilter(new Set())}>
                Clear filter
              </Button>
            )}
          </div>

          {/* Matrix table */}
          <div className="border-border overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[320px]">Entity</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  {SOURCE_COLUMNS.map((col) => (
                    <TableHead key={col.key} className="text-center text-xs">
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-[80px] text-center">Overlap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3 + SOURCE_COLUMNS.length}
                      className="text-muted-foreground py-8 text-center text-sm"
                    >
                      {viewMode === 'overlaps' && 'No entities with overlapping sources yet.'}
                      {viewMode === 'gaps' &&
                        'No gaps detected — every official entity is referenced in a report.'}
                      {viewMode === 'all' && 'No entities have been extracted yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((entity) => {
                    const key = `${entity.type}:${entity.canonical}`
                    const typeMeta = TYPE_META[entity.type]
                    const isExpanded = expandedKey === key
                    return (
                      <React.Fragment key={key}>
                        <TableRow
                          className="hover:bg-muted/40 cursor-pointer"
                          onClick={() => setExpandedKey(isExpanded ? null : key)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <ChevronDown
                                className={`text-muted-foreground h-3.5 w-3.5 transition-transform ${
                                  isExpanded ? '' : '-rotate-90'
                                }`}
                              />
                              <span>{entity.displayName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`gap-1 ${typeMeta.color}`}>
                              {typeMeta.icon}
                              {typeMeta.label}
                            </Badge>
                          </TableCell>
                          {SOURCE_COLUMNS.map((col) => {
                            const count = entity.sources.filter((s) => s.kind === col.key).length
                            return (
                              <TableCell key={col.key} className="text-center">
                                {count > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                    <Check className="h-4 w-4" />
                                    {count > 1 && <span className="text-xs">{count}</span>}
                                  </span>
                                ) : (
                                  <Minus className="text-muted-foreground/40 mx-auto h-4 w-4" />
                                )}
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-center font-medium">
                            {entity.overlapCount}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={3 + SOURCE_COLUMNS.length} className="py-3">
                              <div className="space-y-2 text-sm">
                                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                  Sources ({entity.sources.length})
                                </p>
                                <ul className="space-y-1.5">
                                  {entity.sources.map((source, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <Badge variant="outline" className="text-[10px] uppercase">
                                        {source.kind}
                                      </Badge>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-foreground truncate font-medium">
                                          {source.label}
                                          {source.page != null && (
                                            <span className="text-muted-foreground ml-1 text-xs font-normal">
                                              (p.{source.page})
                                            </span>
                                          )}
                                        </p>
                                        {source.snippet && (
                                          <p className="text-muted-foreground line-clamp-2 text-xs">
                                            “{source.snippet}”
                                          </p>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
