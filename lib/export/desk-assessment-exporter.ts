import { jsPDF } from 'jspdf'
import type { BaselineExportData } from './baseline-report-exporter'

// ── Shared helpers ──────────────────────────────────────────────────────────

function stripMarkdown(md: string): string {
  return md
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
}

function weightsToWidths(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => (w / sum) * total)
}

// ── PDF Export ──────────────────────────────────────────────────────────────

export function exportDeskAssessmentPdf(data: BaselineExportData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 15
  const usable = pageW - margin * 2
  const lineH = 4 // mm per text line at 9pt body
  const cellPadX = 2 // mm horizontal padding inside cells
  const cellPadY = 1.5 // mm vertical padding inside cells
  const headerH = 7 // mm table header row height
  let y = 20

  // Returns true if a page break happened.
  const ensureSpace = (needed: number): boolean => {
    if (y + needed > pageH - 15) {
      doc.addPage()
      y = 20
      return true
    }
    return false
  }

  // ── Title ──
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Desk Assessment Report', margin, y)
  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.projectName}  |  Site Code: ${data.siteCode}  |  ${data.date}`, margin, y)
  y += 10

  // ── AI Insights ──
  if (data.aiInsights) {
    ensureSpace(14)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Ecological Summary', margin, y)
    y += 7
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    for (const line of data.aiInsights.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) {
        y += 3
        continue
      }

      if (trimmed.startsWith('## ')) {
        // Avoid orphan headings — reserve room for heading + 2 lines below.
        ensureSpace(18)
        y += 3
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(trimmed.slice(3), margin, y)
        y += 6
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        continue
      }

      if (trimmed.startsWith('- ')) {
        const text = stripMarkdown(trimmed.slice(2))
        const wrapped = doc.splitTextToSize(`•  ${text}`, usable - 5)
        ensureSpace(wrapped.length * 4.5)
        doc.text(wrapped, margin + 3, y)
        y += wrapped.length * 4.5
        continue
      }

      const plain = stripMarkdown(trimmed)
      const wrapped = doc.splitTextToSize(plain, usable)
      ensureSpace(wrapped.length * 4.5 + 1)
      doc.text(wrapped, margin, y)
      y += wrapped.length * 4.5 + 1 // small paragraph gap
    }

    y += 5
  }

  // ── Table helper ──
  // weights: relative column widths (e.g. [4, 1, 1, 1, 1])
  const drawTable = (title: string, headers: string[], rows: string[][], weights: number[]) => {
    // Title — reserve enough space for title + header + first row.
    ensureSpace(20)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin, y)
    y += 6

    if (rows.length === 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.text('No data available.', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      return
    }

    doc.setFontSize(9)
    const widths = weightsToWidths(weights, usable)
    const offsets = widths.reduce<number[]>((acc, w, i) => {
      acc.push(i === 0 ? margin : acc[i - 1] + widths[i - 1])
      return acc
    }, [])

    const drawHeader = () => {
      doc.setFont('helvetica', 'bold')
      doc.setFillColor(243, 244, 246) // gray-100
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.1)
      doc.rect(margin, y, usable, headerH, 'FD')
      headers.forEach((h, i) => {
        doc.text(h, offsets[i] + cellPadX, y + headerH - 2)
      })
      y += headerH
      doc.setFont('helvetica', 'normal')
    }

    drawHeader()

    for (const row of rows) {
      // Wrap each cell to its column width.
      const wrappedCells = row.map((cell, i) =>
        doc.splitTextToSize(cell ?? '', widths[i] - cellPadX * 2)
      )
      const maxLines = Math.max(1, ...wrappedCells.map((w) => w.length))
      const rowH = maxLines * lineH + cellPadY * 2

      // Page break inside table → reprint header.
      if (ensureSpace(rowH)) {
        // Re-state the table title context on the new page so the user knows
        // which table this is.
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${title} (continued)`, margin, y)
        y += 5
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        drawHeader()
      }

      // Cell borders.
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.1)
      widths.forEach((w, i) => {
        doc.rect(offsets[i], y, w, rowH)
      })

      // Cell text — top-aligned with padding.
      wrappedCells.forEach((wrapped, i) => {
        doc.text(wrapped, offsets[i] + cellPadX, y + cellPadY + lineH - 1)
      })

      y += rowH
    }

    y += 6
  }

  // ── Baseline tables ──
  drawTable(
    '1. Designated Sites',
    ['Site Name', 'Code', 'Type', 'Area', 'Dist (km)'],
    data.designatedSites.map((s) => [s.name, s.code, s.type, s.area, s.distance]),
    [45, 14, 15, 13, 13]
  )

  drawTable(
    '2. Species Records',
    ['Species', 'Taxon', 'Source', 'Protected', 'Records'],
    data.speciesRecords.map((s) => [
      s.name,
      s.taxon,
      s.source.toUpperCase(),
      s.protected ? 'Yes' : 'No',
      String(s.records),
    ]),
    [40, 22, 14, 12, 12]
  )

  drawTable(
    '3. Preliminary Habitat Inventory',
    ['FOSSITT', 'Habitat', 'NLC Label', 'Area (ha)', '%'],
    data.habitatTypes.map((h) => [
      h.fossittCode,
      h.name,
      h.nlcLabel,
      h.areaHa.toFixed(1),
      h.percentage.toFixed(1) + '%',
    ]),
    [12, 25, 38, 13, 12]
  )

  drawTable(
    '4. Aquatic Environment',
    ['Name', 'Type', 'WFD Status', 'Dist (km)'],
    data.waterBodies.map((w) => [w.name, w.type, w.wfdStatus, w.distance]),
    [45, 20, 20, 15]
  )

  drawTable(
    '5. Constraints Summary',
    ['Finding', 'Type', 'Source', 'Constraint'],
    data.constraints.map((c) => [c.finding, c.type, c.source.toUpperCase(), c.constraint]),
    [25, 15, 15, 45]
  )

  // ── Map images ──
  if (data.mapImages && data.mapImages.length > 0) {
    doc.addPage()
    y = 20
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Maps', margin, y)
    y += 8

    for (const img of data.mapImages) {
      try {
        const imgWidth = usable
        const imgHeight = imgWidth * 0.6
        ensureSpace(imgHeight + 12)
        doc.addImage(img.dataUrl, 'JPEG', margin, y, imgWidth, imgHeight)
        y += imgHeight + 2
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.text(img.label, margin, y)
        y += 8
        doc.setFont('helvetica', 'normal')
      } catch {
        // Skip images that fail to embed
      }
    }
  }

  doc.save(`desk-assessment-${data.projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

// ── DOCX Export ─────────────────────────────────────────────────────────────

export async function exportDeskAssessmentDocx(data: BaselineExportData) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    ImageRun,
  } = await import('docx')

  // A4 portrait with 1" margins = 12240 dxa total − 2880 dxa margins = 9360 dxa content.
  const CONTENT_WIDTH_DXA = 9360
  const BODY_SIZE = 22 // half-points → 11pt
  const HEADER_TABLE_SIZE = 22 // half-points → 11pt bold

  const borderProps = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }
  const tableBorders = {
    top: borderProps,
    bottom: borderProps,
    left: borderProps,
    right: borderProps,
    insideHorizontal: borderProps,
    insideVertical: borderProps,
  }
  const cellMargins = { top: 80, bottom: 80, left: 100, right: 100 }

  const children: InstanceType<typeof Paragraph | typeof Table>[] = []

  // ── Title ──
  children.push(
    new Paragraph({
      text: 'Desk Assessment Report',
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    })
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: data.projectName, italics: true, size: BODY_SIZE }),
        new TextRun({
          text: `  •  Site Code: ${data.siteCode}  •  ${data.date}`,
          italics: true,
          size: BODY_SIZE,
        }),
      ],
      spacing: { after: 240 },
    })
  )

  // ── AI Insights ──
  if (data.aiInsights) {
    children.push(
      new Paragraph({
        text: 'Ecological Summary',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 180 },
      })
    )

    for (const line of data.aiInsights.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) {
        children.push(new Paragraph({ text: '' }))
        continue
      }

      if (trimmed.startsWith('## ')) {
        children.push(
          new Paragraph({
            text: trimmed.slice(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          })
        )
        continue
      }

      if (trimmed.startsWith('- ')) {
        const bulletText = stripMarkdown(trimmed.slice(2))
        const runs: InstanceType<typeof TextRun>[] = []
        const parts = bulletText.split(/(\*\*.*?\*\*)/)
        for (const part of parts) {
          if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: BODY_SIZE }))
          } else {
            runs.push(new TextRun({ text: part, size: BODY_SIZE }))
          }
        }
        children.push(
          new Paragraph({
            children: runs,
            bullet: { level: 0 },
            spacing: { after: 80 },
          })
        )
        continue
      }

      // Body paragraph — bold-aware, not forced-italic.
      const plain = trimmed
      const runs: InstanceType<typeof TextRun>[] = []
      const parts = plain.split(/(\*\*.*?\*\*)/)
      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: BODY_SIZE }))
        } else {
          runs.push(new TextRun({ text: stripMarkdown(part), size: BODY_SIZE }))
        }
      }
      children.push(
        new Paragraph({
          children: runs,
          spacing: { after: 120 },
        })
      )
    }
  }

  // ── Table helper ──
  const addDocxTable = (title: string, headers: string[], rows: string[][], weights: number[]) => {
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 180 },
      })
    )

    if (rows.length === 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'No data available.', italics: true, size: BODY_SIZE })],
        })
      )
      return
    }

    const sum = weights.reduce((a, b) => a + b, 0)
    const colWidths = weights.map((w) => Math.floor((w / sum) * CONTENT_WIDTH_DXA))

    const makeCell = (text: string, widthDxa: number, bold = false) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold, size: bold ? HEADER_TABLE_SIZE : BODY_SIZE })],
          }),
        ],
        width: { size: widthDxa, type: WidthType.DXA },
        margins: cellMargins,
      })

    const headerRow = new TableRow({
      children: headers.map((h, i) => makeCell(h, colWidths[i], true)),
      tableHeader: true,
    })

    const dataRows = rows.map(
      (row) =>
        new TableRow({
          children: row.map((cell, i) => makeCell(cell, colWidths[i])),
        })
    )

    children.push(
      new Table({
        rows: [headerRow, ...dataRows],
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: colWidths,
        borders: tableBorders,
      })
    )
  }

  // ── Baseline tables ──
  addDocxTable(
    '1. Designated Sites',
    ['Site Name', 'Code', 'Type', 'Area', 'Distance (km)'],
    data.designatedSites.map((s) => [s.name, s.code, s.type, s.area, s.distance]),
    [45, 14, 15, 13, 13]
  )

  addDocxTable(
    '2. Species Records',
    ['Species', 'Taxon Group', 'Source', 'Protected', 'Records'],
    data.speciesRecords.map((s) => [
      s.name,
      s.taxon,
      s.source.toUpperCase(),
      s.protected ? 'Yes' : 'No',
      String(s.records),
    ]),
    [40, 22, 14, 12, 12]
  )

  addDocxTable(
    '3. Preliminary Habitat Inventory',
    ['FOSSITT Code', 'Habitat Name', 'NLC Label', 'Area (ha)', '%'],
    data.habitatTypes.map((h) => [
      h.fossittCode,
      h.name,
      h.nlcLabel,
      h.areaHa.toFixed(1),
      h.percentage.toFixed(1) + '%',
    ]),
    [12, 25, 38, 13, 12]
  )

  addDocxTable(
    '4. Aquatic Environment',
    ['Name', 'Type', 'WFD Status', 'Distance (km)'],
    data.waterBodies.map((w) => [w.name, w.type, w.wfdStatus, w.distance]),
    [45, 20, 20, 15]
  )

  addDocxTable(
    '5. Constraints Summary',
    ['Finding', 'Type', 'Source', 'Constraint'],
    data.constraints.map((c) => [c.finding, c.type, c.source.toUpperCase(), c.constraint]),
    [25, 15, 15, 45]
  )

  // ── Map images ──
  if (data.mapImages && data.mapImages.length > 0) {
    children.push(
      new Paragraph({
        text: 'Maps',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 180 },
      })
    )

    // A4 portrait with 1" margins → content ≈ 6.5" × 96 dpi = 624 px wide.
    // Cap at 600 px so any docx renderer (Word, LibreOffice, Pages) stays
    // inside the right margin even with subpixel rendering differences.
    const MAX_IMG_WIDTH_PX = 600
    const FALLBACK_ASPECT = 5 / 3 // matches the Step 5 screenshot capture default

    const readDimensions = (dataUrl: string): Promise<{ w: number; h: number }> =>
      new Promise((resolve) => {
        const im = new Image()
        im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight })
        im.onerror = () =>
          resolve({ w: MAX_IMG_WIDTH_PX, h: Math.round(MAX_IMG_WIDTH_PX / FALLBACK_ASPECT) })
        im.src = dataUrl
      })

    for (const img of data.mapImages) {
      try {
        const base64Match = img.dataUrl.match(/^data:image\/\w+;base64,(.+)$/)
        if (!base64Match) continue

        const imageBuffer = Uint8Array.from(atob(base64Match[1]), (c) => c.charCodeAt(0))

        // Preserve natural aspect ratio; scale down to MAX_IMG_WIDTH_PX if wider.
        const dims = await readDimensions(img.dataUrl)
        const scale = dims.w > MAX_IMG_WIDTH_PX ? MAX_IMG_WIDTH_PX / dims.w : 1
        const renderWidth = Math.round(dims.w * scale)
        const renderHeight = Math.round(dims.h * scale)

        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: { width: renderWidth, height: renderHeight },
                type: 'jpg',
              }),
            ],
            spacing: { after: 80 },
          })
        )
        children.push(
          new Paragraph({
            children: [new TextRun({ text: img.label, italics: true, size: 20 })],
            spacing: { after: 200 },
          })
        )
      } catch {
        // Skip images that fail to embed
      }
    }
  }

  const docFile = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(docFile)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `desk-assessment-${data.projectName.replace(/\s+/g, '-').toLowerCase()}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
