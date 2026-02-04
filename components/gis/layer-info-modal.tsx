'use client'

import * as React from 'react'
import {
  ExternalLink,
  Info,
  Calendar,
  MapPin,
  FileText,
  Scale,
  Building2,
  RefreshCw,
  Mail,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { type LayerMetadata } from '@/lib/config/layer-metadata'

interface LayerInfoModalProps {
  metadata: LayerMetadata | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string | React.ReactNode
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
        <p className="text-foreground mt-0.5 text-sm">{value}</p>
      </div>
    </div>
  )
}

export function LayerInfoModal({ metadata, open, onOpenChange }: LayerInfoModalProps) {
  if (!metadata) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            {metadata.name}
          </DialogTitle>
          {metadata.nameIrish && (
            <DialogDescription className="italic">{metadata.nameIrish}</DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Description */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-foreground text-sm leading-relaxed">{metadata.description}</p>
            </div>

            {/* Source & Attribution */}
            <div className="space-y-1">
              <h4 className="text-foreground text-sm font-semibold">Data Source</h4>
              <Separator />
              <div className="grid gap-1 pt-2">
                <InfoRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="Provider"
                  value={metadata.source}
                />
                <InfoRow
                  icon={<FileText className="h-4 w-4" />}
                  label="Attribution"
                  value={metadata.attribution}
                />
              </div>
            </div>

            {/* Methodology */}
            <div className="space-y-1">
              <h4 className="text-foreground text-sm font-semibold">Methodology</h4>
              <Separator />
              <p className="text-muted-foreground pt-2 text-sm leading-relaxed">
                {metadata.methodology}
              </p>
            </div>

            {/* Relevance for Projects */}
            <div className="space-y-1">
              <h4 className="text-foreground text-sm font-semibold">Relevance for Projects</h4>
              <Separator />
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                  {metadata.relevance}
                </p>
              </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-1">
              <h4 className="text-foreground text-sm font-semibold">Technical Details</h4>
              <Separator />
              <div className="grid gap-1 pt-2 sm:grid-cols-2">
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Coverage"
                  value={metadata.coverage}
                />
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Last Updated"
                  value={metadata.lastUpdated}
                />
                <InfoRow
                  icon={<RefreshCw className="h-4 w-4" />}
                  label="Update Frequency"
                  value={metadata.updateFrequency}
                />
                <InfoRow
                  icon={<FileText className="h-4 w-4" />}
                  label="Data Format"
                  value={metadata.dataFormat}
                />
              </div>
            </div>

            {/* License */}
            <div className="space-y-1">
              <h4 className="text-foreground text-sm font-semibold">License</h4>
              <Separator />
              <div className="flex items-center gap-2 pt-2">
                <Scale className="text-muted-foreground h-4 w-4" />
                {metadata.licenseUrl ? (
                  <a
                    href={metadata.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {metadata.license}
                    <ExternalLink className="ml-1 inline h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground text-sm">{metadata.license}</span>
                )}
              </div>
            </div>

            {/* Contact */}
            {metadata.contactInfo && (
              <div className="space-y-1">
                <h4 className="text-foreground text-sm font-semibold">Contact</h4>
                <Separator />
                <div className="flex items-center gap-2 pt-2">
                  <Mail className="text-muted-foreground h-4 w-4" />
                  <a
                    href={`mailto:${metadata.contactInfo}`}
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {metadata.contactInfo}
                  </a>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with action button */}
        <div className="flex items-center justify-between border-t pt-4">
          <Badge variant="outline" className="text-xs">
            ID: {metadata.id}
          </Badge>
          <Button asChild>
            <a href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Go to Source
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Trigger button component for opening layer info modal
 */
interface LayerInfoButtonProps {
  onClick: () => void
  className?: string
}

export function LayerInfoButton({ onClick, className }: LayerInfoButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1 transition-colors ${className || ''}`}
      title="View layer information"
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  )
}
