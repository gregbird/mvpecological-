import type { ReportSection } from '@/lib/supabase/queries/reports'
import type { fetchImageAsBase64 } from '../image-utils'
import { renderTable } from './table-renderer'
import type { MdBlock } from './markdown-types'
import type { RenderContext } from './render-context'

type CachedImage = Awaited<ReturnType<typeof fetchImageAsBase64>>

/**
 * Render one report section: heading + body blocks. Returns the new y position.
 *
 * The image cache is shared across all sections so the same photo doesn't get
 * fetched once per occurrence — the caller pre-warms the cache by walking
 * every section's blocks for image src URLs.
 */
export function renderSection(
  ctx: RenderContext,
  section: ReportSection,
  blocks: MdBlock[],
  imageCache: Map<string, CachedImage>,
  startY: number,
  yieldToBrowser: () => Promise<void>,
  progress: (step: string) => void
): Promise<number> {
  return renderSectionInner(ctx, section, blocks, imageCache, startY, yieldToBrowser, progress)
}

async function renderSectionInner(
  ctx: RenderContext,
  section: ReportSection,
  blocks: MdBlock[],
  imageCache: Map<string, CachedImage>,
  startY: number,
  yieldToBrowser: () => Promise<void>,
  progress: (step: string) => void
): Promise<number> {
  const {
    doc,
    theme,
    margin,
    contentWidth,
    lineHeight,
    paraSpacing,
    setFont,
    resetFontCache,
    ensureSpace,
    newPage,
    writeRichText,
    writePlainText,
  } = ctx
  const GREEN = theme.primary

  let y = startY

  // Ensure at least 35mm space for a new section heading
  y = ensureSpace(y, 35)
  if (y > margin + 10) y += 4

  // Section title with primary-colour underline
  resetFontCache()
  doc.setFontSize(14)
  doc.setFont(theme.font, 'bold')
  doc.setTextColor(...GREEN)
  doc.text(section.title, margin, y)
  const titleWidth = doc.getTextWidth(section.title)
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.4)
  doc.line(margin, y + 1.5, margin + titleWidth, y + 1.5)
  doc.setDrawColor(0, 0, 0)
  doc.setTextColor(0, 0, 0)
  y += 10

  // Strip duplicate section title from the start of the body. AI sometimes
  // repeats the section name as a paragraph, heading, or bullet immediately
  // under the rendered heading ("2. Methodology" followed by a "Methodology"
  // paragraph).
  const filteredBlocks = stripDuplicateTitlePrefix(blocks, section.title)

  for (let blockIdx = 0; blockIdx < filteredBlocks.length; blockIdx++) {
    if (blockIdx > 0 && blockIdx % 10 === 0) await yieldToBrowser()

    const block = filteredBlocks[blockIdx]
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

        setFont(false, false)
        doc.text('•', bulletIndent, y)
        y = writeRichText(block.segments, textIndent, y)
        y += 1
        break
      }

      case 'table':
        progress(`  inline table: ${block.headers.length} cols × ${block.rows.length} rows`)
        y = renderTable(doc, block, y, margin, contentWidth, ensureSpace, newPage, {
          font: theme.font,
          primary: GREEN,
        })
        progress('  inline table rendered')
        y += paraSpacing
        break

      case 'image': {
        const imgData = imageCache.get(block.src) ?? null
        if (imgData) {
          // Convert pixel dimensions to mm (assume 96 DPI: 1px ≈ 0.2646mm)
          const pxToMm = 0.2646
          const imgWmm = imgData.width * pxToMm
          const imgHmm = imgData.height * pxToMm

          const maxW = contentWidth
          const maxH = 80
          const scale = Math.min(maxW / imgWmm, maxH / imgHmm, 1)
          const drawW = imgWmm * scale
          const drawH = imgHmm * scale

          y = ensureSpace(y, drawH + 12)
          doc.addImage(`data:image/jpeg;base64,${imgData.base64}`, 'JPEG', margin, y, drawW, drawH)
          y += drawH + 2

          if (block.alt && block.alt !== 'Photo') {
            y = writePlainText(block.alt, margin, y, { fontSize: 9, italic: true })
          }
          y += paraSpacing
        }
        break
      }
    }
  }

  // Section trailing spacing
  y += 4
  return y
}

function normalizeTitleForCompare(s: string): string {
  return s
    .replace(/^[\d.]+\s*/, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toLowerCase()
}

function blockToPlainText(block: MdBlock): string | null {
  if (block.type === 'heading') return block.text
  if (block.type === 'paragraph' || block.type === 'bullet') {
    return block.segments.map((s) => s.text).join('')
  }
  return null
}

function stripDuplicateTitlePrefix(blocks: MdBlock[], title: string): MdBlock[] {
  const target = normalizeTitleForCompare(title)
  if (!target) return blocks
  let skip = 0
  // Skip up to two leading blocks if they match the section title.
  while (skip < blocks.length && skip < 2) {
    const text = blockToPlainText(blocks[skip])
    if (text && normalizeTitleForCompare(text) === target) {
      skip++
    } else {
      break
    }
  }
  return skip > 0 ? blocks.slice(skip) : blocks
}
