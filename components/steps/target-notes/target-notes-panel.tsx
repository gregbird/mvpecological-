'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { TargetNoteCard, TARGET_NOTE_CATEGORIES } from '@/components/field-surveys/target-note-card'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'

// Dynamic import for map
const DynamicProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-100 items-center justify-center rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface TargetNotesPanelProps {
  targetNotes: TargetNoteWithCreator[]
  targetNotesByCategory: Record<string, TargetNoteWithCreator[]>
  selectedTargetNote: TargetNoteWithCreator | null
  activeCategoryTab: string
  onCategoryTabChange: (tab: string) => void
  onSelectNote: (note: TargetNoteWithCreator) => void
  onEditNote: (note: TargetNoteWithCreator) => void
  onDeleteNote: (note: TargetNoteWithCreator) => void
  onVerifyNote: (note: TargetNoteWithCreator) => void
  onMapClick: (latlng: { lat: number; lng: number } | undefined) => void
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
}

export function TargetNotesPanel({
  targetNotes,
  targetNotesByCategory,
  selectedTargetNote,
  activeCategoryTab,
  onCategoryTabChange,
  onSelectNote,
  onEditNote,
  onDeleteNote,
  onVerifyNote,
  onMapClick,
  projectBoundary,
  projectCenter,
}: TargetNotesPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Map */}
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="py-3">
          <CardTitle className="text-base">Target Notes Map</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-3 pt-0">
          <div className="h-full min-h-0 overflow-hidden rounded-lg border">
            <DynamicProjectMap
              center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
              zoom={projectCenter ? 14 : 7}
              boundary={projectBoundary}
              targetNotes={targetNotes.map((n) => ({
                id: n.id,
                category: n.category,
                title: n.title,
                description: n.description,
                priority: n.priority,
                isVerified: n.is_verified,
                location: n.location as { coordinates: [number, number] } | null,
              }))}
              selectedTargetNote={
                selectedTargetNote
                  ? {
                      id: selectedTargetNote.id,
                      category: selectedTargetNote.category,
                      title: selectedTargetNote.title,
                      description: selectedTargetNote.description,
                      priority: selectedTargetNote.priority,
                      isVerified: selectedTargetNote.is_verified,
                      location: selectedTargetNote.location as {
                        coordinates: [number, number]
                      } | null,
                    }
                  : null
              }
              onTargetNoteClick={(note) => {
                const found = targetNotes.find((t) => t.id === note.id)
                if (found) onSelectNote(found)
              }}
              onMapClick={(latlng) => {
                if (latlng) {
                  onMapClick(latlng)
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Target Notes List */}
      <Card className="flex h-72 shrink-0 flex-col">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Target Notes</CardTitle>
            <Badge variant="secondary">{targetNotes.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto p-3 pt-0">
          <Tabs
            value={activeCategoryTab}
            onValueChange={onCategoryTabChange}
            className="flex h-full flex-col"
          >
            <TabsList className="flex h-auto flex-wrap gap-1">
              <TabsTrigger value="all" className="text-xs">
                All ({targetNotes.length})
              </TabsTrigger>
              {Object.entries(TARGET_NOTE_CATEGORIES)
                .filter(([key]) => targetNotesByCategory[key]?.length)
                .slice(0, 4)
                .map(([key, config]) => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    {config.label} ({targetNotesByCategory[key]?.length || 0})
                  </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value="all" className="mt-3 min-h-0 flex-1 overflow-auto">
              {targetNotes.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No target notes yet. Click &quot;Add Note&quot; to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  {targetNotes.map((note) => (
                    <TargetNoteCard
                      key={note.id}
                      note={note}
                      isSelected={selectedTargetNote?.id === note.id}
                      onSelect={() => onSelectNote(note)}
                      onEdit={() => onEditNote(note)}
                      onDelete={() => onDeleteNote(note)}
                      onVerify={() => onVerifyNote(note)}
                      compact
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {Object.entries(targetNotesByCategory).map(([category, notes]) => (
              <TabsContent
                key={category}
                value={category}
                className="mt-3 min-h-0 flex-1 overflow-auto"
              >
                <div className="space-y-2">
                  {notes.map((note) => (
                    <TargetNoteCard
                      key={note.id}
                      note={note}
                      isSelected={selectedTargetNote?.id === note.id}
                      onSelect={() => onSelectNote(note)}
                      onEdit={() => onEditNote(note)}
                      onDelete={() => onDeleteNote(note)}
                      onVerify={() => onVerifyNote(note)}
                      compact
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
