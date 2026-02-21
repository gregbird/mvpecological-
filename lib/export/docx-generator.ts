'use client'

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  PageBreak,
  UnderlineType,
} from 'docx'
import type { PeaExportOptions } from './pdf-generator'
import { fetchImageAsBuffer } from './image-utils'

// ============================================================
// Markdown → docx block types
// ============================================================

interface MdHeading {
  type: 'heading'
  level: number
  text: string
}
interface MdParagraph {
  type: 'paragraph'
  runs: RunSpec[]
}
interface MdBullet {
  type: 'bullet'
  runs: RunSpec[]
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

type MdBlock = MdHeading | MdParagraph | MdBullet | MdTable | MdImage

interface RunSpec {
  text: string
  bold: boolean
  italic: boolean
}

// ============================================================
// Markdown parser
// ============================================================

function parseInline(text: string): RunSpec[] {
  const runs: RunSpec[] = []
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, match.index), bold: false, italic: false })
    }
    if (match[2]) {
      runs.push({ text: match[2], bold: true, italic: true })
    } else if (match[3]) {
      runs.push({ text: match[3], bold: true, italic: false })
    } else if (match[4]) {
      runs.push({ text: match[4], bold: false, italic: true })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex), bold: false, italic: false })
  }

  if (runs.length === 0) {
    runs.push({ text, bold: false, italic: false })
  }

  return runs
}

function parseMarkdown(md: string): MdBlock[] {
  const blocks: MdBlock[] = []
  const lines = md.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

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

    // Table: line starts with | and next line is separator
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      /^\|[\s-:|]+\|$/.test(lines[i + 1].trim())
    ) {
      const headers = line
        .split('|')
        .filter((c) => c.trim())
        .map((c) => c.trim())
      i += 2

      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i]
          .split('|')
          .filter((c) => c.trim())
          .map((c) => c.trim())
        rows.push(cells)
        i++
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() })
      i++
      continue
    }

    // Bullet
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)$/) || line.match(/^(\s*)\d+\.\s+(.+)$/)
    if (bulletMatch) {
      const indent = Math.floor((bulletMatch[1] || '').length / 2)
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
      blocks.push({ type: 'bullet', runs: parseInline(bulletText.join(' ')), indent })
      i++
      continue
    }

    // Paragraph
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
      blocks.push({ type: 'paragraph', runs: parseInline(paraLines.join(' ')) })
    }
  }

  return blocks
}

// ============================================================
// Block → docx Paragraph converters
// ============================================================

const DARK_GREEN = '2C5234'
const TABLE_STRIPE = 'F5F7F5'

function runsToTextRuns(runs: RunSpec[], overrideColor?: string): TextRun[] {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold,
        italics: r.italic,
        ...(overrideColor ? { color: overrideColor } : {}),
      })
  )
}

async function blockToParagraphs(block: MdBlock): Promise<(Paragraph | Table)[]> {
  switch (block.type) {
    case 'heading': {
      const level =
        block.level === 1
          ? HeadingLevel.HEADING_1
          : block.level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3
      return [
        new Paragraph({
          text: block.text,
          heading: level,
          spacing: { before: 240, after: 120 },
        }),
      ]
    }

    case 'paragraph':
      return [
        new Paragraph({
          children: runsToTextRuns(block.runs),
          spacing: { after: 120 },
        }),
      ]

    case 'bullet':
      return [
        new Paragraph({
          children: runsToTextRuns(block.runs),
          bullet: { level: block.indent },
          spacing: { after: 60 },
        }),
      ]

    case 'table': {
      const colCount = block.headers.length
      const colPct = Math.floor(100 / colCount)

      const headerRow = new TableRow({
        tableHeader: true,
        children: block.headers.map(
          (h) =>
            new TableCell({
              shading: { type: ShadingType.SOLID, color: DARK_GREEN, fill: DARK_GREEN },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })],
                }),
              ],
              width: { size: colPct, type: WidthType.PERCENTAGE },
            })
        ),
      })

      const bodyRows = block.rows.map(
        (row, rowIdx) =>
          new TableRow({
            children: row.map(
              (cell, _colIdx) =>
                new TableCell({
                  shading:
                    rowIdx % 2 === 0
                      ? { type: ShadingType.SOLID, color: TABLE_STRIPE, fill: TABLE_STRIPE }
                      : undefined,
                  children: [new Paragraph({ children: [new TextRun({ text: cell })] })],
                  width: { size: colPct, type: WidthType.PERCENTAGE },
                })
            ),
          })
      )

      return [
        new Table({
          rows: [headerRow, ...bodyRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: DARK_GREEN },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: DARK_GREEN },
            left: { style: BorderStyle.SINGLE, size: 4, color: DARK_GREEN },
            right: { style: BorderStyle.SINGLE, size: 4, color: DARK_GREEN },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
            insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
          },
        }),
        new Paragraph({ text: '', spacing: { after: 120 } }),
      ] as unknown as (Paragraph | Table)[]
    }

    case 'image': {
      const imgData = await fetchImageAsBuffer(block.src)
      if (!imgData) return []

      const maxW = 600 // ~6 inches in points (docx uses EMU but ImageRun takes pixels)
      const maxH = 400
      const scale = Math.min(maxW / imgData.width, maxH / imgData.height, 1)
      const drawW = Math.round(imgData.width * scale)
      const drawH = Math.round(imgData.height * scale)

      const result: Paragraph[] = [
        new Paragraph({
          children: [
            new ImageRun({
              data: imgData.buffer,
              transformation: { width: drawW, height: drawH },
              type: 'jpg',
            }),
          ],
          spacing: { before: 120, after: 60 },
        }),
      ]

      if (block.alt && block.alt !== 'Photo') {
        result.push(
          new Paragraph({
            children: [new TextRun({ text: block.alt, italics: true, size: 18, color: '666666' })],
            spacing: { after: 120 },
          })
        )
      }

      return result
    }

    default:
      return []
  }
}

// ============================================================
// DOCX Generator
// ============================================================

const APPENDIX_LABELS: Record<string, string> = {
  habitat_map: 'Habitat Map',
  species_list: 'Species List',
  photographs: 'Site Photographs',
  survey_datasheets: 'Survey Datasheets',
  desk_study_data: 'Desk Study Data',
  legislation: 'Legislation References',
}

export async function generatePeaDocx(options: PeaExportOptions): Promise<Blob> {
  const contentSections = options.sections.filter((s) => s.content)

  const children: (Paragraph | Table)[] = []

  const letters = 'ABCDEFGHIJ'

  // ===== COVER PAGE =====

  children.push(
    new Paragraph({ text: '', spacing: { before: 2400 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'PRELIMINARY ECOLOGICAL APPRAISAL',
          bold: true,
          color: DARK_GREEN,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: options.title, bold: true, size: 52 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 960 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Prepared For: ${options.preparedFor || 'Client'}`, size: 22 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Site Reference: ${options.siteCode}`, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Version: ${options.version}`, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Date: ${options.date}`, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 960 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generated by Dulra Ecological Platform',
          italics: true,
          color: '999999',
          size: 18,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new PageBreak()] })
  )

  // ===== TABLE OF CONTENTS =====

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Table of Contents', bold: true, color: DARK_GREEN, size: 32 }),
      ],
      spacing: { before: 240, after: 400 },
    })
  )

  contentSections.forEach((s, i) => {
    const pageNum = 3 + i
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${i + 1}.  ${s.title.replace(/^\d+\.\s*/, '')}  —  ${pageNum}`,
            size: 22,
          }),
        ],
        spacing: { after: 160 },
      })
    )
  })

  if (options.appendices.length > 0) {
    children.push(new Paragraph({ text: '', spacing: { before: 240 } }))
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Appendices', bold: true, size: 22 })],
        spacing: { after: 160 },
      })
    )
    options.appendices.forEach((a, i) => {
      const label = APPENDIX_LABELS[a] || a
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Appendix ${letters[i] || i + 1}:  ${label}`, size: 22 })],
          spacing: { after: 120 },
        })
      )
    })
  }

  children.push(new Paragraph({ children: [new PageBreak()] }))

  // ===== REPORT SECTIONS =====
  for (const section of contentSections) {
    // Section heading with underline style
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.title,
            bold: true,
            color: DARK_GREEN,
            size: 28,
            underline: { type: UnderlineType.SINGLE, color: DARK_GREEN },
          }),
        ],
        spacing: { before: 480, after: 200 },
      })
    )

    const blocks = parseMarkdown(section.content)
    for (const block of blocks) {
      const converted = await blockToParagraphs(block)
      for (const item of converted) {
        children.push(item)
      }
    }
  }

  // ===== APPENDICES =====
  if (options.appendices.length > 0) {
    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Appendices',
            bold: true,
            color: DARK_GREEN,
            size: 28,
            underline: { type: UnderlineType.SINGLE, color: DARK_GREEN },
          }),
        ],
        spacing: { before: 240, after: 200 },
      })
    )

    const letters = 'ABCDEFGHIJ'
    options.appendices.forEach((a, i) => {
      const label = APPENDIX_LABELS[a] || a
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Appendix ${letters[i] || i + 1}: ${label}`, bold: true }),
          ],
          spacing: { before: 240, after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '[Content to be inserted]', italics: true, color: '888888' }),
          ],
          spacing: { after: 160 },
        })
      )
    })
  }

  // ===== BUILD DOCUMENT =====
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
          paragraph: { spacing: { line: 276 } },
        },
        heading1: {
          run: { bold: true, color: DARK_GREEN, size: 32 },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        heading2: {
          run: { bold: true, color: DARK_GREEN, size: 26 },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
        heading3: {
          run: { bold: true, size: 24 },
          paragraph: { spacing: { before: 160, after: 80 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 },
          },
        },
        children,
      },
    ],
  })

  return await Packer.toBlob(doc)
}
