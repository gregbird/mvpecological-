'use client'

import * as React from 'react'
import { Loader2, AlertCircle, CheckCircle2, Database } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface QGISConnectionProps {
  onImport: (boundary: GeoJSON.Feature<GeoJSON.Polygon>) => void
  onCancel: () => void
}

interface ConnectionStatus {
  connected: boolean
  tables: { name: string; geometryColumn: string; srid: number }[]
}

export function QGISConnection({ onImport, onCancel }: QGISConnectionProps) {
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus | null>(null)

  // Connection form state
  const [host, setHost] = React.useState('localhost')
  const [port, setPort] = React.useState('5432')
  const [database, setDatabase] = React.useState('')
  const [schema, setSchema] = React.useState('public')
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')

  // Selection state
  const [selectedTable, setSelectedTable] = React.useState('')
  const [selectedFeature, setSelectedFeature] = React.useState('')

  const handleTestConnection = async () => {
    if (!database || !username) {
      setError('Please enter database name and username')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // In production, this would make an API call to test the PostGIS connection
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock successful connection with available tables
      setConnectionStatus({
        connected: true,
        tables: [
          { name: 'project_boundaries', geometryColumn: 'geom', srid: 2157 },
          { name: 'site_areas', geometryColumn: 'geometry', srid: 2157 },
          { name: 'survey_zones', geometryColumn: 'the_geom', srid: 4326 },
        ],
      })
    } catch (err) {
      setError('Failed to connect to database. Please check your credentials.')
      setConnectionStatus(null)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleImport = async () => {
    if (!selectedTable || !selectedFeature) {
      setError('Please select a table and feature')
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      // In production, this would fetch from PostGIS
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockBoundary: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        properties: {
          name: 'Imported from QGIS/PostGIS',
          source: 'postgis',
          table: selectedTable,
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
      setError('Failed to import boundary from database')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection Form */}
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="localhost"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="5432"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="database">Database Name</Label>
            <Input
              id="database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="gis_database"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schema">Schema</Label>
            <Input
              id="schema"
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              placeholder="public"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="postgres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <Button
          onClick={handleTestConnection}
          disabled={isConnecting || !database || !username}
          variant="secondary"
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Test Connection
            </>
          )}
        </Button>
      </div>

      {/* Connection Status */}
      {connectionStatus?.connected && (
        <div className="space-y-4">
          <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-400">
              Connected successfully! Found {connectionStatus.tables.length} spatial tables.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="table-select">Select Table</Label>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger id="table-select">
                <SelectValue placeholder="Choose a spatial table..." />
              </SelectTrigger>
              <SelectContent>
                {connectionStatus.tables.map((table) => (
                  <SelectItem key={table.name} value={table.name}>
                    {table.name} ({table.geometryColumn}, SRID: {table.srid})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTable && (
            <div className="space-y-2">
              <Label htmlFor="feature-select">Select Feature</Label>
              <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                <SelectTrigger id="feature-select">
                  <SelectValue placeholder="Choose a feature..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Feature 1 - Site Alpha</SelectItem>
                  <SelectItem value="2">Feature 2 - Site Beta</SelectItem>
                  <SelectItem value="3">Feature 3 - Site Gamma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isConnecting || isImporting}>
          Cancel
        </Button>
        {connectionStatus?.connected && (
          <Button
            onClick={handleImport}
            disabled={isImporting || !selectedTable || !selectedFeature}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Boundary'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
