'use client'

import * as React from 'react'
import {
  MapPin,
  ExternalLink,
  BookmarkPlus,
  BookmarkCheck,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type FindingSource =
  | 'npws'
  | 'gbif'
  | 'nbdc'
  | 'epa'
  | 'catchments'
  | 'fpo'
  | 'manual'
  | 'company_reports'
export type FindingType =
  | 'designated_site'
  | 'species_record'
  | 'water_quality'
  | 'catchment'
  | 'company_report'
  | 'other'

export interface DeskResearchFinding {
  id: string
  source: FindingSource
  dataType: FindingType
  title: string
  content?: string
  rawData?: Record<string, unknown>
  location?: GeoJSON.Geometry
  isSaved: boolean
  notes?: string
  sourceUrl?: string
  metadata?: {
    siteCode?: string
    siteType?: string
    scientificName?: string
    commonName?: string
    recordDate?: string
    recordCount?: number
    isProtected?: boolean
    isInvasive?: boolean
    isThreatened?: boolean
    designation?: string
    designations?: string // Full designations string from NBDC
    distance?: number // km from project boundary
    nbdcEnriched?: boolean
    taxonGroup?: string
    totalIrishRecords?: number
  }
}

interface FindingCardProps {
  finding: DeskResearchFinding
  onSave?: (finding: DeskResearchFinding) => void
  onRemove?: (finding: DeskResearchFinding) => void
  onEdit?: (finding: DeskResearchFinding) => void
  onViewOnMap?: (finding: DeskResearchFinding) => void
}

const SOURCE_LABELS: Record<FindingSource, { label: string; color: string }> = {
  npws: {
    label: 'NPWS',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  },
  gbif: { label: 'GBIF', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
  nbdc: {
    label: 'NBDC',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  },
  epa: { label: 'EPA', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100' },
  catchments: {
    label: 'Catchments.ie',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  },
  fpo: {
    label: 'FPO 2022',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100',
  },
  manual: {
    label: 'Manual',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  },
  company_reports: {
    label: 'Company Reports',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100',
  },
}

const TYPE_LABELS: Record<FindingType, string> = {
  designated_site: 'Designated Site',
  species_record: 'Species Record',
  water_quality: 'Water Quality',
  catchment: 'Catchment',
  company_report: 'Company Report',
  other: 'Other',
}

export function FindingCard({ finding, onSave, onRemove, onEdit, onViewOnMap }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const sourceStyle = SOURCE_LABELS[finding.source]

  return (
    <Card className={cn('transition-all', finding.isSaved && 'border-primary/50')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={sourceStyle.color} variant="secondary">
                {sourceStyle.label}
              </Badge>
              <Badge variant="outline">{TYPE_LABELS[finding.dataType]}</Badge>
              {finding.metadata?.isProtected && <Badge variant="destructive">Protected</Badge>}
              {finding.metadata?.distance !== undefined && (
                <span className="text-muted-foreground text-xs">
                  {finding.metadata.distance < 1
                    ? `${Math.round(finding.metadata.distance * 1000)}m away`
                    : `${finding.metadata.distance.toFixed(1)}km away`}
                </span>
              )}
            </div>
            <h3 className="mt-2 line-clamp-2 font-semibold">{finding.title}</h3>
            {finding.metadata?.siteCode && (
              <p className="text-muted-foreground text-sm">
                {finding.metadata.siteCode}
                {finding.metadata.siteType && ` • ${finding.metadata.siteType}`}
              </p>
            )}
            {finding.metadata?.scientificName && (
              <p className="text-muted-foreground text-sm italic">
                {finding.metadata.scientificName}
                {finding.metadata.commonName && ` (${finding.metadata.commonName})`}
              </p>
            )}
          </div>

          {/* Actions */}
          <TooltipProvider>
            <div className="flex items-center gap-1">
              {onViewOnMap && finding.location && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onViewOnMap(finding)}
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View on map</TooltipContent>
                </Tooltip>
              )}

              {onSave && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onSave(finding)}
                    >
                      {finding.isSaved ? (
                        <BookmarkCheck className="text-primary h-4 w-4" />
                      ) : (
                        <BookmarkPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{finding.isSaved ? 'Saved' : 'Save to project'}</TooltipContent>
                </Tooltip>
              )}

              {onEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(finding)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit notes</TooltipContent>
                </Tooltip>
              )}

              {onRemove && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => onRemove(finding)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Summary content */}
        {finding.content && (
          <p className={cn('text-muted-foreground text-sm', !isExpanded && 'line-clamp-2')}>
            {finding.content}
          </p>
        )}

        {/* Metadata details */}
        {finding.metadata && (
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {finding.metadata.recordDate && <span>Date: {finding.metadata.recordDate}</span>}
            {finding.metadata.recordCount && <span>Records: {finding.metadata.recordCount}</span>}
            {finding.metadata.designation && (
              <span>Designation: {finding.metadata.designation}</span>
            )}
          </div>
        )}

        {/* Notes */}
        {finding.notes && (
          <div className="bg-muted/50 mt-3 rounded p-2 text-sm">
            <strong>Notes:</strong> {finding.notes}
          </div>
        )}

        {/* Expand/collapse for raw data */}
        {finding.rawData && Object.keys(finding.rawData).length > 0 && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span>Raw Data</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {isExpanded && (
              <pre className="bg-muted mt-2 max-h-48 overflow-auto rounded p-2 text-xs">
                {JSON.stringify(finding.rawData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Source link */}
        {finding.sourceUrl && (
          <a
            href={finding.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary mt-3 inline-flex items-center gap-1 text-xs hover:underline"
          >
            View source
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  )
}
