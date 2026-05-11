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

    // Helper for the "this appendix has nothing to show" case. Renders a
    // short italic note instead of leaving the page entirely blank.
    const writeEmptyNote = (msg: string) => {
      y = writePlainText(msg, margin, y, { fontSize: 10, italic: true })
      y += 4
    }

    if (key === 'designated_sites') {
      if (ad && ad.designatedSites.length > 0) {
        await yieldToBrowser()
        const dsTable: MdTable = {
          type: 'table',
          headers: ['Name', 'Site Number', 'Distance', 'AI Summary'],
          rows: ad.designatedSites.map((s) => [
            s.name,
            `${s.siteNumber} (${s.siteType})`,
            s.distanceKm,
            s.aiSummary,
          ]),
        }
        y = renderTable(doc, dsTable, y, margin, contentWidth, ensureSpace, newPage, {
          font: theme.font,
          primary: GREEN,
        })
        y += 4
      } else {
        writeEmptyNote('No designated sites recorded for this project.')
      }
    } else if (key === 'species_list') {
      if (ad && ad.speciesRecords.length > 0) {
        await yieldToBrowser()
        const spTable: MdTable = {
          type: 'table',
          headers: ['Name', 'AI Summary', 'Protection Status'],
          rows: ad.speciesRecords.map((s) => [s.name, s.aiSummary, s.protectionStatus]),
        }
        y = renderTable(doc, spTable, y, margin, contentWidth, ensureSpace, newPage, {
          font: theme.font,
          primary: GREEN,
        })
        y += 4
      } else {
        writeEmptyNote(
          'No species records were returned from the desk study or field surveys. ' +
            'Targeted Phase 2 surveys are recommended (see Methodology section).'
        )
      }
    } else if (key === 'habitat_data') {
      if (ad && ad.habitats.length > 0) {
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
      } else {
        writeEmptyNote('No habitat polygons recorded for this project.')
      }
    } else if (key === 'aquatic_data') {
      if (ad && ad.aquaticFeatures.length > 0) {
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
      } else {
        writeEmptyNote('No aquatic features recorded within the study buffer.')
      }
    } else if (key === 'habitat_map') {
      // No vector map embedding yet — fall back to the habitat data table
      // (same shape as habitat_data appendix) when habitats are available,
      // otherwise an explicit placeholder note.
      if (ad && ad.habitats.length > 0) {
        await yieldToBrowser()
        writeEmptyNote(
          'Habitat polygons (Fossitt classification) are tabulated below. ' +
            'A georeferenced habitat map is supplied separately as a GIS deliverable.'
        )
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
      } else {
        writeEmptyNote('Habitat map figure to be supplied as a separate deliverable.')
      }
    } else if (key === 'photographs') {
      writeEmptyNote(
        'Site photographs are supplied as a separate deliverable. ' +
          'Photo captions, GPS coordinates, and timestamps are recorded in the field datasheets.'
      )
    } else {
      // Survey datasheets, legislation references, or any future appendix key
      // we haven't built a renderer for yet.
      writeEmptyNote('Content to be supplied with the final deliverable.')
    }
  }

  return y
}
