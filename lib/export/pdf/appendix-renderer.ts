import { renderTable } from './table-renderer'
import { APPENDIX_LABELS, type PeaExportOptions } from '../pdf-generator-types'
import type { MdTable } from './markdown-types'
import type { RenderContext } from './render-context'

/**
 * Render every selected appendix. Each appendix starts on a fresh page.
 * Returns the y position at the end of the last rendered appendix so the
 * caller can decide whether to add additional content (it doesn't currently).
 */
export async function renderAppendices(
  ctx: RenderContext,
  options: PeaExportOptions,
  yieldToBrowser: () => Promise<void>,
  progress: (step: string) => void
): Promise<number> {
  const { doc, theme, margin, contentWidth, resetFontCache, newPage, ensureSpace, writePlainText } =
    ctx
  const GREEN = theme.primary

  let y = 0
  if (options.appendices.length === 0) return y

  progress(`rendering ${options.appendices.length} appendices`)
  const letters = 'ABCDEFGHIJ'
  const ad = options.appendixData

  for (let i = 0; i < options.appendices.length; i++) {
    const key = options.appendices[i]
    const label = APPENDIX_LABELS[key] || key
    progress(`appendix ${letters[i] || i + 1}: ${label}`)

    y = newPage()

    resetFontCache()
    doc.setFontSize(14)
    doc.setFont(theme.font, 'bold')
    doc.setTextColor(...GREEN)
    const headingText = `Appendix ${letters[i] || i + 1}: ${label}`
    doc.text(headingText, margin, y)
    const hw = doc.getTextWidth(headingText)
    doc.setDrawColor(...GREEN)
    doc.setLineWidth(0.4)
    doc.line(margin, y + 1.5, margin + hw, y + 1.5)
    doc.setDrawColor(0, 0, 0)
    doc.setTextColor(0, 0, 0)
    y += 10

    if (key === 'designated_sites' && ad && ad.designatedSites.length > 0) {
      await yieldToBrowser()
      const dsTable: MdTable = {
        type: 'table',
        headers: ['Name', 'Site Number', 'Distance'],
        rows: ad.designatedSites.map((s) => [
          s.name,
          `${s.siteNumber} (${s.siteType})`,
          s.distanceKm,
        ]),
      }
      y = renderTable(doc, dsTable, y, margin, contentWidth, ensureSpace, newPage, {
        font: theme.font,
        primary: GREEN,
      })
      y += 4
    } else if (key === 'species_list' && ad && ad.speciesRecords.length > 0) {
      await yieldToBrowser()
      const spTable: MdTable = {
        type: 'table',
        headers: ['Name', 'Protection Status'],
        rows: ad.speciesRecords.map((s) => [s.name, s.protectionStatus]),
      }
      y = renderTable(doc, spTable, y, margin, contentWidth, ensureSpace, newPage, {
        font: theme.font,
        primary: GREEN,
      })
      y += 4
    } else if (key === 'habitat_data' && ad && ad.habitats.length > 0) {
      await yieldToBrowser()
      const hTable: MdTable = {
        type: 'table',
        headers: ['Fossitt Code', 'Habitat Category', 'Area (ha)', '% Cover'],
        rows: ad.habitats.map((h) => [
          h.fossittCode,
          h.habitatName,
          h.areaHectares,
          h.percentCover,
        ]),
      }
      y = renderTable(doc, hTable, y, margin, contentWidth, ensureSpace, newPage, {
        font: theme.font,
        primary: GREEN,
      })
      y += 4
    } else if (key === 'aquatic_data' && ad && ad.aquaticFeatures.length > 0) {
      await yieldToBrowser()
      const aqTable: MdTable = {
        type: 'table',
        headers: ['Name', 'Type', 'WFD Status', 'Distance'],
        rows: ad.aquaticFeatures.map((a) => [a.name, a.waterBodyType, a.wfdStatus, a.distanceKm]),
      }
      y = renderTable(doc, aqTable, y, margin, contentWidth, ensureSpace, newPage, {
        font: theme.font,
        primary: GREEN,
      })
      y += 4
    } else if (
      (key !== 'designated_sites' &&
        key !== 'species_list' &&
        key !== 'habitat_data' &&
        key !== 'aquatic_data') ||
      !ad
    ) {
      y = writePlainText(
        'This appendix is reserved for manual content. Insert the relevant map, photographs, datasheets or reference material after export.',
        margin,
        y,
        { fontSize: 10, italic: true }
      )
      y += 4
    }
  }

  return y
}
