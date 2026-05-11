import type { jsPDF } from 'jspdf'
import type { MdTable } from './markdown-types'

interface TableTheme {
  font: 'helvetica' | 'times' | 'courier'
  primary: [number, number, number]
}

const DEFAULT_THEME: TableTheme = { font: 'helvetica', primary: [44, 82, 52] }

/**
 * Render a markdown table into a jsPDF doc.
 * - Header row uses theme.primary background.
 * - Alternating row backgrounds, primary-coloured bottom rule.
 * - Cell text wraps to fit column width; row height grows with content.
 * - Header is reprinted after a page break inside the table body.
 * - Markdown bold/italic markers in cells are stripped (rendered as plain text).
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

  const cellPaddingX = 3
  const cellPaddingY = 2
  const lineH = 4 // mm per text line at 9pt
  const minRowH = 8
  const fontSize = 9

  const cleanHeaders = table.headers.map(stripMarkdown)
  const cleanRows = table.rows.map((row) => row.map(stripMarkdown))

  const colWidths = calculateColumnWidths(
    doc,
    { type: 'table', headers: cleanHeaders, rows: cleanRows },
    contentWidth,
    fontSize,
    theme.font
  )

  let y = ensureSpace(startY, minRowH * 2 + 4)
  y += 2

  // Header — fires on first draw and after every page break inside the body.
  const drawHeader = (): number => {
    doc.setFillColor(...theme.primary)
    doc.rect(margin, y, contentWidth, minRowH, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(fontSize)
    doc.setFont(theme.font, 'bold')

    let headerX = margin
    for (let c = 0; c < colCount; c++) {
      const colW = colWidths[c]
      const wrapped = doc.splitTextToSize(
        cleanHeaders[c] || '',
        colW - cellPaddingX * 2
      ) as string[]
      // Headers stay single-line — use first wrapped line; minRowH guarantees fit.
      doc.text(wrapped[0] || '', headerX + cellPaddingX, y + minRowH - cellPaddingX)
      headerX += colW
    }

    y += minRowH
    doc.setTextColor(0, 0, 0)
    doc.setFont(theme.font, 'normal')
    return y
  }

  drawHeader()

  // Body
  doc.setFontSize(fontSize)

  for (let r = 0; r < cleanRows.length; r++) {
    const row = cleanRows[r]

    // Wrap each cell to its column width, then compute row height from the
    // tallest cell. Cap at 6 lines per cell to prevent an oversized cell
    // from blowing up a single row.
    const wrappedCells: string[][] = []
    let maxLines = 1
    doc.setFont(theme.font, 'normal')
    for (let c = 0; c < colCount; c++) {
      const colW = colWidths[c]
      const wrapped = doc.splitTextToSize(row[c] ?? '', colW - cellPaddingX * 2) as string[]
      const clipped = wrapped.slice(0, 6)
      if (wrapped.length > 6) clipped[5] = clipped[5].replace(/.{0,3}$/, '…')
      wrappedCells.push(clipped)
      if (clipped.length > maxLines) maxLines = clipped.length
    }

    const rowH = Math.max(minRowH, maxLines * lineH + cellPaddingY * 2)

    // Page break → reprint header on the new page.
    const yBefore = y
    y = ensureSpace(y, rowH)
    if (y !== yBefore) {
      drawHeader()
    }

    // Row background (zebra)
    if (r % 2 === 0) {
      doc.setFillColor(245, 247, 245)
      doc.rect(margin, y, contentWidth, rowH, 'F')
    }

    // Row border
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.rect(margin, y, contentWidth, rowH, 'S')

    // Cell content + vertical dividers
    let cellX = margin
    for (let c = 0; c < colCount; c++) {
      const colW = colWidths[c]
      if (c > 0) doc.line(cellX, y, cellX, y + rowH)

      doc.setFont(theme.font, 'normal')
      doc.setFontSize(fontSize)
      const lines = wrappedCells[c]
      lines.forEach((line, lineIdx) => {
        doc.text(line, cellX + cellPaddingX, y + cellPaddingY + lineH * (lineIdx + 1) - 1)
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

/**
 * Strip markdown bold/italic markers from a cell. The table renderer doesn't
 * yet do inline rich-text per cell (would require multi-style word layout
 * inside variable-height rows). Plain text with markers stripped is the
 * intermediate step — better than the raw asterix output users were seeing.
 */
function stripMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/_{2,}(.+?)_{2,}/g, '$1')
}

/** Calculate proportional column widths. Caps any single column at 40% of total
 *  so a verbose cell (long AI summary) can't squeeze every other column into
 *  unreadable strips. */
export function calculateColumnWidths(
  doc: jsPDF,
  table: MdTable,
  totalWidth: number,
  fontSize: number,
  font: 'helvetica' | 'times' | 'courier' = 'helvetica'
): number[] {
  doc.setFontSize(fontSize)

  const colCount = table.headers.length
  const minWidth = 18 // mm
  const maxColRatio = 0.4 // any single column ≤ 40% of total
  const maxColWidth = totalWidth * maxColRatio

  const desiredWidths: number[] = []

  for (let c = 0; c < colCount; c++) {
    doc.setFont(font, 'bold')
    let widest = doc.getTextWidth(table.headers[c] || '') + 6

    doc.setFont(font, 'normal')
    for (const row of table.rows) {
      // Use the first 60 chars to sample — long cells will wrap, no need to
      // measure their full one-line width.
      const sample = (row[c] || '').slice(0, 60)
      const cellW = doc.getTextWidth(sample) + 6
      if (cellW > widest) widest = cellW
    }

    desiredWidths.push(Math.min(Math.max(widest, minWidth), maxColWidth))
  }

  const sum = desiredWidths.reduce((a, b) => a + b, 0)
  if (sum <= totalWidth) {
    // Fits naturally — distribute remaining slack proportional to desired.
    if (sum < totalWidth) {
      const slack = totalWidth - sum
      return desiredWidths.map((w) => w + (slack * w) / sum)
    }
    return desiredWidths
  }

  // Scale down proportionally, then re-enforce min width if anything ducked below.
  let scaled = desiredWidths.map((w) => (w / sum) * totalWidth)
  const belowMin = scaled.filter((w) => w < minWidth)
  if (belowMin.length > 0) {
    const fixed = scaled.map((w) => Math.max(w, minWidth))
    const fixedSum = fixed.reduce((a, b) => a + b, 0)
    if (fixedSum > totalWidth) {
      // Last resort — uniform scale, accept some columns below minWidth.
      scaled = fixed.map((w) => (w / fixedSum) * totalWidth)
    } else {
      scaled = fixed
    }
  }
  return scaled
}

/** Truncate text to fit within a given width. Retained for any caller that
 *  still wants a single-line truncate (the table body now wraps instead). */
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
