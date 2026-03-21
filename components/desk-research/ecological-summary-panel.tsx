'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles,
  MapPin,
  Bug,
  Droplets,
  RefreshCw,
  Pencil,
  Check,
  X,
  Download,
  Brain,
  Loader2,
  FileText,
  Trees,
} from 'lucide-react'
import { jsPDF } from 'jspdf'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// ============================================================
// Types & Config
// ============================================================

interface ParsedCategory {
  title: string
  content: string
  bulletCount: number
}

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  'Designated Areas': { icon: 'map-pin', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  Habitats: { icon: 'trees', color: 'text-green-600', bgColor: 'bg-green-100' },
  Species: { icon: 'bug', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  'Aquatic Features': { icon: 'droplets', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'Document Review': { icon: 'file-text', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
}

function parseInsightsIntoCategories(markdown: string): ParsedCategory[] {
  const categories: ParsedCategory[] = []
  const sections = markdown.split(/^## /m).filter(Boolean)

  for (const section of sections) {
    const newlineIdx = section.indexOf('\n')
    if (newlineIdx === -1) continue

    const title = section.substring(0, newlineIdx).trim()
    const content = section.substring(newlineIdx + 1).trim()
    const bulletCount = (content.match(/^- /gm) || []).length

    categories.push({ title, content, bulletCount })
  }

  return categories
}

function getCategoryIcon(title: string) {
  switch (title) {
    case 'Designated Areas':
      return MapPin
    case 'Habitats':
      return Trees
    case 'Species':
      return Bug
    case 'Aquatic Features':
      return Droplets
    case 'Document Review':
      return FileText
    default:
      return Sparkles
  }
}

// ============================================================
// Export helpers
// ============================================================

function stripMarkdownFormatting(md: string): string {
  return md
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
}

function exportAsPdf(markdown: string, projectName: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const usableWidth = pageWidth - margin * 2
  let y = 20

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage()
      y = 20
    }
  }

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Ecological Summary', margin, y)
  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(projectName, margin, y)
  y += 4
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IE')}`, margin, y)
  y += 10

  const lines = markdown.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      y += 3
      continue
    }

    if (trimmed.startsWith('## ')) {
      addPageIfNeeded(12)
      y += 4
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      const heading = trimmed.replace(/^## /, '')
      doc.text(heading, margin, y)
      y += 7
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      continue
    }

    if (trimmed.startsWith('- ')) {
      const bulletText = stripMarkdownFormatting(trimmed.replace(/^- /, ''))
      const wrapped = doc.splitTextToSize(`•  ${bulletText}`, usableWidth - 5)
      addPageIfNeeded(wrapped.length * 4.5)
      doc.text(wrapped, margin + 3, y)
      y += wrapped.length * 4.5
      continue
    }

    // Regular paragraph
    const plainText = stripMarkdownFormatting(trimmed)
    doc.setFont('helvetica', 'italic')
    const wrapped = doc.splitTextToSize(plainText, usableWidth)
    addPageIfNeeded(wrapped.length * 4.5)
    doc.text(wrapped, margin, y)
    y += wrapped.length * 4.5
    doc.setFont('helvetica', 'normal')
  }

  doc.save(`ecological-summary-${projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

async function exportAsDocx(markdown: string, projectName: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')

  const children: InstanceType<typeof Paragraph>[] = []

  // Title
  children.push(
    new Paragraph({
      text: 'Ecological Summary',
      heading: HeadingLevel.TITLE,
    })
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: projectName, italics: true }),
        new TextRun({
          text: `  •  Generated: ${new Date().toLocaleDateString('en-IE')}`,
          italics: true,
        }),
      ],
    })
  )
  children.push(new Paragraph({ text: '' }))

  const lines = markdown.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      children.push(new Paragraph({ text: '' }))
      continue
    }

    if (trimmed.startsWith('## ')) {
      const heading = trimmed.replace(/^## /, '')
      children.push(
        new Paragraph({
          text: heading,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240 },
        })
      )
      continue
    }

    if (trimmed.startsWith('- ')) {
      const bulletText = stripMarkdownFormatting(trimmed.replace(/^- /, ''))
      // Parse bold segments
      const runs: InstanceType<typeof TextRun>[] = []
      const parts = bulletText.split(/(\*\*.*?\*\*)/)
      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
        } else {
          runs.push(new TextRun({ text: part }))
        }
      }
      children.push(
        new Paragraph({
          children: runs,
          bullet: { level: 0 },
        })
      )
      continue
    }

    // Assessment paragraph (italic)
    children.push(
      new Paragraph({
        children: [new TextRun({ text: stripMarkdownFormatting(trimmed), italics: true })],
      })
    )
  }

  const doc = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ecological-summary-${projectName.replace(/\s+/g, '-').toLowerCase()}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// Component
// ============================================================

interface EcologicalSummaryPanelProps {
  insights: string | null
  isGenerating: boolean
  findingsCount: number
  projectName: string
  onRegenerate: () => void
  onInsightsChange: (insights: string) => void
}

export function EcologicalSummaryPanel({
  insights,
  isGenerating,
  findingsCount,
  projectName,
  onRegenerate,
  onInsightsChange,
}: EcologicalSummaryPanelProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editedContent, setEditedContent] = React.useState('')

  const parsedCategories = React.useMemo(() => {
    if (!insights) return []
    return parseInsightsIntoCategories(insights)
  }, [insights])

  // Loading state
  if (isGenerating) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-purple-500" />
        <h3 className="text-lg font-semibold">Generating Ecological Summary</h3>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
          Analyzing {findingsCount} findings across designated areas, habitats, species, and aquatic
          features...
        </p>
      </div>
    )
  }

  // Empty state
  if (!insights) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
        <Brain className="mb-4 h-16 w-16 text-gray-300" />
        <h3 className="text-lg font-semibold">Ecological Summary</h3>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
          Click <strong>&quot;Generate AI Analysis&quot;</strong> to get an automated ecological
          summary of your findings across 4 categories.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('max-w-none', isEditing && 'flex min-h-0 flex-1 flex-col')}>
      {/* Header with actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h3 className="m-0 text-lg font-semibold">Ecological Summary</h3>
        </div>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onInsightsChange(editedContent)
                  setIsEditing(false)
                }}
              >
                <Check className="mr-1 h-3 w-3" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditedContent(insights)
                  setIsEditing(true)
                }}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={onRegenerate}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Regenerate
              </Button>
              <Button variant="ghost" size="sm" onClick={() => exportAsPdf(insights, projectName)}>
                <Download className="mr-1 h-3 w-3" />
                PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => exportAsDocx(insights, projectName)}>
                <Download className="mr-1 h-3 w-3" />
                Word
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="h-full min-h-[600px] w-full flex-1 resize-none font-mono text-sm"
          placeholder="Edit the AI analysis in markdown..."
        />
      ) : parsedCategories.length > 0 ? (
        <div className="space-y-6 rounded-lg border bg-gray-50 p-4 dark:bg-gray-800">
          {parsedCategories.map((category) => {
            const config = CATEGORY_CONFIG[category.title]
            const CategoryIcon = getCategoryIcon(category.title)

            return (
              <div key={category.title}>
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      config?.bgColor || 'bg-gray-100 dark:bg-gray-800'
                    )}
                  >
                    <CategoryIcon className={cn('h-3.5 w-3.5', config?.color || 'text-gray-600')} />
                  </div>
                  <h4 className="font-semibold">{category.title}</h4>
                  {category.bulletCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {category.bulletCount}
                    </Badge>
                  )}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none pl-9">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{category.content}</ReactMarkdown>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto rounded-lg border bg-gray-50 p-4 dark:bg-gray-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{insights}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
