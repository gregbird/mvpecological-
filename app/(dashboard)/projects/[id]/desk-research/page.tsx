'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Map, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SearchInterface } from '@/components/desk-research/search-interface'
import { ProjectMap } from '@/components/maps/project-map'
import type { DeskResearchFinding } from '@/components/desk-research/finding-card'

// Mock project data - will be fetched from Supabase
const mockProject = {
  id: '1',
  name: 'Ballymore Wind Farm EcIA',
  site_code: 'BWF-2024-001',
  grid_reference: 'N 23456 12345',
  center: { lat: 53.45, lng: -7.85 } as { lat: number; lng: number },
  boundary: {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [-7.87, 53.44],
          [-7.83, 53.44],
          [-7.83, 53.46],
          [-7.87, 53.46],
          [-7.87, 53.44],
        ],
      ],
    },
  },
}

export default function DeskResearchPage() {
  const params = useParams()
  const projectId = params.id as string

  const [savedFindings, setSavedFindings] = React.useState<DeskResearchFinding[]>([])
  const [selectedFinding, setSelectedFinding] = React.useState<DeskResearchFinding | null>(null)
  const [showMap, setShowMap] = React.useState(true)

  // Handle saving a finding
  const handleSaveFinding = (finding: DeskResearchFinding) => {
    if (finding.isSaved) {
      // Already saved, toggle off
      setSavedFindings((prev) => prev.filter((f) => f.id !== finding.id))
    } else {
      // Save it
      setSavedFindings((prev) => [...prev, { ...finding, isSaved: true }])
    }
  }

  // Handle removing a finding
  const handleRemoveFinding = (finding: DeskResearchFinding) => {
    setSavedFindings((prev) => prev.filter((f) => f.id !== finding.id))
  }

  // Handle viewing a finding on the map
  const handleViewOnMap = (finding: DeskResearchFinding) => {
    setSelectedFinding(finding)
    setShowMap(true)
    // TODO: Center map on finding location
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Desk Research</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-muted-foreground">{mockProject.name}</span>
              <Badge variant="outline">{mockProject.site_code}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showMap ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMap(!showMap)}
          >
            <Map className="mr-2 h-4 w-4" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </Button>
          <Button variant="outline" size="sm" disabled={savedFindings.length === 0}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`grid gap-6 ${showMap ? 'lg:grid-cols-2' : ''}`}>
        {/* Search Interface */}
        <div>
          <SearchInterface
            projectId={projectId}
            projectBoundary={mockProject.boundary}
            projectCenter={mockProject.center}
            gridReference={mockProject.grid_reference}
            searchRadius={2}
            onFindingSave={handleSaveFinding}
            onFindingRemove={handleRemoveFinding}
            onViewOnMap={handleViewOnMap}
            savedFindings={savedFindings}
          />
        </div>

        {/* Map */}
        {showMap && (
          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Project Area</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectMap
                className="h-[500px]"
                center={[mockProject.center.lng, mockProject.center.lat]}
                zoom={12}
                boundary={mockProject.boundary}
              />
              {selectedFinding && (
                <div className="bg-muted mt-3 rounded-lg p-3">
                  <p className="text-sm font-medium">{selectedFinding.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {selectedFinding.metadata?.siteCode || selectedFinding.metadata?.scientificName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary */}
      {savedFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Research Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">
                  {savedFindings.filter((f) => f.dataType === 'designated_site').length}
                </p>
                <p className="text-muted-foreground text-sm">Designated Sites</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">
                  {savedFindings.filter((f) => f.dataType === 'species_record').length}
                </p>
                <p className="text-muted-foreground text-sm">Species Records</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">
                  {savedFindings.filter((f) => f.metadata?.isProtected).length}
                </p>
                <p className="text-muted-foreground text-sm">Protected Species</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
