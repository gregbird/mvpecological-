import type { MdBlock, StyledWord, TextSegment } from './markdown-types'
import { SCIENTIFIC_GENERA_LOWER, SCIENTIFIC_NAME_REGEX } from './scientific-genera'

/**
 * Strip markdown bold/italic/code markers — table cells render as plain text
 * because both jsPDF and docx-table cells write a single string without
 * mid-cell font switching. Leaving the markers in produces literal
 * "**Parameter**" output in PDF/DOCX exports.
 */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_]+?)_(?!_)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

/**
 * Parse a Markdown string into block-level structures the PDF renderer can
 * walk over. Recognises: images, tables (with separator row), headings,
 * bullets (including continuation lines), and paragraphs.
 */
export function parseMarkdown(md: string): MdBlock[] {
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
        .map((c) => stripInlineMarkdown(c.trim()))
      i += 2 // skip header + separator

      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i]
          .split('|')
          .filter((c) => c.trim())
          .map((c) => stripInlineMarkdown(c.trim()))
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
export function parseInline(text: string): TextSegment[] {
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
export function parseInlineWithScientific(text: string): TextSegment[] {
  const segments = parseInline(text)

  // Fast path: no genus keyword anywhere → skip the regex completely.
  const lower = text.toLowerCase()
  if (!SCIENTIFIC_GENERA_LOWER.some((g) => lower.includes(g))) {
    return segments
  }

  const result: TextSegment[] = []

  for (const seg of segments) {
    if (seg.italic || seg.bold) {
      result.push(seg)
      continue
    }

    SCIENTIFIC_NAME_REGEX.lastIndex = 0
    let lastIdx = 0
    let sciMatch: RegExpExecArray | null
    let hasMatch = false
    while ((sciMatch = SCIENTIFIC_NAME_REGEX.exec(seg.text)) !== null) {
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

/** Convert segments into words with style information */
export function segmentsToWords(segments: TextSegment[]): StyledWord[] {
  const words: StyledWord[] = []

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx]
    const parts = seg.text.split(/(\s+)/)
    const segStartWordIdx = words.length

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

    // Word-boundary repair across segment transitions. The AI commonly emits
    // `**bold**word` (no space between the closing tag and the next word).
    // parseInline produces two adjacent segments; segmentsToWords would then
    // glue them together ("(002296)comprises"). If the previous segment's
    // last word lacks a trailing space AND this segment's first word begins
    // with a word char, inject a space at the boundary. Include sentence
    // punctuation (`:`, `,`, `.`, `;`, `!`, `?`, `)`) as word-end characters
    // so `**Habitats:**Desktop` and `**Wildlife Acts (1976–2021):**Irish`
    // both get a space before the following plain text.
    if (segIdx > 0 && segStartWordIdx > 0 && segStartWordIdx < words.length) {
      const prev = words[segStartWordIdx - 1]
      const next = words[segStartWordIdx]
      if (!prev.trailingSpace) {
        const prevEnd = prev.text.slice(-1)
        const nextStart = next.text.charAt(0)
        const prevEndsWord = /[\p{L}\p{N}):,.;!?]/u.test(prevEnd)
        const nextStartsWord = /[\p{L}\p{N}(]/u.test(nextStart)
        if (prevEndsWord && nextStartsWord) {
          prev.trailingSpace = true
        }
      }
    }
  }

  return words
}
