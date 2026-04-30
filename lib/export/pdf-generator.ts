'use client'

import { jsPDF } from 'jspdf'
import type { ReportSection } from '@/lib/supabase/queries/reports'
import type { AppendixData } from './appendix-data'
import { fetchImageAsBase64 } from './image-utils'
import { sectionContentToMarkdown } from './tiptap-to-markdown'

export interface PeaExportOptions {
  title: string
  preparedFor: string
  siteCode: string
  /** Multi-site project: full list of site codes for cover page rendering */
  siteCodes?: string[]
  /** When set, the export is narrowed to a single site of a multi-site project */
  activeSiteId?: string | null
  /** Friendly site code label, used as filename suffix and cover page banner */
  activeSiteCode?: string
  /** Report type key (e.g. 'pea', 'ecia', 'aa_screening') for cover page title */
  reportType?: string
  version: number
  date: string
  sections: ReportSection[]
  appendices: string[]
  appendixData?: AppendixData
}

export const REPORT_TYPE_TITLES: Record<string, string> = {
  pea: 'PRELIMINARY ECOLOGICAL APPRAISAL',
  ecia: 'ECOLOGICAL IMPACT ASSESSMENT',
  aa_screening: 'APPROPRIATE ASSESSMENT SCREENING',
  aa_stage2: 'NATURA IMPACT STATEMENT',
  nia: 'NATURA IMPACT STATEMENT',
  bat_survey: 'BAT SURVEY REPORT',
  bird_survey: 'BIRD SURVEY REPORT',
  habitat_survey: 'HABITAT SURVEY REPORT',
}

const APPENDIX_LABELS: Record<string, string> = {
  habitat_map: 'Habitat Map',
  habitat_data: 'Habitat Data',
  designated_sites: 'Designated Sites',
  species_list: 'Species List',
  photographs: 'Site Photographs',
  survey_datasheets: 'Survey Datasheets',
  aquatic_data: 'Aquatic Features',
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
interface MdImage {
  type: 'image'
  src: string
  alt: string
}

type MdBlock = MdParagraph | MdHeading | MdBullet | MdTable | MdImage

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

    // Image: ![alt](src)
    const imageMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imageMatch) {
      blocks.push({ type: 'image', alt: imageMatch[1] || 'Photo', src: imageMatch[2] })
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
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^!\[/.test(lines[i].trim())
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

export async function generatePeaPdf(options: PeaExportOptions): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 5.5
  const paraSpacing = 3
  const footerY = pageHeight - 15

  let currentPage = 1

  // Font state cache — avoids redundant setFont/setFontSize calls
  let _curStyle = ''
  let _curSize = 0
  const setFont = (bold: boolean, italic: boolean, size: number = 10) => {
    const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal'
    if (style !== _curStyle || size !== _curSize) {
      doc.setFontSize(size)
      doc.setFont('helvetica', style)
      _curStyle = style
      _curSize = size
    }
  }

  // Text width cache — keyed by "style|size|text"
  const _widthCache = new Map<string, number>()
  const cachedTextWidth = (
    text: string,
    bold: boolean,
    italic: boolean,
    size: number = 10
  ): number => {
    const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal'
    const key = `${style}|${size}|${text}`
    const cached = _widthCache.get(key)
    if (cached !== undefined) return cached
    setFont(bold, italic, size)
    const w = doc.getTextWidth(text)
    _widthCache.set(key, w)
    return w
  }

  const getWordWidth = (word: StyledWord): number => {
    return cachedTextWidth(word.text, word.bold, word.italic)
  }

  const getSpaceWidth = (): number => {
    return cachedTextWidth(' ', false, false)
  }

  const addFooter = () => {
    _curStyle = ''
    _curSize = 0
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

  const GREEN: [number, number, number] = [44, 82, 52]
  const WHITE: [number, number, number] = [255, 255, 255]
  const LIGHT_GRAY: [number, number, number] = [245, 247, 245]

  // ===== COVER PAGE =====
  // Top green banner
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageWidth, 40, 'F')

  // "DULRA ECOLOGICAL" in top banner
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('DULRA ECOLOGICAL PLATFORM', pageWidth / 2, 16, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Ecological Consultancy Management System', pageWidth / 2, 26, { align: 'center' })
  doc.setFontSize(9)
  // Multi-site banner: show "Sites: A, B, C" when more than one site, otherwise legacy single code
  const bannerSiteText =
    options.siteCodes && options.siteCodes.length > 1
      ? `Sites: ${options.siteCodes.join(', ')}`
      : options.siteCode
  doc.text(bannerSiteText, pageWidth / 2, 34, { align: 'center' })

  // Report type label
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GREEN)
  const coverTitle =
    (options.reportType && REPORT_TYPE_TITLES[options.reportType]) || 'ECOLOGICAL REPORT'
  doc.text(coverTitle, pageWidth / 2, 68, { align: 'center' })

  // Thin green underline under report type
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.6)
  doc.line(margin + 20, 71, pageWidth - margin - 20, 71)

  // Project title — large, centered (with optional site export suffix)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  const titleText = options.activeSiteCode
    ? `${options.title} (Site: ${options.activeSiteCode})`
    : options.title
  const titleLines = doc.splitTextToSize(titleText, contentWidth - 10) as string[]
  let titleY = 88
  for (const line of titleLines) {
    doc.text(line, pageWidth / 2, titleY, { align: 'center' })
    titleY += 12
  }

  // Details box — light gray background
  const boxTop = titleY + 16
  const boxLeft = margin + 15
  const boxRight = pageWidth - margin - 15
  const boxWidth = boxRight - boxLeft
  // Site reference label adapts to multi-site projects
  const siteRefValue = options.activeSiteCode
    ? `${options.activeSiteCode} (filtered from project)`
    : options.siteCodes && options.siteCodes.length > 1
      ? options.siteCodes.join(', ')
      : options.siteCode
  const detailRows = [
    { label: 'Prepared For', value: options.preparedFor || 'Client' },
    { label: 'Site Reference', value: siteRefValue },
    { label: 'Report Version', value: `Version ${options.version}` },
    { label: 'Date', value: options.date },
  ]
  const rowH = 10
  const boxH = detailRows.length * rowH + 6

  doc.setFillColor(...LIGHT_GRAY)
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.4)
  doc.roundedRect(boxLeft, boxTop, boxWidth, boxH, 2, 2, 'FD')

  detailRows.forEach((row, idx) => {
    const ry = boxTop + 10 + idx * rowH
    // Label column
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text(row.label, boxLeft + 8, ry)
    // Value column
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(row.value, boxLeft + boxWidth * 0.45, ry)
    // Divider between rows (except last)
    if (idx < detailRows.length - 1) {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.line(boxLeft + 4, ry + 3, boxRight - 4, ry + 3)
    }
  })

  // Bottom green banner
  doc.setFillColor(...GREEN)
  doc.rect(0, pageHeight - 22, pageWidth, 22, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...WHITE)
  doc.text('Generated by Dulra Ecological Platform', pageWidth / 2, pageHeight - 13, {
    align: 'center',
  })
  doc.text(`© ${new Date().getFullYear()} — Confidential`, pageWidth / 2, pageHeight - 6, {
    align: 'center',
  })

  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)

  // ===== TABLE OF CONTENTS =====
  doc.addPage()
  currentPage++

  // TOC header — green background bar
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('TABLE OF CONTENTS', margin, 18)
  doc.setTextColor(0, 0, 0)

  // Thick green bottom border under header
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.8)
  doc.line(margin, 32, pageWidth - margin, 32)

  let tocY = 44
  const contentSections = options.sections.filter((s) => s.content)

  // Sections start on page 3 (cover=1, TOC=2, first section=3)
  const sectionStartPage = 3

  for (let i = 0; i < contentSections.length; i++) {
    const section = contentSections[i]
    const pageNum = sectionStartPage + i

    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT_GRAY)
      doc.rect(margin, tocY - 5, contentWidth, 8, 'F')
    }

    // Section number — green, bold
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text(`${i + 1}.`, margin + 2, tocY)

    // Section title
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(section.title.replace(/^\d+\.\s*/, ''), margin + 12, tocY)

    // Dotted leader line
    const titleText = section.title.replace(/^\d+\.\s*/, '')
    doc.setFontSize(10)
    const titleW = doc.getTextWidth(titleText)
    const pageNumStr = String(pageNum)
    const pageNumW = doc.getTextWidth(pageNumStr)
    const leaderStart = margin + 12 + titleW + 3
    const leaderEnd = margin + contentWidth - pageNumW - 3

    doc.setTextColor(180, 180, 180)
    doc.setFontSize(9)
    // Draw dots manually
    let dotX = leaderStart
    while (dotX < leaderEnd - 3) {
      doc.text('.', dotX, tocY)
      dotX += 2.8
    }

    // Page number — right aligned, green
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text(pageNumStr, margin + contentWidth, tocY, { align: 'right' })

    doc.setTextColor(0, 0, 0)
    tocY += 9
  }

  // Appendices section in TOC
  if (options.appendices.length > 0) {
    tocY += 6
    doc.setDrawColor(...GREEN)
    doc.setLineWidth(0.4)
    doc.line(margin, tocY - 3, margin + contentWidth, tocY - 3)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text('APPENDICES', margin + 2, tocY + 3)
    tocY += 12

    const letters = 'ABCDEFGHIJ'
    for (let i = 0; i < options.appendices.length; i++) {
      const label = APPENDIX_LABELS[options.appendices[i]] || options.appendices[i]

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(`Appendix ${letters[i] || i + 1}`, margin + 8, tocY)
      doc.setTextColor(100, 100, 100)
      doc.text(label, margin + 36, tocY)
      tocY += 7
    }
  }

  // Footer on TOC page
  addFooter()

  // Yield to browser between sections so the UI stays responsive
  const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 0))

  // ===== REPORT SECTIONS (continuous flow) =====
  let y = newPage()

  for (const section of contentSections) {
    // Let the browser breathe between sections
    await yieldToBrowser()
    // Ensure at least 35mm space for a new section heading
    y = ensureSpace(y, 35)

    // Extra spacing between sections
    if (y > margin + 10) {
      y += 4
    }

    // Section title with green underline
    _curStyle = ''
    _curSize = 0
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

    // Parse and render content (Tiptap JSON → markdown if needed)
    const blocks = parseMarkdown(sectionContentToMarkdown(section.content))

    for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
      // Yield every 10 blocks to keep the UI responsive
      if (blockIdx > 0 && blockIdx % 10 === 0) await yieldToBrowser()

      const block = blocks[blockIdx]
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

        case 'image': {
          const imgData = await fetchImageAsBase64(block.src)
          if (imgData) {
            // Convert pixel dimensions to mm (assume 96 DPI: 1px ≈ 0.2646mm)
            const pxToMm = 0.2646
            const imgWmm = imgData.width * pxToMm
            const imgHmm = imgData.height * pxToMm

            // Scale to fit within content width and max 80mm height
            const maxW = contentWidth
            const maxH = 80
            const scale = Math.min(maxW / imgWmm, maxH / imgHmm, 1)
            const drawW = imgWmm * scale
            const drawH = imgHmm * scale

            y = ensureSpace(y, drawH + 12)
            doc.addImage(
              `data:image/jpeg;base64,${imgData.base64}`,
              'JPEG',
              margin,
              y,
              drawW,
              drawH
            )
            y += drawH + 2

            // Caption below image
            if (block.alt && block.alt !== 'Photo') {
              y = writePlainText(block.alt, margin, y, { fontSize: 9, italic: true })
            }
            y += paraSpacing
          }
          break
        }
      }
    }

    // Section spacing
    y += 4
  }

  // ===== APPENDICES =====
  if (options.appendices.length > 0) {
    const letters = 'ABCDEFGHIJ'
    const ad = options.appendixData

    for (let i = 0; i < options.appendices.length; i++) {
      const key = options.appendices[i]
      const label = APPENDIX_LABELS[key] || key

      // Each appendix starts on a new page
      y = newPage()

      // Appendix heading with green underline
      _curStyle = ''
      _curSize = 0
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(44, 82, 52)
      const headingText = `Appendix ${letters[i] || i + 1}: ${label}`
      doc.text(headingText, margin, y)
      const hw = doc.getTextWidth(headingText)
      doc.setDrawColor(44, 82, 52)
      doc.setLineWidth(0.4)
      doc.line(margin, y + 1.5, margin + hw, y + 1.5)
      doc.setDrawColor(0, 0, 0)
      doc.setTextColor(0, 0, 0)
      y += 10

      // --- Designated Sites table ---
      if (key === 'designated_sites' && ad && ad.designatedSites.length > 0) {
        await yieldToBrowser()
        const dsTable: MdTable = {
          type: 'table',
          headers: ['Name', 'Site Number', 'Distance', 'AI Summary'],
          rows: ad.designatedSites.map((s) => [
            s.name,
            `${s.siteNumber} (${s.siteType})`,
            s.distanceKm,
            s.aiSummary,
          ]),
        }
        y = renderTable(doc, dsTable, y, margin, contentWidth, ensureSpace, newPage)
        y += 4

        // --- Species Records table ---
      } else if (key === 'species_list' && ad && ad.speciesRecords.length > 0) {
        await yieldToBrowser()
        const spTable: MdTable = {
          type: 'table',
          headers: ['Name', 'AI Summary', 'Protection Status'],
          rows: ad.speciesRecords.map((s) => [s.name, s.aiSummary, s.protectionStatus]),
        }
        y = renderTable(doc, spTable, y, margin, contentWidth, ensureSpace, newPage)
        y += 4

        // --- Habitat Data table ---
      } else if (key === 'habitat_data' && ad && ad.habitats.length > 0) {
        await yieldToBrowser()
        const hTable: MdTable = {
          type: 'table',
          headers: ['Fossitt Code', 'Habitat Category', 'Area (ha)', '% Cover'],
          rows: ad.habitats.map((h) => [
            h.fossittCode,
            h.habitatName,
            h.areaHectares,
            h.percentCover,
          ]),
        }
        y = renderTable(doc, hTable, y, margin, contentWidth, ensureSpace, newPage)
        y += 4

        // --- Aquatic Features table ---
      } else if (key === 'aquatic_data' && ad && ad.aquaticFeatures.length > 0) {
        await yieldToBrowser()
        const aqTable: MdTable = {
          type: 'table',
          headers: ['Name', 'Type', 'WFD Status', 'Distance'],
          rows: ad.aquaticFeatures.map((a) => [a.name, a.waterBodyType, a.wfdStatus, a.distanceKm]),
        }
        y = renderTable(doc, aqTable, y, margin, contentWidth, ensureSpace, newPage)
        y += 4

        // --- Other appendices: placeholder ---
      } else if (
        (key !== 'designated_sites' &&
          key !== 'species_list' &&
          key !== 'habitat_data' &&
          key !== 'aquatic_data') ||
        !ad
      ) {
        y = writePlainText('[Content to be inserted]', margin, y, {
          fontSize: 10,
          italic: true,
        })
        y += 4
      }
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

/** Truncate text to fit within a given width (binary search instead of char-by-char) */
function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text

  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (doc.getTextWidth(text.slice(0, mid) + '...') <= maxWidth) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }
  return text.slice(0, lo) + '...'
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
      <div class="section-content">${markdownToHtml(sectionContentToMarkdown(s.content))}</div>
    </div>`
    )
    .join('\n')

  const ad = options.appendixData
  const appendicesHtml =
    options.appendices.length > 0
      ? `
    <div class="section">
      <h2>Appendices</h2>
      ${options.appendices
        .map((a, i) => {
          const label = APPENDIX_LABELS[a] || a
          const heading = `<h3>Appendix ${String.fromCharCode(65 + i)}: ${label}</h3>`

          if (a === 'designated_sites' && ad && ad.designatedSites.length > 0) {
            const rows = ad.designatedSites
              .map(
                (s) =>
                  `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(`${s.siteNumber} (${s.siteType})`)}</td><td>${escapeHtml(s.distanceKm)}</td><td>${escapeHtml(s.aiSummary)}</td></tr>`
              )
              .join('')
            return `${heading}<table><thead><tr><th>Name</th><th>Site Number</th><th>Distance</th><th>AI Summary</th></tr></thead><tbody>${rows}</tbody></table>`
          }

          if (a === 'species_list' && ad && ad.speciesRecords.length > 0) {
            const rows = ad.speciesRecords
              .map(
                (s) =>
                  `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.aiSummary)}</td><td>${escapeHtml(s.protectionStatus)}</td></tr>`
              )
              .join('')
            return `${heading}<table><thead><tr><th>Name</th><th>AI Summary</th><th>Protection Status</th></tr></thead><tbody>${rows}</tbody></table>`
          }

          if (a === 'habitat_data' && ad && ad.habitats.length > 0) {
            const rows = ad.habitats
              .map(
                (h) =>
                  `<tr><td>${escapeHtml(h.fossittCode)}</td><td>${escapeHtml(h.habitatName)}</td><td>${escapeHtml(h.areaHectares)}</td><td>${escapeHtml(h.percentCover)}</td></tr>`
              )
              .join('')
            return `${heading}<table><thead><tr><th>Fossitt Code</th><th>Habitat Category</th><th>Area (ha)</th><th>% Cover</th></tr></thead><tbody>${rows}</tbody></table>`
          }

          if (a === 'aquatic_data' && ad && ad.aquaticFeatures.length > 0) {
            const rows = ad.aquaticFeatures
              .map(
                (aq) =>
                  `<tr><td>${escapeHtml(aq.name)}</td><td>${escapeHtml(aq.waterBodyType)}</td><td>${escapeHtml(aq.wfdStatus)}</td><td>${escapeHtml(aq.distanceKm)}</td></tr>`
              )
              .join('')
            return `${heading}<table><thead><tr><th>Name</th><th>Type</th><th>WFD Status</th><th>Distance</th></tr></thead><tbody>${rows}</tbody></table>`
          }

          return `${heading}<p><em>[Content to be inserted]</em></p>`
        })
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
    <div class="title">${escapeHtml(
      options.activeSiteCode ? `${options.title} (Site: ${options.activeSiteCode})` : options.title
    )}</div>
    <div class="details">
      <div><strong>Prepared For:</strong> ${escapeHtml(options.preparedFor || 'Client')}</div>
      <div><strong>Site Reference:</strong> ${escapeHtml(
        options.activeSiteCode
          ? `${options.activeSiteCode} (filtered from project)`
          : options.siteCodes && options.siteCodes.length > 1
            ? options.siteCodes.join(', ')
            : options.siteCode
      )}</div>
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

  // Images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<figure><img src="$2" alt="$1" style="max-width:100%;height:auto;" /><figcaption><em>$1</em></figcaption></figure>'
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
