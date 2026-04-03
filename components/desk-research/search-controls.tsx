'use client'

import * as React from 'react'
import { Search, Loader2, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SourceSelector } from './source-selector'
import type { FindingSource } from './finding-card'

interface SearchControlsProps {
  selectedSources: FindingSource[]
  onSourcesChange: (sources: FindingSource[]) => void
  isSearching: boolean
  customGridRef: string
  onCustomGridRefChange: (value: string) => void
  calculatedGridRef: string | null
  customRadius: number
  onCustomRadiusChange: (value: number) => void
  hasProjectBoundary: boolean
  onSearch: () => void
}

export function SearchControls({
  selectedSources,
  onSourcesChange,
  isSearching,
  customGridRef,
  onCustomGridRefChange,
  calculatedGridRef,
  customRadius,
  onCustomRadiusChange,
  hasProjectBoundary,
  onSearch,
}: SearchControlsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Search Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Sources */}
        <div className="space-y-2">
          <Label>Data Sources</Label>
          <SourceSelector
            selectedSources={selectedSources}
            onSourcesChange={onSourcesChange}
            disabled={isSearching}
          />
        </div>

        {/* Search Area */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gridRef">Grid Reference</Label>
            <div className="flex gap-2">
              <Input
                id="gridRef"
                placeholder={calculatedGridRef || 'e.g., N 1234 5678'}
                value={customGridRef}
                onChange={(e) => onCustomGridRefChange(e.target.value)}
                disabled={isSearching}
              />
              {calculatedGridRef && !customGridRef && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onCustomGridRefChange(calculatedGridRef)}
                  title="Use calculated grid reference"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="radius">Search Radius (km)</Label>
            <Input
              id="radius"
              type="number"
              min={0.5}
              max={15}
              step={0.5}
              value={customRadius}
              onChange={(e) => onCustomRadiusChange(parseFloat(e.target.value) || 2)}
              disabled={isSearching}
            />
          </div>
        </div>

        {/* Search status */}
        {hasProjectBoundary && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            <span>Searching within project boundary + {customRadius}km buffer</span>
          </div>
        )}

        <Separator />

        {/* Search Button */}
        <Button
          onClick={onSearch}
          disabled={isSearching || selectedSources.length === 0}
          className="w-full"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Search Selected Sources
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
