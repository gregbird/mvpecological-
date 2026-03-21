'use client'

import * as React from 'react'
import { Info, Layers, MapPin, TreePine } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getHabitatByCode } from '@/lib/data/fossitt-codes'
import type { DeskResearchFinding } from '@/types/database'

export interface HabitatRow {
  fossittCode: string
  fossittName: string
  color: string
  nlcLabel: string
  areaHa: number
  percentage: number
}

interface HabitatInventorySectionProps {
  findings: DeskResearchFinding[]
  onHabitatData?: (habitats: HabitatRow[]) => void
}

function SummaryCards({ habitats, totalArea }: { habitats: HabitatRow[]; totalArea: number }) {
  const cards = [
    {
      label: 'Habitat Types',
      value: habitats.length.toString(),
      color:
        'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-200',
      iconColor: 'text-emerald-500',
      icon: Layers,
    },
    {
      label: 'Total Area',
      value: `${totalArea.toFixed(0)} ha`,
      color:
        'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-200',
      iconColor: 'text-green-500',
      icon: MapPin,
    },
    {
      label: 'Data Source',
      value: 'NLC 2018',
      color:
        'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-200',
      iconColor: 'text-blue-500',
      icon: TreePine,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className={`border ${c.color}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <c.icon className={`h-5 w-5 shrink-0 ${c.iconColor}`} />
            <div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium">{c.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function HabitatInventorySection({ findings, onHabitatData }: HabitatInventorySectionProps) {
  const habitatFindings = React.useMemo(
    () => findings.filter((f) => f.data_type === 'habitat'),
    [findings]
  )

  const { habitats, totalArea } = React.useMemo(() => {
    if (habitatFindings.length === 0) return { habitats: [], totalArea: 0 }

    const total = habitatFindings.reduce((sum, f) => {
      const raw = f.raw_data as Record<string, unknown> | null
      return sum + (Number(raw?.areaHectares) || 0)
    }, 0)

    const rows: HabitatRow[] = habitatFindings
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        const fossittCode = String(raw?.fossittCode ?? '—')
        const fossittName = String(raw?.fossittName ?? f.title)
        const nlcLabel = String(raw?.nlcLabel ?? '')
        const areaHa = Number(raw?.areaHectares) || 0
        const habitat = getHabitatByCode(fossittCode)

        return {
          fossittCode,
          fossittName,
          color: habitat?.color || '#22c55e',
          nlcLabel,
          areaHa,
          percentage: total > 0 ? (areaHa / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.areaHa - a.areaHa)

    return { habitats: rows, totalArea: total }
  }, [habitatFindings])

  // Notify parent (used for export)
  const onHabitatDataRef = React.useRef(onHabitatData)
  onHabitatDataRef.current = onHabitatData
  React.useEffect(() => {
    if (habitats.length > 0) {
      onHabitatDataRef.current?.(habitats)
    }
  }, [habitats])

  if (habitats.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <TreePine className="h-12 w-12 text-gray-300" />
          <div className="text-center">
            <h4 className="font-semibold">No Habitat Data Available</h4>
            <p className="text-muted-foreground mt-1 text-sm">
              Save habitat findings in Data Gathering (Step 2) to see them here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards habitats={habitats} totalArea={totalArea} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5 text-emerald-600" />
            Preliminary Habitat Types
            <Badge variant="secondary" className="ml-auto">
              {habitats.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">FOSSITT Code</TableHead>
                  <TableHead className="w-[180px]">Habitat Name</TableHead>
                  <TableHead className="w-[200px]">NLC Label</TableHead>
                  <TableHead className="w-[100px] text-right">Area (ha)</TableHead>
                  <TableHead className="w-[80px] text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {habitats.map((h, idx) => (
                  <TableRow key={`${h.fossittCode}-${idx}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: h.color }}
                        />
                        <span className="font-mono text-sm font-medium">{h.fossittCode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{h.fossittName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{h.nlcLabel}</TableCell>
                    <TableCell className="text-right">{h.areaHa.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{h.percentage.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted/50 flex items-start gap-2 rounded-lg border px-4 py-3">
        <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-muted-foreground text-xs">
          Based on National Land Cover 2018 (NLC). This is a preliminary desktop assessment —
          habitat types require field verification using FOSSITT Level 3 classification.
        </p>
      </div>
    </div>
  )
}
