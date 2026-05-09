import { sectionContentToMarkdown } from '../tiptap-to-markdown'
import { APPENDIX_LABELS, type PeaExportOptions } from '../pdf-generator-types'

/**
 * Render the report as a print-friendly HTML document. Used for the
 * "HTML" export format and as a fallback for browsers without PDF preview.
 * Branding (colours, font, header/footer) is intentionally NOT applied here —
 * HTML output is plain so it round-trips cleanly when copy-pasted into Word.
 */
export function generatePeaHtml(options: PeaExportOptions): string {
  const contentSections = options.sections.filter((s) => s.content)

  const tocHtml = contentSections
    .map((s, i) => `<li><a href="#section-${i}">${s.title}</a></li>`)
    .join('\n')

  const sectionsHtml = contentSections
    .map(
      (s, i) => `
    <div class="section" id="section-${i}">
      <h2>${s.title}</h2>
      <div class="section-content">${markdownToHtml(sectionContentToMarkdown(s.content))}</div>
    </div>`
    )
    .join('\n')

  const ad = options.appendixData
  const appendicesHtml =
    options.appendices.length > 0
      ? `
    <div class="section">
      <h2>Appendices</h2>
      ${options.appendices
        .map((a, i) => {
          const label = APPENDIX_LABELS[a] || a
          const heading = `<h3>Appendix ${String.fromCharCode(65 + i)}: ${label}</h3>`

          if (a === 'designated_sites' && ad && ad.designatedSites.length > 0) {
            const rows = ad.designatedSites
              .map(
                (s) =>
                  `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(`${s.siteNumber} (${s.siteType})`)}</td><td>${escapeHtml(s.distanceKm)}</td><td>${escapeHtml(s.aiSummary)}</td></tr>`
              )
              .join('')
            return `${heading}<table><thead><tr><th>Name</th><th>Site Number</th><th>Distance</th><th>AI Summary</th></tr></thead><tbody>${rows}</tbody></table>`
          }

          if (a === 'species_list' && ad && ad.speciesRecords.length > 0) {
            const rows = ad.speciesRecords
              .map(
                (s) =>
                  `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.aiSummary)}</td><td>${escapeHtml(s.protectionStatus)}</td></tr>`
              )
              .join('')
            return `${heading}<table><thead><tr><th>Name</th><th>AI Summary</th><th>Protection Status</th></tr></thead><tbody>${rows}</tbody></table>`
          }

          if (a === 'habitat_data' && ad && ad.habitats.length > 0) {
            const rows = ad.habitats
              .map(
                (h) =>
                  `<tr><td>${escapeHtml(h.fossittCode)}</td><td>${escapeHtml(h.habitatName)}</td><td>${escapeHtml(h.areaHectares)}</td><td>${escapeHtml(h.percentCover)}</td></tr>`
              )
              .join('')
            return `${heading}<table><thead><tr><th>Fossitt Code</th><th>Habitat Category</th><th>Area (ha)</th><th>% Cover</th></tr></thead><tbody>${rows}</tbody></table>`
          }

          if (a === 'aquatic_data' && ad && ad.aquaticFeatures.length > 0) {
            const rows = ad.aquaticFeatures
              .map(
                (aq) =>
                  `<tr><td>${escapeHtml(aq.name)}</td><td>${escapeHtml(aq.waterBodyType)}</td><td>${escapeHtml(aq.wfdStatus)}</td><td>${escapeHtml(aq.distanceKm)}</td></tr>`
              )
              .join('')
            return `${heading}<table><thead><tr><th>Name</th><th>Type</th><th>WFD Status</th><th>Distance</th></tr></thead><tbody>${rows}</tbody></table>`
          }

          return `${heading}<p><em>[Content to be inserted]</em></p>`
        })
        .join('\n')}
    </div>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      font-family: 'Calibri', 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .cover-page {
      text-align: center;
      padding: 80px 0;
      border-bottom: 2px solid #2c5234;
      margin-bottom: 40px;
    }
    .cover-page h1 { color: #2c5234; font-size: 14pt; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
    .cover-page .title { font-size: 22pt; font-weight: bold; margin-bottom: 30px; }
    .cover-page .details { font-size: 12pt; color: #666; }
    .cover-page .details div { margin: 5px 0; }
    .toc { margin: 40px 0; }
    .toc h2 { color: #2c5234; border-bottom: 1px solid #2c5234; padding-bottom: 5px; }
    .toc ol { padding-left: 20px; }
    .toc li { margin: 5px 0; }
    .toc a { color: #2c5234; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    .section { margin: 30px 0; page-break-before: always; }
    .section:first-of-type { page-break-before: avoid; }
    .section h2 { color: #2c5234; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-size: 14pt; }
    .section h3 { color: #444; font-size: 12pt; margin-top: 20px; }
    .section-content { margin-top: 10px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 10pt; }
    th { background: #2c5234; color: white; font-weight: bold; }
    tr:nth-child(even) { background: #f5f5f5; }
    ul, ol { padding-left: 25px; }
    li { margin: 3px 0; }
    .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9pt; color: #999; text-align: center; }
    @media print {
      body { padding: 20px; }
      .section { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="cover-page">
    <h1>Preliminary Ecological Appraisal</h1>
    <div class="title">${escapeHtml(
      options.activeSiteCode ? `${options.title} (Site: ${options.activeSiteCode})` : options.title
    )}</div>
    <div class="details">
      <div><strong>Prepared For:</strong> ${escapeHtml(options.preparedFor || 'Client')}</div>
      <div><strong>Site Reference:</strong> ${escapeHtml(
        options.activeSiteCode
          ? `${options.activeSiteCode} (filtered from project)`
          : options.siteCodes && options.siteCodes.length > 1
            ? options.siteCodes.join(', ')
            : options.siteCode
      )}</div>
      <div><strong>Version:</strong> ${options.version}</div>
      <div><strong>Date:</strong> ${escapeHtml(options.date)}</div>
    </div>
  </div>
  <div class="toc">
    <h2>Table of Contents</h2>
    <ol>${tocHtml}</ol>
  </div>
  ${sectionsHtml}
  ${appendicesHtml}
  <div class="footer">Generated by Dulra Ecological Platform &mdash; ${escapeHtml(options.date)}</div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function markdownToHtml(md: string): string {
  let html = escapeHtml(md)

  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>')

  html = html.replace(
    /^(\|.+\|)\n(\|[\s-:|]+\|)\n((?:\|.+\|\n?)*)/gm,
    (_match, headerRow: string, _separator: string, bodyRows: string) => {
      const headers = headerRow
        .split('|')
        .filter((c: string) => c.trim())
        .map((c: string) => `<th>${c.trim()}</th>`)
        .join('')
      const rows = bodyRows
        .trim()
        .split('\n')
        .filter((r: string) => r.trim())
        .map((row: string) => {
          const cells = row
            .split('|')
            .filter((c: string) => c.trim())
            .map((c: string) => `<td>${c.trim()}</td>`)
            .join('')
          return `<tr>${cells}</tr>`
        })
        .join('')
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
    }
  )

  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<figure><img src="$2" alt="$1" style="max-width:100%;height:auto;" /><figcaption><em>$1</em></figcaption></figure>'
  )

  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')

  html = html.replace(/\n\n/g, '</p><p>')
  html = `<p>${html}</p>`

  html = html.replace(/<p>\s*<\/p>/g, '')
  html = html.replace(/<p>(<h[23]>)/g, '$1')
  html = html.replace(/(<\/h[23]>)<\/p>/g, '$1')
  html = html.replace(/<p>(<table>)/g, '$1')
  html = html.replace(/(<\/table>)<\/p>/g, '$1')
  html = html.replace(/<p>(<ul>)/g, '$1')
  html = html.replace(/(<\/ul>)<\/p>/g, '$1')

  return html
}
