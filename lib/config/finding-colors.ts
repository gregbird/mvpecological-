import type { ElementType } from 'react'
import { Waves, Droplet, Mountain } from 'lucide-react'

/** Source badge colors keyed by finding source */
export const SOURCE_COLORS: Record<string, string> = {
  npws: 'bg-emerald-100 text-emerald-700',
  gbif: 'bg-purple-100 text-purple-700',
  nbdc: 'bg-blue-100 text-blue-700',
  epa: 'bg-cyan-100 text-cyan-700',
  fpo: 'bg-rose-100 text-rose-700',
  manual: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  company_reports: 'bg-indigo-100 text-indigo-700',
}

/** Designated site type badge colors (SAC, SPA, NHA, pNHA) */
export const SITE_TYPE_COLORS: Record<string, string> = {
  SAC: 'bg-emerald-100 text-emerald-700',
  SPA: 'bg-sky-100 text-sky-700',
  NHA: 'bg-amber-100 text-amber-700',
  pNHA: 'bg-orange-100 text-orange-700',
}

/** Site type filter button colors (active/inactive variants) */
export const SITE_TYPE_FILTER_COLORS: Record<string, { active: string; inactive: string }> = {
  SAC: {
    active: 'bg-emerald-600 text-white',
    inactive: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
  },
  SPA: { active: 'bg-sky-600 text-white', inactive: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
  NHA: {
    active: 'bg-amber-600 text-white',
    inactive: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
  },
  pNHA: {
    active: 'bg-orange-600 text-white',
    inactive: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  },
}

export const FALLBACK_SITE_TYPE_FILTER_COLORS = {
  active: 'bg-gray-600 text-white',
  inactive:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
}

/** EPA site type configs with icons and colors */
export const EPA_SITE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: ElementType }
> = {
  River: {
    label: 'River',
    color: 'bg-blue-50 text-blue-700',
    icon: Waves,
  },
  Lake: {
    label: 'Lake',
    color: 'bg-cyan-50 text-cyan-700',
    icon: Droplet,
  },
  Catchment: {
    label: 'Catchment',
    color: 'bg-slate-50 text-slate-700',
    icon: Mountain,
  },
}
