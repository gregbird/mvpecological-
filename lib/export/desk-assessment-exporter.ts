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

// ── PDF Export ──────────────────────────────────────────────────────────────

export function exportDeskAssessmentPdf(data: BaselineExportData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 15
  const usable = pageW - margin * 2
  let y = 20

  const addPage = (needed: number) => {
    if (y + needed > pageH - 15) {
      doc.addPage()
      y = 20
    }
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
    addPage(12)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Ecological Summary', margin, y)
    y += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    for (const line of data.aiInsights.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) {
        y += 3
        continue
      }

      if (trimmed.startsWith('## ')) {
        addPage(12)
        y += 4
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(trimmed.slice(3), margin, y)
        y += 7
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        continue
      }

      if (trimmed.startsWith('- ')) {
        const text = stripMarkdown(trimmed.slice(2))
        const wrapped = doc.splitTextToSize(`•  ${text}`, usable - 5)
        addPage(wrapped.length * 4.5)
        doc.text(wrapped, margin + 3, y)
        y += wrapped.length * 4.5
        continue
      }

      const plain = stripMarkdown(trimmed)
      doc.setFont('helvetica', 'italic')
      const wrapped = doc.splitTextToSize(plain, usable)
      addPage(wrapped.length * 4.5)
      doc.text(wrapped, margin, y)
      y += wrapped.length * 4.5
      doc.setFont('helvetica', 'normal')
    }

    y += 6
  }

  // ── Table helper ──
  const drawTable = (title: string, headers: string[], rows: string[][]) => {
    addPage(20)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin, y)
    y += 7
    doc.setFontSize(9)

    if (rows.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.text('No data available.', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      return
    }

    const colW = usable / headers.length

    // Header row
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(249, 250, 251)
    doc.rect(margin, y - 3.5, usable, 5, 'F')
    headers.forEach((h, i) => doc.text(h, margin + i * colW + 1, y))
    y += 5

    // Data rows
    doc.setFont('helvetica', 'normal')
    for (const row of rows) {
      addPage(6)
      row.forEach((cell, i) => {
        const truncated = cell.length > 30 ? cell.slice(0, 28) + '…' : cell
        doc.text(truncated, margin + i * colW + 1, y)
      })
      y += 4.5
    }

    y += 4
  }

  // ── Baseline tables ──
  drawTable(
    '1. Designated Sites',
    ['Site Name', 'Code', 'Type', 'Area', 'Dist (km)'],
    data.designatedSites.map((s) => [s.name, s.code, s.type, s.area, s.distance])
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
    ])
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
    ])
  )

  drawTable(
    '4. Aquatic Environment',
    ['Name', 'Type', 'WFD Status', 'Dist (km)'],
    data.waterBodies.map((w) => [w.name, w.type, w.wfdStatus, w.distance])
  )

  drawTable(
    '5. Constraints Summary',
    ['Finding', 'Type', 'Source', 'Constraint'],
    data.constraints.map((c) => [c.finding, c.type, c.source.toUpperCase(), c.constraint])
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
        addPage(imgHeight + 12)
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
    ImageRun,
  } = await import('docx')

  const children: InstanceType<typeof Paragraph | typeof Table>[] = []

  // ── Title ──
  children.push(
    new Paragraph({
      text: 'Desk Assessment Report',
      heading: HeadingLevel.TITLE,
    })
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: data.projectName, italics: true }),
        new TextRun({
          text: `  •  Site Code: ${data.siteCode}  •  ${data.date}`,
          italics: true,
        }),
      ],
    })
  )
  children.push(new Paragraph({ text: '' }))

  // ── AI Insights ──
  if (data.aiInsights) {
    children.push(
      new Paragraph({
        text: 'Ecological Summary',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240 },
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
            spacing: { before: 240 },
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
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
          } else {
            runs.push(new TextRun({ text: part }))
          }
        }
        children.push(new Paragraph({ children: runs, bullet: { level: 0 } }))
        continue
      }

      children.push(
        new Paragraph({
          children: [new TextRun({ text: stripMarkdown(trimmed), italics: true })],
        })
      )
    }

    children.push(new Paragraph({ text: '' }))
  }

  // ── Table helper ──
  const addDocxTable = (title: string, headers: string[], rows: string[][]) => {
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360 },
      })
    )

    if (rows.length === 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'No data available.', italics: true })],
        })
      )
      return
    }

    // A4 portrait content width ≈ 8640 dxa with default margins. Distribute
    // evenly via DXA so cells render correctly in Word/Pages/LibreOffice.
    const CONTENT_WIDTH_DXA = 8640
    const colWidthDxa = Math.floor(CONTENT_WIDTH_DXA / headers.length)
    const columnWidths = new Array(headers.length).fill(colWidthDxa)

    const makeCell = (text: string, bold = false) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold, size: 18 })],
          }),
        ],
        width: { size: colWidthDxa, type: WidthType.DXA },
      })

    const headerRow = new TableRow({
      children: headers.map((h) => makeCell(h, true)),
      tableHeader: true,
    })

    const dataRows = rows.map(
      (row) =>
        new TableRow({
          children: row.map((cell) => makeCell(cell)),
        })
    )

    children.push(
      new Table({
        rows: [headerRow, ...dataRows],
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        columnWidths,
      })
    )
  }

  // ── Baseline tables ──
  addDocxTable(
    '1. Designated Sites',
    ['Site Name', 'Code', 'Type', 'Area', 'Distance (km)'],
    data.designatedSites.map((s) => [s.name, s.code, s.type, s.area, s.distance])
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
    ])
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
    ])
  )

  addDocxTable(
    '4. Aquatic Environment',
    ['Name', 'Type', 'WFD Status', 'Distance (km)'],
    data.waterBodies.map((w) => [w.name, w.type, w.wfdStatus, w.distance])
  )

  addDocxTable(
    '5. Constraints Summary',
    ['Finding', 'Type', 'Source', 'Constraint'],
    data.constraints.map((c) => [c.finding, c.type, c.source.toUpperCase(), c.constraint])
  )

  // ── Map images ──
  if (data.mapImages && data.mapImages.length > 0) {
    children.push(
      new Paragraph({
        text: 'Maps',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360 },
      })
    )

    for (const img of data.mapImages) {
      try {
        // Extract base64 data from data URL
        const base64Match = img.dataUrl.match(/^data:image\/\w+;base64,(.+)$/)
        if (!base64Match) continue

        const imageBuffer = Uint8Array.from(atob(base64Match[1]), (c) => c.charCodeAt(0))
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: { width: 600, height: 360 },
                type: 'jpg',
              }),
            ],
          })
        )
        children.push(
          new Paragraph({
            children: [new TextRun({ text: img.label, italics: true, size: 18 })],
          })
        )
        children.push(new Paragraph({ text: '' }))
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
