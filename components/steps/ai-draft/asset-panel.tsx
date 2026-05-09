'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetPanelScreenshots } from './asset-panel-screenshots'
import { AssetPanelPhotos } from './asset-panel-photos'
import { AssetPanelDataTables } from './asset-panel-data-tables'
import type { Project } from '@/types/database'

interface AssetPanelProps {
  project: Project
}

export function AssetPanel({ project }: AssetPanelProps) {
  return (
    <div className="flex w-56 shrink-0 flex-col border-l pl-3">
      <Tabs defaultValue="data" className="flex min-h-0 flex-1 flex-col">
        {/* TabsList stays pinned at the top while the panel content scrolls */}
        <TabsList className="grid w-full shrink-0 grid-cols-3">
          <TabsTrigger value="data" className="text-xs">
            Data
          </TabsTrigger>
          <TabsTrigger value="maps" className="text-xs">
            Maps
          </TabsTrigger>
          <TabsTrigger value="photos" className="text-xs">
            Photos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="data" className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <AssetPanelDataTables project={project} />
        </TabsContent>
        <TabsContent value="maps" className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <AssetPanelScreenshots projectId={project.id} />
        </TabsContent>
        <TabsContent value="photos" className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <AssetPanelPhotos projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
