export interface BaselineExportData {
  projectName: string
  siteCode: string
  date: string
  designatedSites: {
    name: string
    code: string
    type: string
    area: string
    distance: string
  }[]
  speciesRecords: {
    name: string
    taxon: string
    source: string
    protected: boolean
    records: number
  }[]
  habitatTypes: {
    fossittCode: string
    name: string
    nlcLabel: string
    areaHa: number
    percentage: number
  }[]
  waterBodies: {
    name: string
    type: string
    wfdStatus: string
    distance: string
  }[]
  constraints: {
    finding: string
    type: string
    source: string
    constraint: string
  }[]
}

function renderTable(headers: string[], rows: string[][]): string {
  const ths = headers.map((h) => `<th>${h}</th>`).join('')
  const trs = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('\n')
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
}

/**
 * Generate a complete HTML document for the baseline report.
 * Users can open in a browser and print to PDF.
 */
export function generateBaselineReportHtml(data: BaselineExportData): string {
  const designatedSitesTable =
    data.designatedSites.length > 0
      ? renderTable(
          ['Site Name', 'Code', 'Type', 'Area', 'Distance (km)'],
          data.designatedSites.map((s) => [s.name, s.code, s.type, s.area, s.distance])
        )
      : '<p class="empty">No designated sites found.</p>'

  const speciesTable =
    data.speciesRecords.length > 0
      ? renderTable(
          ['Species', 'Taxon Group', 'Source', 'Protected', 'Records'],
          data.speciesRecords.map((s) => [
            s.name,
            s.taxon,
            s.source.toUpperCase(),
            s.protected ? 'Yes' : 'No',
            String(s.records),
          ])
        )
      : '<p class="empty">No species records found.</p>'

  const habitatTable =
    data.habitatTypes.length > 0
      ? renderTable(
          ['FOSSITT Code', 'Habitat Name', 'NLC Label', 'Area (ha)', '%'],
          data.habitatTypes.map((h) => [
            h.fossittCode,
            h.name,
            h.nlcLabel,
            h.areaHa.toFixed(1),
            h.percentage.toFixed(1) + '%',
          ])
        )
      : '<p class="empty">No habitat data available.</p>'

  const waterBodiesTable =
    data.waterBodies.length > 0
      ? renderTable(
          ['Name', 'Type', 'WFD Status', 'Distance (km)'],
          data.waterBodies.map((w) => [w.name, w.type, w.wfdStatus, w.distance])
        )
      : '<p class="empty">No aquatic features found.</p>'

  const constraintsTable =
    data.constraints.length > 0
      ? renderTable(
          ['Finding', 'Type', 'Source', 'Constraint'],
          data.constraints.map((c) => [c.finding, c.type, c.source.toUpperCase(), c.constraint])
        )
      : '<p class="empty">No constraints identified.</p>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Baseline Report — ${escapeHtml(data.projectName)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 14px; margin-bottom: 32px; }
  h2 { font-size: 18px; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
  th, td { padding: 8px 10px; text-align: left; border: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-weight: 600; }
  tr:nth-child(even) { background: #f9fafb; }
  .empty { color: #9ca3af; font-size: 13px; font-style: italic; padding: 16px 0; }
  .note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 16px; font-size: 12px; color: #1e40af; margin-top: 8px; }
  @media print {
    body { padding: 0; max-width: none; }
    h2 { page-break-after: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>Baseline Report</h1>
<div class="meta">
  <strong>${escapeHtml(data.projectName)}</strong> | Site Code: ${escapeHtml(data.siteCode)} | ${escapeHtml(data.date)}
</div>

<h2>1. Designated Sites</h2>
${designatedSitesTable}

<h2>2. Species Records</h2>
${speciesTable}

<h2>3. Preliminary Habitat Inventory</h2>
${habitatTable}
<div class="note">Based on National Land Cover 2018 (NLC). Requires field verification using FOSSITT Level 3 classification.</div>

<h2>4. Aquatic Environment</h2>
${waterBodiesTable}

<h2>5. Constraints Summary</h2>
${constraintsTable}

<div class="note" style="margin-top: 32px;">
  Interactive maps are available in the Dulra platform. Use your browser's Print function (Ctrl+P / Cmd+P) to save as PDF.
</div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
