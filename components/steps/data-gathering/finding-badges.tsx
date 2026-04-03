import { MapPin, Shield, Bug, Leaf, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'
import { SOURCE_COLORS, SITE_TYPE_COLORS, EPA_SITE_TYPE_CONFIG } from '@/lib/config/finding-colors'

interface FindingBadgesProps {
  finding: FindingDisplay
}

export function FindingBadges({ finding }: FindingBadgesProps) {
  const isEpaFinding = finding.source === 'epa'
  const isFpoFinding = finding.source === 'fpo'
  const epaConfig = finding.metadata?.siteType
    ? EPA_SITE_TYPE_CONFIG[finding.metadata.siteType]
    : null

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {isFpoFinding ? (
        <Badge
          variant="secondary"
          className="h-5 gap-1 bg-rose-100 px-1.5 text-[10px] text-rose-700"
        >
          <Leaf className="h-2.5 w-2.5" />
          FPO Protected
        </Badge>
      ) : isEpaFinding && epaConfig ? (
        <Badge variant="secondary" className={`h-5 px-1.5 text-[10px] ${epaConfig.color}`}>
          {epaConfig.label}
        </Badge>
      ) : finding.dataType === 'designated_site' && finding.metadata?.siteType ? (
        <Badge
          variant="secondary"
          className={`h-5 px-1.5 text-[10px] ${SITE_TYPE_COLORS[finding.metadata.siteType] || SOURCE_COLORS[finding.source] || ''}`}
        >
          {finding.metadata.siteType}
        </Badge>
      ) : finding.metadata?.nbdcEnriched ? (
        <Badge
          variant="secondary"
          className="h-5 gap-1 bg-linear-to-r from-purple-100 to-blue-100 px-1.5 text-[10px] text-purple-700"
        >
          <Sparkles className="h-2.5 w-2.5 text-amber-500" />
          GBIF+NBDC
        </Badge>
      ) : (
        <Badge
          variant="secondary"
          className={`h-5 px-1.5 text-[10px] ${SOURCE_COLORS[finding.source] || ''}`}
        >
          {finding.source.toUpperCase()}
        </Badge>
      )}
      {isEpaFinding && finding.metadata?.designation && (
        <Badge
          variant="outline"
          className={`h-5 px-1.5 text-[10px] ${
            finding.metadata.designation === 'Good' || finding.metadata.designation === 'High'
              ? 'border-green-300 bg-green-50 text-green-700'
              : finding.metadata.designation === 'Moderate'
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : finding.metadata.designation === 'Poor' || finding.metadata.designation === 'Bad'
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : ''
          }`}
        >
          {finding.metadata.designation}
        </Badge>
      )}
      {finding.metadata?.distance !== undefined && (
        <Badge variant="outline" className="h-5 gap-0.5 px-1.5 text-[10px]">
          <MapPin className="h-2.5 w-2.5" />
          {finding.metadata.distance === 0 ? 'Within' : `${finding.metadata.distance.toFixed(1)}km`}
        </Badge>
      )}
      {finding.metadata?.isProtected && (
        <span title="Protected species">
          <Shield className="h-3.5 w-3.5 text-red-500" />
        </span>
      )}
      {finding.metadata?.isInvasive && (
        <span title="Invasive species">
          <Bug className="h-3.5 w-3.5 text-orange-500" />
        </span>
      )}
      {finding.metadata?.redListStatus && (
        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
          {finding.metadata.redListStatus}
        </Badge>
      )}
    </div>
  )
}
