import type { jsPDF } from 'jspdf'
import type { TextSegment } from './markdown-types'
import type { PdfTheme } from './theme'

/**
 * Bag of state + helpers shared between cover/toc/section/appendix renderers.
 * Encapsulates the closures that need access to the running font cache, page
 * counter, and layout constants. Constructed once per PDF generation.
 */
export interface RenderContext {
  doc: jsPDF
  theme: PdfTheme
  pageWidth: number
  pageHeight: number
  margin: number
  contentWidth: number
  lineHeight: number
  paraSpacing: number
  headerHeight: number
  footerY: number
  placeholderCtx: { projectName?: string; siteCode?: string }
  headerText: string
  footerText: string

  /** Reset font cache and update font (size + style). */
  setFont: (bold: boolean, italic: boolean, size?: number) => void
  /** Force the next setFont call to actually run, even if style/size match. */
  resetFontCache: () => void
  /** Cached text width measurement keyed by style+size+text. */
  cachedTextWidth: (text: string, bold: boolean, italic: boolean, size?: number) => number
  /** If `y + needed` would overflow the footer line, start a new page. */
  ensureSpace: (y: number, needed: number) => number
  /** Add footer to current page, advance to a new page, return starting y. */
  newPage: () => number
  /** Render a wrapped run of inline-styled segments. Returns the new y. */
  writeRichText: (segments: TextSegment[], startX: number, startY: number) => number
  /** Render a plain styled line (no inline formatting). Returns the new y. */
  writePlainText: (
    text: string,
    x: number,
    y: number,
    opts?: { fontSize?: number; bold?: boolean; italic?: boolean; color?: [number, number, number] }
  ) => number
  /** Manually emit the header (called after newPage). */
  addHeader: () => void
  /** Manually emit the footer (called before newPage / at end of doc). */
  addFooter: () => void
}
