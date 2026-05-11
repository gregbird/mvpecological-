import type { ReportSection } from '@/lib/supabase/queries/reports'
import { APPENDIX_LABELS } from '../pdf-generator-types'
import type { RenderContext } from './render-context'

/**
 * Render the Table of Contents page (typically page 2). Caller is responsible
 * for `doc.addPage()` and incrementing the page counter — TOC simply paints
 * onto the current page and emits a footer at the end.
 */
export function renderTableOfContents(
  ctx: RenderContext,
  contentSections: ReportSection[],
  appendices: string[]
): void {
  const { doc, theme, pageWidth, margin, contentWidth, addFooter } = ctx
  const GREEN = theme.primary
  const WHITE: [number, number, number] = [255, 255, 255]
  const LIGHT_GRAY: [number, number, number] = [245, 247, 245]

  // TOC header — primary background bar
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setFontSize(16)
  doc.setFont(theme.font, 'bold')
  doc.setTextColor(...WHITE)
  doc.text('TABLE OF CONTENTS', margin, 18)
  doc.setTextColor(0, 0, 0)

  // Thick primary bottom border under header
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.8)
  doc.line(margin, 32, pageWidth - margin, 32)

  let tocY = 44

  // Page numbers are intentionally omitted — they cannot be known at TOC
  // render time without a second-pass refactor. A clean dotted leader looks
  // better than a wrong fixed number.
  for (let i = 0; i < contentSections.length; i++) {
    const section = contentSections[i]

    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT_GRAY)
      doc.rect(margin, tocY - 5, contentWidth, 8, 'F')
    }

    doc.setFontSize(10)
    doc.setFont(theme.font, 'bold')
    doc.setTextColor(...GREEN)
    doc.text(`${i + 1}.`, margin + 2, tocY)

    doc.setFont(theme.font, 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(section.title.replace(/^\d+\.\s*/, ''), margin + 12, tocY)

    doc.setTextColor(0, 0, 0)
    tocY += 9
  }

  // Appendices section in TOC
  if (appendices.length > 0) {
    tocY += 6
    doc.setDrawColor(...GREEN)
    doc.setLineWidth(0.4)
    doc.line(margin, tocY - 3, margin + contentWidth, tocY - 3)

    doc.setFontSize(10)
    doc.setFont(theme.font, 'bold')
    doc.setTextColor(...GREEN)
    doc.text('APPENDICES', margin + 2, tocY + 3)
    tocY += 12

    const letters = 'ABCDEFGHIJ'
    for (let i = 0; i < appendices.length; i++) {
      const label = APPENDIX_LABELS[appendices[i]] || appendices[i]

      doc.setFontSize(9)
      doc.setFont(theme.font, 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(`Appendix ${letters[i] || i + 1}`, margin + 8, tocY)
      doc.setTextColor(100, 100, 100)
      doc.text(label, margin + 36, tocY)
      tocY += 7
    }
  }

  // Footer on TOC page
  addFooter()
}
