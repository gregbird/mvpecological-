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
  // Supports multi-line headers: when a header text doesn't fit one line at
  // the column width, it wraps and the header band grows to fit the tallest
  // wrapped header (Survey Table's 6 narrow columns force "Recorder/Surveyor"
  // and "Weather Conditions" to wrap; previously only line 1 was shown).
  const drawHeader = (): number => {
    doc.setFontSize(fontSize)
    doc.setFont(theme.font, 'bold')

    const wrappedHeaders: string[][] = []
    let maxLines = 1
    for (let c = 0; c < colCount; c++) {
      const wrapped = doc.splitTextToSize(
        cleanHeaders[c] || '',
        colWidths[c] - cellPaddingX * 2
      ) as string[]
      wrappedHeaders.push(wrapped)
      if (wrapped.length > maxLines) maxLines = wrapped.length
    }
    const headerH = Math.max(minRowH, maxLines * lineH + cellPaddingY * 2)

    doc.setFillColor(...theme.primary)
    doc.rect(margin, y, contentWidth, headerH, 'F')
    doc.setTextColor(255, 255, 255)

    let headerX = margin
    for (let c = 0; c < colCount; c++) {
      const lines = wrappedHeaders[c]
      lines.forEach((line, lineIdx) => {
        doc.text(line, headerX + cellPaddingX, y + cellPaddingY + lineH * (lineIdx + 1) - 1)
      })
      headerX += colWidths[c]
    }

    y += headerH
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
    // tallest cell. No truncation — long cells just grow the row.
    const wrappedCells: string[][] = []
    let maxLines = 1
    doc.setFont(theme.font, 'normal')
    for (let c = 0; c < colCount; c++) {
      const colW = colWidths[c]
      const wrapped = doc.splitTextToSize(row[c] ?? '', colW - cellPaddingX * 2) as string[]
      wrappedCells.push(wrapped)
      if (wrapped.length > maxLines) maxLines = wrapped.length
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
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_]+?)_(?!_)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

/** Calculate proportional column widths.
 *  Header width is a hard floor — column must be wide enough to fit its header
 *  on one line (with padding). Cell content can wrap, so cell sample width is
 *  a soft preference. Caps any single column at 50% of total so a verbose cell
 *  (long AI summary) can't squeeze others into unreadable strips.
 *
 *  ALSO: per-column longest-word floor. jsPDF's splitTextToSize falls back to
 *  CHARACTER-by-character splitting when a single token is wider than the
 *  cell width — that's how S-P-R tables ended up with "A H A S C R A G H 0 1 0"
 *  garbage. The longest-word floor ensures the narrowest column can still fit
 *  its longest unbreakable token (e.g. "AHASCRAGH010", "IE_SH_26A010050") so
 *  the wrap stays on word boundaries. Capped at maxColWidth — if a single
 *  word truly exceeds 50% of total table width, character-split is preferable
 *  to one column eating the entire row. */
export function calculateColumnWidths(
  doc: jsPDF,
  table: MdTable,
  totalWidth: number,
  fontSize: number,
  font: 'helvetica' | 'times' | 'courier' = 'helvetica'
): number[] {
  doc.setFontSize(fontSize)

  const colCount = table.headers.length
  const cellPad = 3 // mm — must match renderTable cellPaddingX
  const headerSlack = 3 // mm extra buffer to avoid mid-glyph clipping
  const absMin = 14 // mm absolute lower bound
  const maxColRatio = 0.5
  const maxColWidth = totalWidth * maxColRatio

  // Header floor — column MUST fit its header on one line.
  const headerFloors: number[] = []
  const desiredWidths: number[] = []

  for (let c = 0; c < colCount; c++) {
    doc.setFont(font, 'bold')
    const headerW = doc.getTextWidth(table.headers[c] || '') + cellPad * 2 + headerSlack
    headerFloors.push(Math.max(headerW, absMin))

    doc.setFont(font, 'normal')
    let widest = headerW
    let longestWordW = 0
    for (const row of table.rows) {
      const cell = row[c] || ''
      const sample = cell.slice(0, 60)
      const cellW = doc.getTextWidth(sample) + cellPad * 2
      if (cellW > widest) widest = cellW
      // Longest single token in this cell (split on whitespace AND hyphens
      // so "AHASCRAGH_010" still measures as one token, but a hyphenated
      // English phrase like "well-known" can break at the hyphen).
      for (const token of cell.split(/\s+/)) {
        if (!token) continue
        const tokenW = doc.getTextWidth(token) + cellPad * 2 + headerSlack
        if (tokenW > longestWordW) longestWordW = tokenW
      }
    }

    // Promote the header floor if a long unbreakable word demands more
    // space — but never exceed maxColWidth (otherwise a runaway cell could
    // wipe out adjacent columns).
    headerFloors[c] = Math.min(maxColWidth, Math.max(headerFloors[c], longestWordW))
    desiredWidths.push(Math.min(Math.max(widest, headerFloors[c]), maxColWidth))
  }

  // Cap header floors to maxColWidth so a single absurdly long header can't
  // monopolise the table — it will wrap (header reprint accepts only line 1
  // but that's already a degraded edge case for >50%-of-table headers).
  const cappedFloors = headerFloors.map((w) => Math.min(w, maxColWidth))
  const floorSum = cappedFloors.reduce((a, b) => a + b, 0)

  // If header floors alone exceed totalWidth, scale them proportionally —
  // worst case, some headers wrap (visible as first line only). Body cells
  // get the same widths.
  if (floorSum > totalWidth) {
    return cappedFloors.map((w) => (w / floorSum) * totalWidth)
  }

  const sum = desiredWidths.reduce((a, b) => a + b, 0)
  if (sum <= totalWidth) {
    // Fits naturally — slack goes to columns proportional to desired width,
    // but always above their header floor.
    const widths = desiredWidths.map((w) => w)
    if (sum < totalWidth) {
      const slack = totalWidth - sum
      for (let c = 0; c < colCount; c++) {
        widths[c] += (slack * desiredWidths[c]) / sum
      }
    }
    return widths.map((w, c) => Math.max(w, cappedFloors[c]))
  }

  // Sum exceeds totalWidth — header floors take priority, remaining space
  // distributes proportional to (desired - floor) above floor.
  const surplus = totalWidth - floorSum
  const overflow = desiredWidths.map((w, c) => Math.max(0, w - cappedFloors[c]))
  const overflowSum = overflow.reduce((a, b) => a + b, 0)
  if (overflowSum === 0) return cappedFloors
  return cappedFloors.map((floor, c) => floor + (surplus * overflow[c]) / overflowSum)
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
