import type { PdfBrandingOptions } from '../pdf-generator-types'

// Convert "#10b981" or "#fff" → [16, 185, 129] for jsPDF colour setters.
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

export interface PdfTheme {
  primary: [number, number, number]
  secondary: [number, number, number]
  font: 'helvetica' | 'times' | 'courier'
  logoDataUrl: string | null
  coverPage: {
    showLogo: boolean
    logoPosition: 'top-left' | 'top-center' | 'top-right'
    subtitle: string
  }
  header: {
    enabled: boolean
    text: string
  }
  footer: {
    enabled: boolean
    text: string
    showPageNumbers: boolean
  }
}

export function resolveTheme(branding: PdfBrandingOptions | undefined): PdfTheme {
  const primary = (branding?.primaryColor && hexToRgb(branding.primaryColor)) || [44, 82, 52]
  const secondary = (branding?.secondaryColor && hexToRgb(branding.secondaryColor)) || [31, 41, 55]
  return {
    primary: primary as [number, number, number],
    secondary: secondary as [number, number, number],
    font: branding?.fontFamily ?? 'helvetica',
    logoDataUrl: branding?.logoDataUrl ?? null,
    coverPage: {
      showLogo: branding?.coverPage?.showLogo ?? true,
      logoPosition: branding?.coverPage?.logoPosition ?? 'top-center',
      subtitle: branding?.coverPage?.subtitle ?? '',
    },
    header: {
      enabled: branding?.header?.enabled ?? false,
      text: branding?.header?.text ?? '',
    },
    footer: {
      enabled: branding?.footer?.enabled ?? true,
      text: branding?.footer?.text ?? '',
      showPageNumbers: branding?.footer?.showPageNumbers ?? true,
    },
  }
}

export function applyPlaceholders(
  text: string,
  ctx: { projectName?: string; siteCode?: string }
): string {
  return text
    .replaceAll('{{project_name}}', ctx.projectName ?? '')
    .replaceAll('{{site_code}}', ctx.siteCode ?? '')
}
