import type { jsPDF } from 'jspdf'
import type { MdTable } from './markdown-types'

interface TableTheme {
  font: 'helvetica' | 'times' | 'courier'
  primary: [number, number, number]
}

const DEFAULT_THEME: TableTheme = { font: 'helvetica', primary: [44, 82, 52] }

/**
 * Strip markdown bold/italic/code markers from a table cell — jsPDF text
 * rendering treats `**Parameter**` as a literal string and we don't have a
 * mechanism to switch fonts mid-cell, so plain text is the safest output.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_]+?)_(?!_)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

/**
 * Render a markdown table into a jsPDF doc.
 * - Header row uses theme.primary background.
 * - Alternating row backgrounds, primary-coloured bottom rule.
 * - Cell text is truncated (binary-searched) when too wide.
 */
export function renderTable(
  doc: jsPDF,
  table: MdTable,
  startY: number,
  margin: number,
  contentWidth: number,
  ensureSpace: (y: number, needed: number) => number,
  _newPage: () => number,
  theme: TableTheme = DEFAULT_THEME
): number {
  const colCount = table.headers.length
  if (colCount === 0) return startY

  const cellPadding = 3
  const fontSize = 9
  const lineHeight = 4 // mm per text line at fontSize 9
  const minRowHeight = 8

  const colWidths = calculateColumnWidths(doc, table, contentWidth, fontSize, theme.font)

  // Pre-wrap every cell so we know the row height ahead of drawing.
  doc.setFontSize(fontSize)
  doc.setFont(theme.font, 'bold')
  const headerLines: string[][] = table.headers.map((h, c) =>
    doc.splitTextToSize(stripMarkdown(h || ''), colWidths[c] - cellPadding * 2)
  )
  const headerRowHeight = Math.max(
    minRowHeight,
    Math.max(...headerLines.map((l) => l.length)) * lineHeight + cellPadding * 2
  )

  doc.setFont(theme.font, 'normal')
  const bodyLines: string[][][] = table.rows.map((row) =>
    row.map((cell, c) =>
      doc.splitTextToSize(stripMarkdown(cell || ''), colWidths[c] - cellPadding * 2)
    )
  )
  const bodyRowHeights = bodyLines.map((row) =>
    Math.max(minRowHeight, Math.max(...row.map((l) => l.length)) * lineHeight + cellPadding * 2)
  )

  let y = ensureSpace(startY, headerRowHeight + bodyRowHeights[0] + 4)
  y += 2

  // Header row — primary brand colour background
  doc.setFillColor(...theme.primary)
  doc.rect(margin, y, contentWidth, headerRowHeight, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(fontSize)
  doc.setFont(theme.font, 'bold')

  let headerX = margin
  for (let c = 0; c < colCount; c++) {
    const colW = colWidths[c]
    const lines = headerLines[c]
    lines.forEach((line, idx) => {
      doc.text(line, headerX + cellPadding, y + cellPadding + (idx + 1) * lineHeight - 1)
    })
    headerX += colW
  }

  y += headerRowHeight

  // Body rows
  doc.setTextColor(0, 0, 0)
  doc.setFont(theme.font, 'normal')
  doc.setFontSize(fontSize)

  for (let r = 0; r < table.rows.length; r++) {
    const rowH = bodyRowHeights[r]
    y = ensureSpace(y, rowH)

    if (r % 2 === 0) {
      doc.setFillColor(245, 247, 245)
      doc.rect(margin, y, contentWidth, rowH, 'F')
    }

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.rect(margin, y, contentWidth, rowH, 'S')

    let cellX = margin
    for (let c = 0; c < colCount; c++) {
      const colW = colWidths[c]
      if (c > 0) doc.line(cellX, y, cellX, y + rowH)
      doc.setFont(theme.font, 'normal')
      doc.setFontSize(fontSize)
      const lines = bodyLines[r][c]
      lines.forEach((line, idx) => {
        doc.text(line, cellX + cellPadding, y + cellPadding + (idx + 1) * lineHeight - 1)
      })
      cellX += colW
    }

    y += rowH
  }

  doc.setDrawColor(...theme.primary)
  doc.setLineWidth(0.3)
  doc.line(margin, y, margin + contentWidth, y)

  doc.setDrawColor(0, 0, 0)
  return y + 2
}

/** Calculate proportional column widths based on content */
export function calculateColumnWidths(
  doc: jsPDF,
  table: MdTable,
  totalWidth: number,
  fontSize: number,
  font: 'helvetica' | 'times' | 'courier' = 'helvetica'
): number[] {
  doc.setFontSize(fontSize)

  const colCount = table.headers.length
  const minWidth = 20
  const maxWidths: number[] = []

  for (let c = 0; c < colCount; c++) {
    doc.setFont(font, 'bold')
    let maxW = doc.getTextWidth(table.headers[c] || '') + 10

    doc.setFont(font, 'normal')
    for (const row of table.rows) {
      const cellW = doc.getTextWidth(row[c] || '') + 10
      maxW = Math.max(maxW, cellW)
    }

    maxWidths.push(Math.max(maxW, minWidth))
  }

  const sum = maxWidths.reduce((a, b) => a + b, 0)
  return maxWidths.map((w) => Math.max((w / sum) * totalWidth, minWidth))
}

/** Truncate text to fit within a given width (binary search instead of char-by-char) */
export function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
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
