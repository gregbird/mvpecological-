import { sectionContentToMarkdown } from '../tiptap-to-markdown'
import { APPENDIX_LABELS, type PeaExportOptions } from '../pdf-generator-types'

/**
 * Render the report as a print-friendly HTML document. Used for the
 * "HTML" export format and as a fallback for browsers without PDF preview.
 * Branding (colours, font, header/footer) is intentionally NOT applied here —
 * HTML output is plain so it round-trips cleanly when copy-pasted into Word.
 */
export function generatePeaHtml(options: PeaExportOptions): string {
  // Include all sections with content. The "appendices" section is the
  // AI-written narrative introducing the appendix list; the auto-rendered
  // appendix tables follow afterwards.
  const contentSections = options.sections.filter((s) => s.content)

  const tocHtml = contentSections
    .map((s, i) => `<li><a href="#section-${i}">${s.title}</a></li>`)
    .join('\n')

  const sectionsHtml = contentSections
    .map((s, i) => {
      const md = stripDuplicateTitleLines(sectionContentToMarkdown(s.content), s.title)
      return `
    <div class="section" id="section-${i}">
      <h2>${s.title}</h2>
      <div class="section-content">${markdownToHtml(md)}</div>
    </div>`
    })
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
                  `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(`${s.siteNumber} (${s.siteType})`)}</td><td>${escapeHtml(s.distanceKm)}</td></tr>`
              )
              .join('')
            return `${heading}<table><thead><tr><th>Name</th><th>Site Number</th><th>Distance</th></tr></thead><tbody>${rows}</tbody></table>`
          }

          if (a === 'species_list' && ad && ad.speciesRecords.length > 0) {
            const rows = ad.speciesRecords
              .map(
                (s) =>
                  `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.protectionStatus)}</td></tr>`
              )
              .join('')
            return `${heading}<table><thead><tr><th>Name</th><th>Protection Status</th></tr></thead><tbody>${rows}</tbody></table>`
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

          return `${heading}<p><em>This appendix is reserved for manual content. Insert the relevant map, photographs, datasheets or reference material after export.</em></p>`
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
      position: relative;
      text-align: center;
      padding: 0 0 80px;
      margin-bottom: 40px;
    }
    .cover-page .brand-band {
      background: #2c5234;
      color: white;
      padding: 50px 30px 60px;
      text-align: center;
      margin: -40px -40px 40px;
    }
    .cover-page .brand-band .eyebrow {
      font-size: 14pt;
      text-transform: uppercase;
      letter-spacing: 3px;
      font-weight: 600;
    }
    .cover-page .brand-band .site-line {
      font-size: 10pt;
      letter-spacing: 1.5px;
      margin-top: 30px;
      opacity: 0.85;
    }
    .cover-page .title-band {
      border-top: 3px solid #2c5234;
      border-bottom: 3px solid #2c5234;
      padding: 16px 0;
      margin: 30px auto;
      max-width: 70%;
      color: #2c5234;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-size: 12pt;
      font-weight: 600;
    }
    .cover-page .title { font-size: 22pt; font-weight: bold; margin: 30px auto; color: #222; max-width: 80%; }
    .cover-page .meta-card {
      border: 2px solid #2c5234;
      border-radius: 8px;
      margin: 40px auto 0;
      padding: 18px 24px;
      max-width: 60%;
      text-align: left;
    }
    .cover-page .meta-card .row { display: flex; padding: 8px 0; border-bottom: 1px solid #e8efe8; }
    .cover-page .meta-card .row:last-child { border-bottom: none; }
    .cover-page .meta-card .label { font-weight: 600; color: #2c5234; min-width: 160px; }
    .cover-page .meta-card .value { color: #444; }
    .cover-footer {
      background: #2c5234;
      color: white;
      padding: 30px;
      margin: 80px -40px -40px;
      text-align: center;
      font-size: 9pt;
      letter-spacing: 1px;
    }
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
    <div class="brand-band">
      <div class="eyebrow">Ecological Report</div>
      <div class="site-line">Sites: ${escapeHtml(
        options.activeSiteCode
          ? options.activeSiteCode
          : options.siteCodes && options.siteCodes.length > 0
            ? options.siteCodes.join(', ')
            : options.siteCode
      )}</div>
    </div>
    <div class="title-band">Preliminary Ecological Appraisal</div>
    <div class="title">${escapeHtml(
      options.activeSiteCode ? `${options.title} (Site: ${options.activeSiteCode})` : options.title
    )}</div>
    <div class="meta-card">
      <div class="row"><span class="label">Prepared For</span><span class="value">${escapeHtml(options.preparedFor || 'Client')}</span></div>
      <div class="row"><span class="label">Site Reference</span><span class="value">${escapeHtml(
        options.activeSiteCode
          ? `${options.activeSiteCode} (filtered from project)`
          : options.siteCodes && options.siteCodes.length > 1
            ? options.siteCodes.join(', ')
            : options.siteCode
      )}</span></div>
      <div class="row"><span class="label">Report Version</span><span class="value">Version ${options.version}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${escapeHtml(options.date)}</span></div>
    </div>
    <div class="cover-footer">Confidential &nbsp;&middot;&nbsp; &copy; ${new Date().getFullYear()} &nbsp;&middot;&nbsp; Confidential</div>
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

  // Horizontal rule (---, ***, ___ on their own line). Must run BEFORE the
  // bold/italic regexes — a literal `***` on its own line would otherwise be
  // mis-consumed as `<em></em>*` by the emphasis pass. Also before heading
  // and paragraph passes so the rule is hoisted out cleanly.
  html = html.replace(/^(?:-{3,}|\*{3,}|_{3,})$/gm, '<hr>')

  // Bold / italic. Trim whitespace INSIDE the captured group: the upstream
  // `normalizeBoldItalicSpacing` adds a space whenever a `**`/`*` marker
  // touches alphanumerics, which for a standalone `**Foo**` paragraph yields
  // `** Foo **`. The naive `(.*?)` capture then includes the leading/trailing
  // space, rendering as `<strong> Foo </strong>` — visually a half-em gap on
  // each side. Trimming the capture restores tight typography. The outer
  // markdown layer already supplies any inter-word space that should remain.
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, (_m, c) => `<strong><em>${c.trim()}</em></strong>`)
  html = html.replace(/\*\*(.*?)\*\*/g, (_m, c) => `<strong>${c.trim()}</strong>`)
  html = html.replace(/\*(.*?)\*/g, (_m, c) => `<em>${c.trim()}</em>`)

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

  // Convert "- item" and "1. item" lines to <li>, then wrap consecutive <li>
  // runs in a single <ul>. Numbered lists are wrapped after the bullet form
  // so that mixed lists still collapse cleanly.
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')

  html = html.replace(/\n\n/g, '</p><p>')
  html = `<p>${html}</p>`

  html = html.replace(/<p>\s*<\/p>/g, '')
  html = html.replace(/<p>(<h[23]>)/g, '$1')
  html = html.replace(/(<\/h[23]>)<\/p>/g, '$1')
  html = html.replace(/<p>(<table>)/g, '$1')
  html = html.replace(/(<\/table>)<\/p>/g, '$1')
  html = html.replace(/<p>(<ul>)/g, '$1')
  html = html.replace(/(<\/ul>)<\/p>/g, '$1')
  // Hoist <hr> out of the paragraph wrapper so it sits as a block element
  // (otherwise `<p><hr></p>` is invalid HTML and renders inconsistently).
  html = html.replace(/<p>(<hr\s*\/?>)<\/p>/g, '$1')
  html = html.replace(/<p>(<hr\s*\/?>)/g, '$1<p>')
  html = html.replace(/(<hr\s*\/?>)<\/p>/g, '</p>$1')

  return html
}

function normalizeTitleForCompare(s: string): string {
  return s
    .replace(/^[\d.]+\s*/, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toLowerCase()
}

/** Strip a leading "Methodology" line (heading, paragraph, or bullet) that
 * duplicates the rendered section heading. */
function stripDuplicateTitleLines(md: string, title: string): string {
  const target = normalizeTitleForCompare(title)
  if (!target) return md
  const lines = md.split('\n')
  let skip = 0
  for (let attempts = 0; attempts < 4 && skip < lines.length; attempts++) {
    const raw = lines[skip].trim()
    if (!raw) {
      skip++
      continue
    }
    const stripped = raw.replace(/^[#*\-•]+\s*/, '').replace(/^\d+\.\s*/, '')
    if (normalizeTitleForCompare(stripped) === target) {
      skip++
    } else {
      break
    }
  }
  return skip > 0 ? lines.slice(skip).join('\n') : md
}
