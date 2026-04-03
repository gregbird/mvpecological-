'use client'

import {
  ExternalLink,
  FileText,
  Loader2,
  Shield,
  Sparkles,
  Leaf,
  Bug,
  Globe,
  AlertTriangle,
} from 'lucide-react'
import { MarkdownContent } from '@/components/desk-research/deep-research-shell'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SpeciesResearchData } from '../species-research-modal'

// ---- Overview Tab ----

interface OverviewTabProps {
  species: SpeciesResearchData
}

export function SpeciesOverviewTab({ species }: OverviewTabProps) {
  const hasFPO = species.fpoRecords && species.fpoRecords.length > 0
  const hasArticle17 = species.article17Species && species.article17Species.length > 0

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {species.recordCount != null && species.recordCount > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{species.recordCount}</div>
              <p className="text-muted-foreground text-xs">Records in area</p>
            </CardContent>
          </Card>
        )}
        {species.totalIrishRecords != null && species.totalIrishRecords > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {species.totalIrishRecords.toLocaleString()}
              </div>
              <p className="text-muted-foreground text-xs">Irish records</p>
            </CardContent>
          </Card>
        )}
        {species.gridSquares10km != null && species.gridSquares10km > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-emerald-600">{species.gridSquares10km}</div>
              <p className="text-muted-foreground text-xs">10km grid squares</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Designations */}
      {species.designations && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Designations</p>
                <p className="mt-1 text-xs text-red-700">{species.designations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FPO Records */}
      {hasFPO && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Leaf className="h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-medium text-rose-800">Flora Protection Order 2022</p>
                <p className="mt-1 text-xs text-rose-700">
                  {species.fpoRecords!.length} FPO record
                  {species.fpoRecords!.length > 1 ? 's' : ''} in project area
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Article 17 */}
      {hasArticle17 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Habitats Directive (Article 17)
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-amber-700">
                  {species.article17Species!.map((sp) => (
                    <div key={sp.code}>
                      {sp.commonName
                        ? `${sp.commonName} (${sp.scientificName})`
                        : sp.scientificName}{' '}
                      — {sp.gridCount} grid squares
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Protection Note */}
      {species.isProtected && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">Ecological Assessment Note</p>
                <p className="mt-1 text-xs text-amber-700">
                  This species is legally protected. Development proposals that may affect this
                  species or its habitat should include appropriate ecological survey and mitigation
                  measures.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {species.isInvasive && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Bug className="h-5 w-5 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Invasive Species</p>
                <p className="mt-1 text-xs text-orange-700">
                  This species is classified as invasive. An Invasive Species Management Plan may be
                  required under the European Communities (Birds and Natural Habitats) Regulations
                  2011.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// ---- AI Analysis Tab ----

interface AiAnalysisTabProps {
  species: SpeciesResearchData
  aiSummary: string
  aiLoading: boolean
  aiError: string | null
  onFetchAnalysis: () => void
}

export function SpeciesAiAnalysisTab({
  species,
  aiSummary,
  aiLoading,
  aiError,
  onFetchAnalysis,
}: AiAnalysisTabProps) {
  const hasFPO = species.fpoRecords && species.fpoRecords.length > 0
  const hasArticle17 = species.article17Species && species.article17Species.length > 0
  const hasRelatedSites = species.relatedSites && species.relatedSites.length > 0

  return (
    <>
      {aiSummary ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-purple-600" />
              AI Ecological Analysis
              {hasFPO && (
                <Badge variant="outline" className="text-[10px]">
                  FPO enriched
                </Badge>
              )}
              {hasArticle17 && (
                <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-700">
                  Article 17
                </Badge>
              )}
              {hasRelatedSites && (
                <Badge
                  variant="outline"
                  className="border-emerald-300 text-[10px] text-emerald-700"
                >
                  {species.relatedSites!.length} sites
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownContent text={aiSummary} />
          </CardContent>
        </Card>
      ) : aiError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {aiError}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={onFetchAnalysis}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : aiLoading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-purple-400" />
            <p className="text-sm font-medium">Generating Ecological Analysis...</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Analysing species data, protection status, and designated site connections.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-purple-300" />
            <p className="text-sm font-medium">AI-Powered Species Analysis</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Generates a detailed ecological report including protection status, habitat
              requirements, survey recommendations, and development implications.
            </p>
            <Button
              className="mt-4 bg-purple-600 hover:bg-purple-700"
              size="sm"
              onClick={onFetchAnalysis}
              disabled={aiLoading}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data sources info */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="pt-3 pb-3">
          <p className="text-muted-foreground text-[10px] font-medium">Data Sources:</p>
          <ul className="text-muted-foreground mt-1 space-y-0.5 text-[10px]">
            <li>
              {species.source === 'gbif'
                ? '✓ GBIF occurrence records'
                : species.source === 'nbdc'
                  ? '✓ NBDC species records'
                  : species.source === 'fpo'
                    ? '✓ Flora Protection Order 2022'
                    : species.source === 'article17'
                      ? '✓ Article 17 Habitats Directive'
                      : `○ Source: ${species.source || 'unknown'}`}
            </li>
            <li>{hasFPO ? '✓ FPO 2022 protection records' : '○ FPO 2022 data'}</li>
            <li>
              {hasArticle17
                ? '✓ Article 17 Annex species distribution'
                : '○ Article 17 species data'}
            </li>
            <li>
              {hasRelatedSites
                ? `✓ ${species.relatedSites!.length} related SAC/SPA sites`
                : '○ Related designated sites'}
            </li>
          </ul>
        </CardContent>
      </Card>
    </>
  )
}

// ---- Related Sites Tab ----

interface RelatedSitesTabProps {
  species: SpeciesResearchData
}

export function SpeciesRelatedSitesTab({ species }: RelatedSitesTabProps) {
  const hasRelatedSites = species.relatedSites && species.relatedSites.length > 0

  return (
    <>
      <p className="text-muted-foreground text-sm">
        SAC/SPA sites where this species is listed as a Qualifying Interest.
      </p>

      {hasRelatedSites ? (
        <div className="space-y-2">
          {species.relatedSites!.map((site, i) => (
            <Card key={`${site.siteCode}-${i}`}>
              <CardContent className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`h-5 shrink-0 px-1.5 text-[10px] ${
                          site.siteType === 'SAC'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {site.siteType}
                      </Badge>
                      <span className="truncate text-sm font-medium">{site.siteName}</span>
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs">{site.siteCode}</div>
                  </div>
                  <a
                    href={`https://www.npws.ie/protected-sites/${site.siteType.toLowerCase()}/${site.siteCode.replace('IE', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 shrink-0 text-xs text-blue-600 hover:underline"
                  >
                    NPWS <ExternalLink className="inline h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4 text-center">
            <Globe className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">
              No designated sites found with this species as a Qualifying Interest.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// ---- Resources Tab ----

interface ResourcesTabProps {
  species: SpeciesResearchData
}

export function SpeciesResourcesTab({ species }: ResourcesTabProps) {
  const hasFPO = species.fpoRecords && species.fpoRecords.length > 0
  const hasArticle17 = species.article17Species && species.article17Species.length > 0

  return (
    <>
      <p className="text-muted-foreground text-sm">
        External resources and references for this species:
      </p>

      {species.gbifUrl && (
        <a href={species.gbifUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Globe className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">GBIF Species Page</p>
                    <p className="text-muted-foreground text-xs">
                      Global Biodiversity Information Facility
                    </p>
                  </div>
                </div>
                <ExternalLink className="text-muted-foreground h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </a>
      )}

      {species.nbdcUrl && (
        <a href={species.nbdcUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">NBDC Species Page</p>
                    <p className="text-muted-foreground text-xs">
                      National Biodiversity Data Centre
                    </p>
                  </div>
                </div>
                <ExternalLink className="text-muted-foreground h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </a>
      )}

      {species.source === 'fpo' && (
        <a
          href="https://www.npws.ie/legislation/irish-law/flora-protection-order"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="hover:bg-muted/50 cursor-pointer border-rose-200 transition-colors">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-rose-100 p-2">
                    <Leaf className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Flora Protection Order 2022</p>
                    <p className="text-muted-foreground text-xs">
                      NPWS Protected Flora Legislation
                    </p>
                  </div>
                </div>
                <ExternalLink className="text-muted-foreground h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </a>
      )}

      {/* NPWS search */}
      <a
        href={`https://www.npws.ie/search?query=${encodeURIComponent(species.scientificName)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">NPWS Search</p>
                  <p className="text-muted-foreground text-xs">National Parks & Wildlife Service</p>
                </div>
              </div>
              <ExternalLink className="text-muted-foreground h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </a>

      {/* Article 17 report */}
      {hasArticle17 && (
        <a
          href="https://www.npws.ie/publications/article-17-reports"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Article 17 Reports</p>
                    <p className="text-muted-foreground text-xs">
                      National conservation status assessments
                    </p>
                  </div>
                </div>
                <ExternalLink className="text-muted-foreground h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </a>
      )}
    </>
  )
}
