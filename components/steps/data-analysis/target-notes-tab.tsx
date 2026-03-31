'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { StickyNote, Eye, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { useToast } from '@/hooks/use-toast'
import { useTargetNotes, useUpdateTargetNote } from '@/hooks/queries/use-target-note-hooks'
import { useProjectObservations } from '@/hooks/queries/use-observation-hooks'
import { TargetNoteEditDialog } from '@/components/steps/data-analysis/target-note-edit-dialog'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import { CreateSummaryButton } from './create-summary-button'
import type { TargetNote, Project } from '@/types/database'

const DynamicProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-72 items-center justify-center rounded-lg">
        <div className="border-primary h-6 w-6 animate-spin rounded-full border-b-2" />
      </div>
    ),
  }
)

interface TargetNotesTabProps {
  projectId: string
  siteId?: string | null
  project: Project
}

const CATEGORY_COLORS: Record<string, string> = {
  access_point: 'bg-blue-100 text-blue-700',
  check_feature: 'bg-amber-100 text-amber-700',
  habitat: 'bg-green-100 text-green-700',
  fauna: 'bg-purple-100 text-purple-700',
  flora: 'bg-pink-100 text-pink-700',
  management: 'bg-cyan-100 text-cyan-700',
  damage: 'bg-red-100 text-red-700',
  ownership: 'bg-orange-100 text-orange-700',
}

export function TargetNotesTab({ projectId, siteId, project }: TargetNotesTabProps) {
  const { toast } = useToast()
  const { data: targetNotes = [] } = useTargetNotes(projectId, siteId)
  const { data: observations = [] } = useProjectObservations(projectId, siteId)
  const updateNote = useUpdateTargetNote()
  const [editingNote, setEditingNote] = React.useState<TargetNote | null>(null)

  const { projectBoundary, projectCenter } = useProjectBoundary(project)

  const targetNoteMarkers = React.useMemo(
    () =>
      targetNotes
        .filter((n) => n.include_in_report)
        .map((n) => ({
          id: n.id,
          category: n.category,
          title: n.title,
          description: n.description,
          priority: n.priority,
          isVerified: n.is_verified,
          location: n.location as { coordinates: [number, number] } | null,
        })),
    [targetNotes]
  )

  const handleToggleInclude = async (note: TargetNote) => {
    try {
      await updateNote.mutateAsync({
        noteId: note.id,
        updates: { include_in_report: !note.include_in_report },
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update report inclusion.',
      })
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* AI Summary */}
      <CreateSummaryButton projectId={projectId} siteId={siteId} tabContext="target-notes" />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <StickyNote className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="text-xl font-bold">{targetNotes.length}</div>
              <div className="text-muted-foreground text-xs">Target Notes</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <div className="text-xl font-bold">{observations.length}</div>
              <div className="text-muted-foreground text-xs">Species Observations</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Notes Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Target Notes Map</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <DynamicProjectMap
            className="h-72"
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
            zoom={projectCenter ? 14 : 7}
            boundary={projectBoundary}
            targetNotes={targetNoteMarkers}
            showControls={false}
          />
        </CardContent>
      </Card>

      {/* Target Notes List */}
      {targetNotes.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Target Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {targetNotes.map((note) => (
                <div
                  key={note.id}
                  className={cn('rounded-lg border p-3', !note.include_in_report && 'opacity-50')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge
                        className={`shrink-0 text-xs ${CATEGORY_COLORS[note.category] || CATEGORY_COLORS.other}`}
                      >
                        {note.category}
                      </Badge>
                      <span className="text-muted-foreground truncate text-xs font-medium">
                        {note.title}
                      </span>
                      {note.priority && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {note.priority}
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={note.include_in_report}
                        onCheckedChange={() => handleToggleInclude(note)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingNote(note)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {note.description && (
                    <p className="mt-2 line-clamp-2 text-sm">{note.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No target notes recorded yet. Complete Step 4 (Field Research — Target Notes) first.
          </CardContent>
        </Card>
      )}

      <TargetNoteEditDialog
        targetNote={editingNote}
        onOpenChange={(open) => !open && setEditingNote(null)}
      />
    </div>
  )
}
