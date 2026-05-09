// Public type contracts for the PDF generator. Lives outside `pdf/` so the
// step component (`final-submission-step.tsx`) can import branding shapes
// without pulling the full pdf-generator chunk into the bundle.

import type { ReportSection } from '@/lib/supabase/queries/reports'
import type { AppendixData } from './appendix-data'

export interface PdfBrandingOptions {
  /** Base64 data URL (PNG/JPG/SVG). Embedded directly into jsPDF. */
  logoDataUrl?: string | null
  /** Hex string (e.g. '#10b981') for headings, banners, accents. */
  primaryColor?: string
  /** Hex string for secondary accents. */
  secondaryColor?: string
  /** jsPDF built-in font family. */
  fontFamily?: 'helvetica' | 'times' | 'courier'
  coverPage?: {
    showLogo?: boolean
    logoPosition?: 'top-left' | 'top-center' | 'top-right'
    subtitle?: string
  }
  header?: {
    enabled?: boolean
    text?: string
  }
  footer?: {
    enabled?: boolean
    text?: string
    showPageNumbers?: boolean
  }
}

export interface PeaExportOptions {
  title: string
  preparedFor: string
  siteCode: string
  /** Multi-site project: full list of site codes for cover page rendering */
  siteCodes?: string[]
  /** When set, the export is narrowed to a single site of a multi-site project */
  activeSiteId?: string | null
  /** Friendly site code label, used as filename suffix and cover page banner */
  activeSiteCode?: string
  /** Report type key (e.g. 'pea', 'ecia', 'aa_screening') for cover page title */
  reportType?: string
  version: number
  date: string
  sections: ReportSection[]
  appendices: string[]
  appendixData?: AppendixData
  /** Per-organization branding — overrides Dulra defaults for colours, font,
   *  cover logo, header, footer. Falls back to platform defaults when omitted
   *  so legacy callers keep working. */
  branding?: PdfBrandingOptions
  /** Project name for placeholder substitution in header/footer text */
  projectName?: string
}

export const REPORT_TYPE_TITLES: Record<string, string> = {
  pea: 'PRELIMINARY ECOLOGICAL APPRAISAL',
  ecia: 'ECOLOGICAL IMPACT ASSESSMENT',
  aa_screening: 'APPROPRIATE ASSESSMENT SCREENING',
  aa_stage2: 'NATURA IMPACT STATEMENT',
  nia: 'NATURA IMPACT STATEMENT',
  bat_survey: 'BAT SURVEY REPORT',
  bird_survey: 'BIRD SURVEY REPORT',
  habitat_survey: 'HABITAT SURVEY REPORT',
}

export const APPENDIX_LABELS: Record<string, string> = {
  habitat_map: 'Habitat Map',
  habitat_data: 'Habitat Data',
  designated_sites: 'Designated Sites',
  species_list: 'Species List',
  photographs: 'Site Photographs',
  survey_datasheets: 'Survey Datasheets',
  aquatic_data: 'Aquatic Features',
  legislation: 'Legislation References',
}
