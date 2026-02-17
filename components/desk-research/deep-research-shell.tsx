'use client'

import * as React from 'react'
import { Sparkles, AlertTriangle, Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// --- Shared markdown renderer for AI analysis text ---
export function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      {text.split('\n').map((line, idx) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <h4 key={idx} className="mt-3 mb-1 text-sm font-semibold">
              {line.replace(/\*\*/g, '')}
            </h4>
          )
        }
        if (line.startsWith('**')) {
          const parts = line.split('**')
          return (
            <div key={idx} className="mt-3">
              <h4 className="mb-1 text-sm font-semibold">{parts[1]}</h4>
              {parts[2] && <p className="text-muted-foreground text-xs">{parts[2]}</p>}
            </div>
          )
        }
        if (line.trim() === '') return <div key={idx} className="h-1" />
        return (
          <p key={idx} className="text-muted-foreground mb-2 text-xs leading-relaxed">
            {line}
          </p>
        )
      })}
    </div>
  )
}

// --- AI Analysis Card (loading / error / content / regenerate) ---
interface AiAnalysisCardProps {
  summary: string
  isLoading: boolean
  error: string | null
  onGenerate: () => void
  onRegenerate: () => void
  headerBadges?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyExtra?: React.ReactNode
  loadingText?: string
}

export function AiAnalysisCard({
  summary,
  isLoading,
  error,
  onGenerate,
  onRegenerate,
  headerBadges,
  emptyTitle = 'AI-Powered Analysis',
  emptyDescription = 'Generate a detailed ecological analysis.',
  emptyExtra,
  loadingText = 'Generating Analysis...',
}: AiAnalysisCardProps) {
  if (summary) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Analysis
            {headerBadges}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-[10px] text-purple-600 hover:text-purple-700"
              onClick={onRegenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              Regenerate
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MarkdownContent text={summary} />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
          <Button size="sm" variant="outline" className="mt-2" onClick={onGenerate}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-purple-400" />
          <p className="text-sm font-medium">{loadingText}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-purple-300" />
        <p className="text-sm font-medium">{emptyTitle}</p>
        <p className="text-muted-foreground mt-1 text-xs">{emptyDescription}</p>
        {emptyExtra}
        <Button
          className="mt-4 bg-purple-600 hover:bg-purple-700"
          size="sm"
          onClick={onGenerate}
          disabled={isLoading}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate AI Analysis
        </Button>
      </CardContent>
    </Card>
  )
}

// --- Resource Link Card ---
interface ResourceLinkCardProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  borderColor?: string
}

export function ResourceLinkCard({
  href,
  icon,
  title,
  description,
  borderColor,
}: ResourceLinkCardProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <Card className={`hover:bg-muted/50 cursor-pointer transition-colors ${borderColor || ''}`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
              </div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
        </CardContent>
      </Card>
    </a>
  )
}

// --- Deep Research Shell ---
interface DeepResearchShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  headerIcon: React.ReactNode
  title: string
  headerBadges: React.ReactNode
  tabs: Array<{
    value: string
    label: React.ReactNode
    content: React.ReactNode
  }>
  defaultTab?: string
  footerInfo: string
  isSaved: boolean
  isSaving: boolean
  canSave: boolean
  onSave: () => void
}

export function DeepResearchShell({
  open,
  onOpenChange,
  headerIcon,
  title,
  headerBadges,
  tabs,
  defaultTab = 'overview',
  footerInfo,
  isSaved,
  isSaving,
  canSave,
  onSave,
}: DeepResearchShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {headerIcon}
            <div className="flex-1">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="sr-only">{title}</DialogDescription>
              <div className="mt-1 flex flex-wrap items-center gap-2">{headerBadges}</div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList
              className={`grid w-full text-xs`}
              style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
            >
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="px-2 text-xs">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-4">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </ScrollArea>

        <Separator />

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">{footerInfo}</p>
          <div className="flex gap-2">
            {canSave && (
              <Button
                variant={isSaved ? 'secondary' : 'default'}
                size="sm"
                onClick={onSave}
                disabled={isSaving || isSaved}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isSaved ? (
                  '✓ Saved'
                ) : (
                  'Save Research'
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
