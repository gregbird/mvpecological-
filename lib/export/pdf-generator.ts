'use client'

import { jsPDF } from 'jspdf'
import type { ReportSection } from '@/lib/supabase/queries/reports'

export interface PeaExportOptions {
  title: string
  preparedFor: string
  siteCode: string
  version: number
  date: string
  sections: ReportSection[]
  appendices: string[]
}

const APPENDIX_LABELS: Record<string, string> = {
  habitat_map: 'Habitat Map',
  species_list: 'Species List',
  photographs: 'Site Photographs',
  survey_datasheets: 'Survey Datasheets',
  desk_study_data: 'Desk Study Data',
  legislation: 'Legislation References',
}

// ============================================================
// Markdown parsing types
// ============================================================

interface MdParagraph {
  type: 'paragraph'
  segments: TextSegment[]
}
interface MdHeading {
  type: 'heading'
  level: number
  text: string
}
interface MdBullet {
  type: 'bullet'
  segments: TextSegment[]
  indent: number
}
interface MdTable {
  type: 'table'
  headers: string[]
  rows: string[][]
}

type MdBlock = MdParagraph | MdHeading | MdBullet | MdTable

interface TextSegment {
  text: string
  bold: boolean
  italic: boolean
}

// Known scientific genus names for auto-italicisation
const SCIENTIFIC_GENERA = [
  'Lutra',
  'Ammophila',
  'Elymus',
  'Cakile',
  'Salsola',
  'Festuca',
  'Galium',
  'Dactylorhiza',
  'Anacamptis',
  'Hippophae',
  'Salix',
  'Hydrocotyle',
  'Mentha',
  'Eryngium',
  'Armeria',
  'Plantago',
  'Lolium',
  'Trifolium',
  'Crataegus',
  'Prunus',
  'Thymus',
  'Lotus',
  'Charadrius',
  'Calidris',
  'Haematopus',
  'Numenius',
  'Pluvialis',
  'Alauda',
  'Falco',
  'Linaria',
  'Tadorna',
  'Anthus',
  'Lepus',
  'Oryctolagus',
  'Meles',
  'Erinaceus',
  'Vulpes',
  'Phocoena',
  'Tursiops',
  'Martes',
  'Mustela',
  'Pipistrellus',
  'Myotis',
  'Rhinolophus',
  'Nyctalus',
  'Eptesicus',
  'Plecotus',
  'Sorex',
  'Apodemus',
  'Cervus',
  'Dama',
  'Sciurus',
  'Neovison',
  'Ondatra',
  'Rattus',
  'Mus',
]

// ============================================================
// Markdown parser
// ============================================================

function parseMarkdown(md: string): MdBlock[] {
  const blocks: MdBlock[] = []
  const lines = md.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (!line.trim()) {
      i++
      continue
    }

    // Table detection: line starts with | and next line is separator
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      /^\|[\s-:|]+\|$/.test(lines[i + 1].trim())
    ) {
      const headerCells = line
        .split('|')
        .filter((c) => c.trim())
        .map((c) => c.trim())
      i += 2 // skip header + separator

      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i]
          .split('|')
          .filter((c) => c.trim())
          .map((c) => c.trim())
        rows.push(cells)
        i++
      }
      blocks.push({ type: 'table', headers: headerCells, rows })
      continue
    }

    // Heading: ## or ###
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() })
      i++
      continue
    }

    // Bullet: - or * or numbered
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)$/) || line.match(/^(\s*)\d+\.\s+(.+)$/)
    if (bulletMatch) {
      const indent = Math.floor((bulletMatch[1] || '').length / 2)
      // Collect continuation lines (indented, non-bullet, non-empty)
      const bulletText = [bulletMatch[2]]
      while (
        i + 1 < lines.length &&
        lines[i + 1].trim() &&
        !lines[i + 1].trim().startsWith('#') &&
        !lines[i + 1].trim().startsWith('|') &&
        !/^\s*[-*]\s+/.test(lines[i + 1]) &&
        !/^\s*\d+\.\s+/.test(lines[i + 1]) &&
        /^\s{2,}/.test(lines[i + 1])
      ) {
        i++
        bulletText.push(lines[i].trim())
      }
      blocks.push({
        type: 'bullet',
        segments: parseInlineWithScientific(bulletText.join(' ')),
        indent,
      })
      i++
      continue
    }

    // Regular paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('|') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i].trim())
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        segments: parseInlineWithScientific(paraLines.join(' ')),
      })
    }
  }

  return blocks
}

/** Parse inline bold/italic markers into segments */
function parseInline(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  // Regex to match ***bold italic***, **bold**, *italic*
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false, italic: false })
    }

    if (match[2]) {
      segments.push({ text: match[2], bold: true, italic: true })
    } else if (match[3]) {
      segments.push({ text: match[3], bold: true, italic: false })
    } else if (match[4]) {
      segments.push({ text: match[4], bold: false, italic: true })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false, italic: false })
  }

  if (segments.length === 0) {
    segments.push({ text, bold: false, italic: false })
  }

  return segments
}

/** Parse inline markers AND auto-italicise scientific names */
function parseInlineWithScientific(text: string): TextSegment[] {
  const segments = parseInline(text)
  const result: TextSegment[] = []

  for (const seg of segments) {
    if (seg.italic || seg.bold) {
      // Already styled, keep as-is
      result.push(seg)
      continue
    }

    // Check for scientific binomials: "Genus species" or "Genus species subspecies"
    const sciRegex = new RegExp(
      `\\b(${SCIENTIFIC_GENERA.join('|')})\\s+[a-z][a-z]+(?:\\s+[a-z][a-z]+)?\\b`,
      'g'
    )
    let lastIdx = 0
    let sciMatch: RegExpExecArray | null

    let hasMatch = false
    while ((sciMatch = sciRegex.exec(seg.text)) !== null) {
      hasMatch = true
      if (sciMatch.index > lastIdx) {
        result.push({ text: seg.text.slice(lastIdx, sciMatch.index), bold: false, italic: false })
      }
      result.push({ text: sciMatch[0], bold: false, italic: true })
      lastIdx = sciMatch.index + sciMatch[0].length
    }

    if (hasMatch) {
      if (lastIdx < seg.text.length) {
        result.push({ text: seg.text.slice(lastIdx), bold: false, italic: false })
      }
    } else {
      result.push(seg)
    }
  }

  return result
}

// ============================================================
// Word-level types for proper text wrapping
// ============================================================

interface StyledWord {
  text: string
  bold: boolean
  italic: boolean
  trailingSpace: boolean
}

/** Convert segments into words with style information */
function segmentsToWords(segments: TextSegment[]): StyledWord[] {
  const words: StyledWord[] = []

  for (const seg of segments) {
    const parts = seg.text.split(/(\s+)/)
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!part) continue
      if (/^\s+$/.test(part)) continue // skip whitespace-only parts

      const hasTrailingSpace =
        i + 1 < parts.length && /^\s+$/.test(parts[i + 1] || '') ? true : false

      words.push({
        text: part,
        bold: seg.bold,
        italic: seg.italic,
        trailingSpace: hasTrailingSpace,
      })
    }
  }

  return words
}

// ============================================================
// PDF Generator
// ============================================================

export function generatePeaPdf(options: PeaExportOptions): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 5.5
  const paraSpacing = 3
  const footerY = pageHeight - 15

  let currentPage = 1

  // Helper: set font and return width measurement
  const setFont = (bold: boolean, italic: boolean, size: number = 10) => {
    const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal'
    doc.setFontSize(size)
    doc.setFont('helvetica', style)
  }

  const getWordWidth = (word: StyledWord): number => {
    setFont(word.bold, word.italic)
    return doc.getTextWidth(word.text)
  }

  const getSpaceWidth = (): number => {
    setFont(false, false)
    return doc.getTextWidth(' ')
  }

  const addFooter = () => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(128, 128, 128)
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3)
    doc.text(`${options.siteCode} \u2014 ${options.title}`, margin, footerY)
    doc.text(`Page ${currentPage}`, pageWidth - margin, footerY, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    doc.setDrawColor(0, 0, 0)
  }

  const newPage = (): number => {
    addFooter()
    doc.addPage()
    currentPage++
    return margin + 5
  }

  const ensureSpace = (y: number, needed: number): number => {
    if (y + needed > footerY - 8) {
      return newPage()
    }
    return y
  }

  /** Word-by-word wrapping with correct bold/italic per word */
  const writeRichText = (segments: TextSegment[], startX: number, startY: number): number => {
    const words = segmentsToWords(segments)
    if (words.length === 0) return startY

    const maxWidth = contentWidth - (startX - margin)
    const spaceW = getSpaceWidth()

    let y = ensureSpace(startY, lineHeight)
    let x = startX
    let lineStart = true

    for (const word of words) {
      const wordW = getWordWidth(word)

      // If adding this word exceeds line width, wrap to next line
      if (!lineStart && x + wordW > startX + maxWidth) {
        y += lineHeight
        y = ensureSpace(y, lineHeight)
        x = startX
        lineStart = true
      }

      // Render the word
      setFont(word.bold, word.italic)
      doc.text(word.text, x, y)
      x += wordW

      // Add space after word if it had trailing space
      if (word.trailingSpace) {
        x += spaceW
      }

      lineStart = false
    }

    return y + lineHeight
  }

  /** Write a plain text line with given style */
  const writePlainText = (
    text: string,
    x: number,
    y: number,
    opts?: { fontSize?: number; bold?: boolean; italic?: boolean; color?: [number, number, number] }
  ): number => {
    const fontSize = opts?.fontSize || 10
    setFont(opts?.bold || false, opts?.italic || false, fontSize)
    if (opts?.color) doc.setTextColor(...opts.color)

    const maxW = contentWidth - (x - margin)
    const lines = doc.splitTextToSize(text, maxW) as string[]
    let cy = y
    for (const line of lines) {
      cy = ensureSpace(cy, lineHeight)
      doc.text(line, x, cy)
      cy += lineHeight
    }

    if (opts?.color) doc.setTextColor(0, 0, 0)
    return cy
  }

  // ===== COVER PAGE =====
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(44, 82, 52)
  doc.text('PRELIMINARY ECOLOGICAL APPRAISAL', pageWidth / 2, 60, { align: 'center' })

  doc.setFontSize(20)
  doc.setTextColor(0, 0, 0)
  const titleLines = doc.splitTextToSize(options.title, contentWidth - 20) as string[]
  let titleY = 80
  for (const line of titleLines) {
    doc.text(line, pageWidth / 2, titleY, { align: 'center' })
    titleY += 10
  }

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  const coverDetails = [
    { label: 'Prepared For:', value: options.preparedFor || 'Client' },
    { label: 'Site Reference:', value: options.siteCode },
    { label: 'Version:', value: `${options.version}` },
    { label: 'Date:', value: options.date },
  ]

  let coverY = titleY + 20
  for (const detail of coverDetails) {
    doc.setFont('helvetica', 'bold')
    doc.text(detail.label, pageWidth / 2 - 30, coverY)
    doc.setFont('helvetica', 'normal')
    doc.text(detail.value, pageWidth / 2 + 20, coverY)
    coverY += 8
  }

  doc.setFontSize(9)
  doc.setTextColor(128, 128, 128)
  doc.text('Generated by Dulra Ecological Platform', pageWidth / 2, pageHeight - 30, {
    align: 'center',
  })
  doc.setTextColor(0, 0, 0)

  // ===== TABLE OF CONTENTS =====
  addFooter()
  doc.addPage()
  currentPage++

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Table of Contents', margin, margin + 10)

  let tocY = margin + 25
  doc.setFontSize(11)

  const contentSections = options.sections.filter((s) => s.content)
  for (let i = 0; i < contentSections.length; i++) {
    doc.setFont('helvetica', 'normal')
    doc.text(`${i + 1}. ${contentSections[i].title}`, margin + 5, tocY)
    tocY += 7
  }

  if (options.appendices.length > 0) {
    tocY += 5
    doc.setFont('helvetica', 'bold')
    doc.text('Appendices', margin + 5, tocY)
    tocY += 7
    doc.setFont('helvetica', 'normal')
    const letters = 'ABCDEFGHIJ'
    for (let i = 0; i < options.appendices.length; i++) {
      const label = APPENDIX_LABELS[options.appendices[i]] || options.appendices[i]
      doc.text(`Appendix ${letters[i] || i + 1}: ${label}`, margin + 10, tocY)
      tocY += 7
    }
  }

  // ===== REPORT SECTIONS (continuous flow) =====
  let y = newPage()

  for (const section of contentSections) {
    // Ensure at least 35mm space for a new section heading
    y = ensureSpace(y, 35)

    // Extra spacing between sections
    if (y > margin + 10) {
      y += 4
    }

    // Section title with green underline
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(44, 82, 52)
    doc.text(section.title, margin, y)
    const titleWidth = doc.getTextWidth(section.title)
    doc.setDrawColor(44, 82, 52)
    doc.setLineWidth(0.4)
    doc.line(margin, y + 1.5, margin + titleWidth, y + 1.5)
    doc.setDrawColor(0, 0, 0)
    doc.setTextColor(0, 0, 0)
    y += 10

    // Parse and render content
    const blocks = parseMarkdown(section.content)

    for (const block of blocks) {
      switch (block.type) {
        case 'heading':
          y = ensureSpace(y, 15)
          y += paraSpacing
          y = writePlainText(block.text, margin, y, {
            fontSize: block.level <= 2 ? 12 : 11,
            bold: true,
          })
          y += 1
          break

        case 'paragraph':
          y = ensureSpace(y, lineHeight * 2)
          y = writeRichText(block.segments, margin, y)
          y += paraSpacing
          break

        case 'bullet': {
          y = ensureSpace(y, lineHeight * 2)
          const bulletIndent = margin + 3 + block.indent * 5
          const textIndent = bulletIndent + 5

          // Bullet marker
          setFont(false, false)
          doc.text('\u2022', bulletIndent, y)
          y = writeRichText(block.segments, textIndent, y)
          y += 1
          break
        }

        case 'table':
          y = renderTable(doc, block, y, margin, contentWidth, ensureSpace, newPage)
          y += paraSpacing
          break
      }
    }

    // Section spacing
    y += 4
  }

  // ===== APPENDICES =====
  if (options.appendices.length > 0) {
    y = ensureSpace(y, 35)
    y += 4

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(44, 82, 52)
    doc.text('Appendices', margin, y)
    doc.setTextColor(0, 0, 0)
    y += 10

    const letters = 'ABCDEFGHIJ'
    for (let i = 0; i < options.appendices.length; i++) {
      const label = APPENDIX_LABELS[options.appendices[i]] || options.appendices[i]
      y = writePlainText(`Appendix ${letters[i] || i + 1}: ${label}`, margin, y, {
        fontSize: 11,
        bold: true,
      })
      y = writePlainText('[Content to be inserted]', margin, y, { fontSize: 10, italic: true })
      y += 4
    }
  }

  addFooter()
  return doc
}

// ============================================================
// Table renderer
// ============================================================

function renderTable(
  doc: jsPDF,
  table: MdTable,
  startY: number,
  margin: number,
  contentWidth: number,
  ensureSpace: (y: number, needed: number) => number,
  _newPage: () => number
): number {
  const colCount = table.headers.length
  if (colCount === 0) return startY

  const cellPadding = 3
  const rowHeight = 8
  const fontSize = 9

  // Calculate column widths proportionally based on content
  const colWidths = calculateColumnWidths(doc, table, contentWidth, fontSize)

  let y = ensureSpace(startY, rowHeight * 2 + 4)
  y += 2

  // Header row — green background
  doc.setFillColor(44, 82, 52)
  doc.rect(margin, y, contentWidth, rowHeight, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', 'bold')

  let headerX = margin
  for (let c = 0; c < colCount; c++) {
    const colW = colWidths[c]
    const text = truncateText(doc, table.headers[c] || '', colW - cellPadding * 2)
    doc.text(text, headerX + cellPadding, y + rowHeight - cellPadding)
    headerX += colW
  }

  y += rowHeight

  // Body rows
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)

  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r]
    y = ensureSpace(y, rowHeight)

    // Alternating row background
    if (r % 2 === 0) {
      doc.setFillColor(245, 247, 245)
      doc.rect(margin, y, contentWidth, rowHeight, 'F')
    }

    // Row border
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.rect(margin, y, contentWidth, rowHeight, 'S')

    // Cell content and vertical dividers
    let cellX = margin
    for (let c = 0; c < colCount; c++) {
      const colW = colWidths[c]

      // Vertical divider (not for first column)
      if (c > 0) {
        doc.line(cellX, y, cellX, y + rowHeight)
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(fontSize)
      const cellText = truncateText(doc, row[c] || '', colW - cellPadding * 2)
      doc.text(cellText, cellX + cellPadding, y + rowHeight - cellPadding)
      cellX += colW
    }

    y += rowHeight
  }

  // Bottom border
  doc.setDrawColor(44, 82, 52)
  doc.setLineWidth(0.3)
  doc.line(margin, y, margin + contentWidth, y)

  doc.setDrawColor(0, 0, 0)
  return y + 2
}

/** Calculate proportional column widths based on content */
function calculateColumnWidths(
  doc: jsPDF,
  table: MdTable,
  totalWidth: number,
  fontSize: number
): number[] {
  doc.setFontSize(fontSize)

  const colCount = table.headers.length
  const minWidth = 20
  const maxWidths: number[] = []

  for (let c = 0; c < colCount; c++) {
    doc.setFont('helvetica', 'bold')
    let maxW = doc.getTextWidth(table.headers[c] || '') + 10

    doc.setFont('helvetica', 'normal')
    for (const row of table.rows) {
      const cellW = doc.getTextWidth(row[c] || '') + 10
      maxW = Math.max(maxW, cellW)
    }

    maxWidths.push(Math.max(maxW, minWidth))
  }

  // Normalize to fit totalWidth
  const sum = maxWidths.reduce((a, b) => a + b, 0)
  return maxWidths.map((w) => Math.max((w / sum) * totalWidth, minWidth))
}

/** Truncate text to fit within a given width */
function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text

  let truncated = text
  while (truncated.length > 0 && doc.getTextWidth(truncated + '...') > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '...'
}

// ============================================================
// HTML Generator
// ============================================================

export function generatePeaHtml(options: PeaExportOptions): string {
  const contentSections = options.sections.filter((s) => s.content)

  const tocHtml = contentSections
    .map((s, i) => `<li><a href="#section-${i}">${s.title}</a></li>`)
    .join('\n')

  const sectionsHtml = contentSections
    .map(
      (s, i) => `
    <div class="section" id="section-${i}">
      <h2>${s.title}</h2>
      <div class="section-content">${markdownToHtml(s.content)}</div>
    </div>`
    )
    .join('\n')

  const appendicesHtml =
    options.appendices.length > 0
      ? `
    <div class="section">
      <h2>Appendices</h2>
      ${options.appendices
        .map(
          (a, i) => `
        <h3>Appendix ${String.fromCharCode(65 + i)}: ${APPENDIX_LABELS[a] || a}</h3>
        <p><em>[Content to be inserted]</em></p>`
        )
        .join('\n')}
    </div>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      font-family: 'Calibri', 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .cover-page {
      text-align: center;
      padding: 80px 0;
      border-bottom: 2px solid #2c5234;
      margin-bottom: 40px;
    }
    .cover-page h1 { color: #2c5234; font-size: 14pt; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
    .cover-page .title { font-size: 22pt; font-weight: bold; margin-bottom: 30px; }
    .cover-page .details { font-size: 12pt; color: #666; }
    .cover-page .details div { margin: 5px 0; }
    .toc { margin: 40px 0; }
    .toc h2 { color: #2c5234; border-bottom: 1px solid #2c5234; padding-bottom: 5px; }
    .toc ol { padding-left: 20px; }
    .toc li { margin: 5px 0; }
    .toc a { color: #2c5234; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    .section { margin: 30px 0; page-break-before: always; }
    .section:first-of-type { page-break-before: avoid; }
    .section h2 { color: #2c5234; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-size: 14pt; }
    .section h3 { color: #444; font-size: 12pt; margin-top: 20px; }
    .section-content { margin-top: 10px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 10pt; }
    th { background: #2c5234; color: white; font-weight: bold; }
    tr:nth-child(even) { background: #f5f5f5; }
    ul, ol { padding-left: 25px; }
    li { margin: 3px 0; }
    .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9pt; color: #999; text-align: center; }
    @media print {
      body { padding: 20px; }
      .section { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="cover-page">
    <h1>Preliminary Ecological Appraisal</h1>
    <div class="title">${escapeHtml(options.title)}</div>
    <div class="details">
      <div><strong>Prepared For:</strong> ${escapeHtml(options.preparedFor || 'Client')}</div>
      <div><strong>Site Reference:</strong> ${escapeHtml(options.siteCode)}</div>
      <div><strong>Version:</strong> ${options.version}</div>
      <div><strong>Date:</strong> ${escapeHtml(options.date)}</div>
    </div>
  </div>
  <div class="toc">
    <h2>Table of Contents</h2>
    <ol>${tocHtml}</ol>
  </div>
  ${sectionsHtml}
  ${appendicesHtml}
  <div class="footer">Generated by Dulra Ecological Platform &mdash; ${escapeHtml(options.date)}</div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function markdownToHtml(md: string): string {
  let html = escapeHtml(md)

  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>')

  // Tables
  html = html.replace(
    /^(\|.+\|)\n(\|[\s-:|]+\|)\n((?:\|.+\|\n?)*)/gm,
    (_match, headerRow: string, _separator: string, bodyRows: string) => {
      const headers = headerRow
        .split('|')
        .filter((c: string) => c.trim())
        .map((c: string) => `<th>${c.trim()}</th>`)
        .join('')
      const rows = bodyRows
        .trim()
        .split('\n')
        .filter((r: string) => r.trim())
        .map((row: string) => {
          const cells = row
            .split('|')
            .filter((c: string) => c.trim())
            .map((c: string) => `<td>${c.trim()}</td>`)
            .join('')
          return `<tr>${cells}</tr>`
        })
        .join('')
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
    }
  )

  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')

  html = html.replace(/\n\n/g, '</p><p>')
  html = `<p>${html}</p>`

  html = html.replace(/<p>\s*<\/p>/g, '')
  html = html.replace(/<p>(<h[23]>)/g, '$1')
  html = html.replace(/(<\/h[23]>)<\/p>/g, '$1')
  html = html.replace(/<p>(<table>)/g, '$1')
  html = html.replace(/(<\/table>)<\/p>/g, '$1')
  html = html.replace(/<p>(<ul>)/g, '$1')
  html = html.replace(/(<\/ul>)<\/p>/g, '$1')

  return html
}
