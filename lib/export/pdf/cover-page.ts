import { applyPlaceholders } from './theme'
import { REPORT_TYPE_TITLES, type PeaExportOptions } from '../pdf-generator-types'
import type { RenderContext } from './render-context'

/**
 * Render the cover page (page 1). Pure — does not advance the page counter
 * since it's the first page. Caller is expected to `doc.addPage()` afterwards.
 */
export function renderCoverPage(ctx: RenderContext, options: PeaExportOptions): void {
  const { doc, theme, pageWidth, pageHeight, margin, contentWidth, placeholderCtx } = ctx

  const GREEN = theme.primary
  const WHITE: [number, number, number] = [255, 255, 255]
  const LIGHT_GRAY: [number, number, number] = [245, 247, 245]

  // Top primary-colour banner (height varies with logo presence)
  const bannerHeight = theme.coverPage.showLogo && theme.logoDataUrl ? 50 : 40
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageWidth, bannerHeight, 'F')

  // Branded logo (if configured) — embedded at the chosen position
  if (theme.coverPage.showLogo && theme.logoDataUrl) {
    try {
      const logoH = 24
      const logoW = 60
      const logoY = (bannerHeight - logoH) / 2
      const logoX =
        theme.coverPage.logoPosition === 'top-left'
          ? margin
          : theme.coverPage.logoPosition === 'top-right'
            ? pageWidth - margin - logoW
            : (pageWidth - logoW) / 2
      doc.addImage(theme.logoDataUrl, logoX, logoY, logoW, logoH, undefined, 'FAST')
    } catch {
      // Bad logo data — silently fall through to text banner
    }
  } else {
    doc.setFontSize(13)
    doc.setFont(theme.font, 'bold')
    doc.setTextColor(...WHITE)
    const headerLine = theme.coverPage.subtitle || 'ECOLOGICAL REPORT'
    doc.text(headerLine, pageWidth / 2, 18, { align: 'center' })
  }

  // Subtitle line (only when logo present — otherwise it's already the banner)
  if (theme.coverPage.showLogo && theme.logoDataUrl && theme.coverPage.subtitle) {
    doc.setFontSize(10)
    doc.setFont(theme.font, 'normal')
    doc.setTextColor(...WHITE)
    doc.text(theme.coverPage.subtitle, pageWidth / 2, bannerHeight - 6, { align: 'center' })
  }

  doc.setFontSize(9)
  const bannerSiteText =
    options.siteCodes && options.siteCodes.length > 1
      ? `Sites: ${options.siteCodes.join(', ')}`
      : options.siteCode
  doc.setTextColor(...WHITE)
  doc.text(bannerSiteText, pageWidth / 2, bannerHeight - 2, { align: 'center' })

  // Report type label
  doc.setFontSize(12)
  doc.setFont(theme.font, 'bold')
  doc.setTextColor(...GREEN)
  const coverTitle =
    (options.reportType && REPORT_TYPE_TITLES[options.reportType]) || 'ECOLOGICAL REPORT'
  doc.text(coverTitle, pageWidth / 2, 68, { align: 'center' })

  // Thin underline under report type
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.6)
  doc.line(margin + 20, 71, pageWidth - margin - 20, 71)

  // Project title — large, centered (with optional site export suffix)
  doc.setFontSize(22)
  doc.setFont(theme.font, 'bold')
  doc.setTextColor(0, 0, 0)
  const titleText = options.activeSiteCode
    ? `${options.title} (Site: ${options.activeSiteCode})`
    : options.title
  const titleLines = doc.splitTextToSize(titleText, contentWidth - 10) as string[]
  let titleY = 88
  for (const line of titleLines) {
    doc.text(line, pageWidth / 2, titleY, { align: 'center' })
    titleY += 12
  }

  // Details box — light gray background
  const boxTop = titleY + 16
  const boxLeft = margin + 15
  const boxRight = pageWidth - margin - 15
  const boxWidth = boxRight - boxLeft
  const siteRefValue = options.activeSiteCode
    ? `${options.activeSiteCode} (filtered from project)`
    : options.siteCodes && options.siteCodes.length > 1
      ? options.siteCodes.join(', ')
      : options.siteCode
  const detailRows = [
    { label: 'Prepared For', value: options.preparedFor || 'Client' },
    { label: 'Site Reference', value: siteRefValue },
    { label: 'Report Version', value: `Version ${options.version}` },
    { label: 'Date', value: options.date },
  ]
  const rowH = 10
  const boxH = detailRows.length * rowH + 6

  doc.setFillColor(...LIGHT_GRAY)
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.4)
  doc.roundedRect(boxLeft, boxTop, boxWidth, boxH, 2, 2, 'FD')

  detailRows.forEach((row, idx) => {
    const ry = boxTop + 10 + idx * rowH
    doc.setFontSize(10)
    doc.setFont(theme.font, 'bold')
    doc.setTextColor(...GREEN)
    doc.text(row.label, boxLeft + 8, ry)
    doc.setFont(theme.font, 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(row.value, boxLeft + boxWidth * 0.45, ry)
    if (idx < detailRows.length - 1) {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.line(boxLeft + 4, ry + 3, boxRight - 4, ry + 3)
    }
  })

  // Bottom primary banner — uses configured footer text when present
  doc.setFillColor(...GREEN)
  doc.rect(0, pageHeight - 22, pageWidth, 22, 'F')
  doc.setFontSize(8)
  doc.setFont(theme.font, 'normal')
  doc.setTextColor(...WHITE)
  const coverFooterMain =
    applyPlaceholders(theme.footer.text, placeholderCtx) || `${options.preparedFor || ''}`.trim()
  if (coverFooterMain) {
    doc.text(coverFooterMain, pageWidth / 2, pageHeight - 13, { align: 'center' })
  }
  doc.text(`© ${new Date().getFullYear()} — Confidential`, pageWidth / 2, pageHeight - 6, {
    align: 'center',
  })

  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
}
