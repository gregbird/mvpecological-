'use client'

import * as React from 'react'
import { Loader2, Link, List, AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ArcGISConnectionProps {
  onImport: (boundary: GeoJSON.Feature<GeoJSON.Polygon>) => void
  onCancel: () => void
}

// Mock data for demo purposes - in production, this would come from ArcGIS API
const mockLayers = [
  { id: '1', name: 'Project Boundaries 2024', featureCount: 12 },
  { id: '2', name: 'Site Assessment Areas', featureCount: 8 },
  { id: '3', name: 'Conservation Zones', featureCount: 24 },
]

export function ArcGISConnection({ onImport, onCancel }: ArcGISConnectionProps) {
  const [activeTab, setActiveTab] = React.useState('list')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // List mode state
  const [selectedLayer, setSelectedLayer] = React.useState<string>('')
  const [selectedFeature, setSelectedFeature] = React.useState<string>('')

  // URL mode state
  const [serviceUrl, setServiceUrl] = React.useState('')

  const handleListImport = async () => {
    if (!selectedLayer || !selectedFeature) {
      setError('Please select a layer and feature')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // In production, this would fetch from ArcGIS API
      // For demo, we'll create a mock boundary
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockBoundary: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        properties: {
          name: 'Imported from ArcGIS',
          source: 'arcgis',
          layerId: selectedLayer,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-9.5, 53.27],
              [-9.4, 53.27],
              [-9.4, 53.35],
              [-9.5, 53.35],
              [-9.5, 53.27],
            ],
          ],
        },
      }

      onImport(mockBoundary)
    } catch (err) {
      setError('Failed to import from ArcGIS. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUrlImport = async () => {
    if (!serviceUrl) {
      setError('Please enter a valid ArcGIS REST API URL')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Validate URL format
      const url = new URL(serviceUrl)
      if (!url.pathname.includes('MapServer') && !url.pathname.includes('FeatureServer')) {
        throw new Error('URL should point to a MapServer or FeatureServer endpoint')
      }

      // In production, this would fetch from the provided URL
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockBoundary: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        properties: {
          name: 'Imported from URL',
          source: 'arcgis-url',
          serviceUrl,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-9.5, 53.27],
              [-9.4, 53.27],
              [-9.4, 53.35],
              [-9.5, 53.35],
              [-9.5, 53.27],
            ],
          ],
        },
      }

      onImport(mockBoundary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch from URL')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Select from List
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Direct URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="layer-select">Select Layer</Label>
            <Select value={selectedLayer} onValueChange={setSelectedLayer}>
              <SelectTrigger id="layer-select">
                <SelectValue placeholder="Choose a layer..." />
              </SelectTrigger>
              <SelectContent>
                {mockLayers.map((layer) => (
                  <SelectItem key={layer.id} value={layer.id}>
                    {layer.name} ({layer.featureCount} features)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLayer && (
            <div className="space-y-2">
              <Label htmlFor="feature-select">Select Feature</Label>
              <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                <SelectTrigger id="feature-select">
                  <SelectValue placeholder="Choose a feature..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Feature 1 - Killarney Site A</SelectItem>
                  <SelectItem value="2">Feature 2 - Killarney Site B</SelectItem>
                  <SelectItem value="3">Feature 3 - Killarney Site C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleListImport}
              disabled={isLoading || !selectedLayer || !selectedFeature}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Boundary'
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-url">ArcGIS REST Service URL</Label>
            <Input
              id="service-url"
              placeholder="https://services.arcgis.com/.../MapServer/0"
              value={serviceUrl}
              onChange={(e) => setServiceUrl(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Enter the URL of an ArcGIS MapServer or FeatureServer layer
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs">
              <strong>Example URLs:</strong>
              <br />
              • https://services.arcgis.com/org/arcgis/rest/services/Boundaries/MapServer/0
              <br />• https://gis.npws.ie/arcgis/rest/services/DesignatedSites/SAC/MapServer
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleUrlImport} disabled={isLoading || !serviceUrl}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch & Import'
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
