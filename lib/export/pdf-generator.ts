'use client'

import { jsPDF } from 'jspdf'

import { fetchImageAsBase64 } from './image-utils'
import { sectionContentToMarkdown } from './tiptap-to-markdown'
import { parseMarkdown, segmentsToWords } from './pdf/markdown-parser'
import { applyPlaceholders, resolveTheme } from './pdf/theme'
import { renderCoverPage } from './pdf/cover-page'
import { renderTableOfContents } from './pdf/toc-page'
import { renderSection } from './pdf/section-renderer'
import { renderAppendices } from './pdf/appendix-renderer'
import type { MdBlock, StyledWord, TextSegment } from './pdf/markdown-types'
import type { RenderContext } from './pdf/render-context'
import type { PeaExportOptions } from './pdf-generator-types'

// Re-export types + helpers other modules import from this file. Renderer
// internals live in `./pdf/*` and `./pdf-generator-types.ts`.
export type { PdfBrandingOptions, PeaExportOptions } from './pdf-generator-types'
export { REPORT_TYPE_TITLES } from './pdf-generator-types'
export { generatePeaHtml } from './pdf/html-generator'

/**
 * Build the full PEA-style PDF document.
 *
 * Pipeline:
 * 1. Resolve branding → theme
 * 2. Construct shared `RenderContext` (font cache, ensureSpace, newPage,
 *    writeRichText, writePlainText, addHeader/Footer)
 * 3. Cover page → addPage → TOC → addPage → sections → appendices
 *
 * Each phase lives in its own module under `./pdf/` so this orchestrator
 * stays small. Body section rendering is the only async path (it yields to
 * the browser between sections so the worker stays responsive).
 */
export async function generatePeaPdf(
  options: PeaExportOptions,
  onProgress?: (step: string) => void
): Promise<jsPDF> {
  const progress = onProgress ?? (() => {})
  progress('init jsPDF')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 5.5
  const paraSpacing = 3
  const theme = resolveTheme(options.branding)
  const headerHeight = theme.header.enabled ? 10 : 0
  const footerY = pageHeight - 15
  const placeholderCtx = { projectName: options.projectName, siteCode: options.siteCode }
  const headerText = applyPlaceholders(theme.header.text, placeholderCtx)
  const footerText =
    applyPlaceholders(theme.footer.text, placeholderCtx) || `${options.siteCode} — ${options.title}`

  let currentPage = 1

  // Font + width caches — avoid redundant setFont/getTextWidth calls.
  let curStyle = ''
  let curSize = 0
  const setFont = (bold: boolean, italic: boolean, size: number = 10) => {
    const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal'
    if (style !== curStyle || size !== curSize) {
      doc.setFontSize(size)
      doc.setFont(theme.font, style)
      curStyle = style
      curSize = size
    }
  }
  const resetFontCache = () => {
    curStyle = ''
    curSize = 0
  }

  const widthCache = new Map<string, number>()
  const cachedTextWidth = (
    text: string,
    bold: boolean,
    italic: boolean,
    size: number = 10
  ): number => {
    const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal'
    const key = `${style}|${size}|${text}`
    const cached = widthCache.get(key)
    if (cached !== undefined) return cached
    setFont(bold, italic, size)
    const w = doc.getTextWidth(text)
    widthCache.set(key, w)
    return w
  }

  const getWordWidth = (word: StyledWord) => cachedTextWidth(word.text, word.bold, word.italic)
  const getSpaceWidth = () => cachedTextWidth(' ', false, false)

  const addHeader = () => {
    if (!theme.header.enabled) return
    resetFontCache()
    doc.setFontSize(8)
    doc.setFont(theme.font, 'normal')
    doc.setTextColor(110, 110, 110)
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.text(headerText, margin, 10)
    doc.line(margin, 12, pageWidth - margin, 12)
    doc.setTextColor(0, 0, 0)
    doc.setDrawColor(0, 0, 0)
  }

  const addFooter = () => {
    if (!theme.footer.enabled) return
    resetFontCache()
    doc.setFontSize(8)
    doc.setFont(theme.font, 'normal')
    doc.setTextColor(128, 128, 128)
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3)
    doc.text(footerText, margin, footerY)
    if (theme.footer.showPageNumbers) {
      doc.text(`Page ${currentPage}`, pageWidth - margin, footerY, { align: 'right' })
    }
    doc.setTextColor(0, 0, 0)
    doc.setDrawColor(0, 0, 0)
  }

  const newPage = (): number => {
    addFooter()
    doc.addPage()
    currentPage++
    addHeader()
    return margin + 5 + headerHeight
  }

  const ensureSpace = (y: number, needed: number): number => {
    if (y + needed > footerY - 8) return newPage()
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

      if (!lineStart && x + wordW > startX + maxWidth) {
        y += lineHeight
        y = ensureSpace(y, lineHeight)
        x = startX
        lineStart = true
      }

      setFont(word.bold, word.italic)
      doc.text(word.text, x, y)
      x += wordW

      if (word.trailingSpace) x += spaceW
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

  const ctx: RenderContext = {
    doc,
    theme,
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
    lineHeight,
    paraSpacing,
    headerHeight,
    footerY,
    placeholderCtx,
    headerText,
    footerText,
    setFont,
    resetFontCache,
    cachedTextWidth,
    ensureSpace,
    newPage,
    writeRichText,
    writePlainText,
    addHeader,
    addFooter,
  }

  // ===== COVER PAGE =====
  renderCoverPage(ctx, options)

  // ===== TABLE OF CONTENTS =====
  doc.addPage()
  currentPage++
  const contentSections = options.sections.filter((s) => s.content)
  renderTableOfContents(ctx, contentSections, options.appendices)

  // ===== REPORT SECTIONS =====
  progress('cover + TOC done, starting sections')
  let y = newPage()
  const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 0))

  // Pre-parse all sections + prefetch all images. Without this, a serial
  // `await fetchImageAsBase64` per image meant a report with 30 photos × 5s
  // timeout could stall the export for 2.5 minutes.
  const sectionBlocks: MdBlock[][] = []
  for (let i = 0; i < contentSections.length; i++) {
    const s = contentSections[i]
    const contentLen = s.content?.length ?? 0
    progress(`parse ${i + 1}/${contentSections.length} "${s.title}" (${contentLen} chars)`)
    await yieldToBrowser()
    const md = sectionContentToMarkdown(s.content)
    progress(`  ${i + 1}: tiptap→md done (${md.length} chars), parsing markdown…`)
    await yieldToBrowser()
    sectionBlocks.push(parseMarkdown(md))
    progress(`  ${i + 1}: parsed ${sectionBlocks[i].length} blocks`)
  }

  const imageSrcs = new Set<string>()
  for (const blocks of sectionBlocks) {
    for (const block of blocks) {
      if (block.type === 'image' && block.src) imageSrcs.add(block.src)
    }
  }
  progress(`prefetching ${imageSrcs.size} unique images`)
  type CachedImage = Awaited<ReturnType<typeof fetchImageAsBase64>>
  const imageCache = new Map<string, CachedImage>()
  await Promise.all(
    Array.from(imageSrcs).map(async (src) => {
      imageCache.set(src, await fetchImageAsBase64(src))
    })
  )
  progress(`images prefetched, rendering ${contentSections.length} sections`)

  for (let sectionIdx = 0; sectionIdx < contentSections.length; sectionIdx++) {
    const section = contentSections[sectionIdx]
    progress(`section ${sectionIdx + 1}/${contentSections.length}: ${section.title}`)
    await yieldToBrowser()
    y = await renderSection(
      ctx,
      section,
      sectionBlocks[sectionIdx],
      imageCache,
      y,
      yieldToBrowser,
      progress
    )
  }

  // ===== APPENDICES =====
  await renderAppendices(ctx, options, yieldToBrowser, progress)

  addFooter()
  return doc
}
