import type { ElementType } from 'react'
import { Waves, Droplets, Mountain } from 'lucide-react'

export interface AquaticDeepResearchSite {
  waterBodyName: string
  waterBodyType: 'River' | 'Lake' | 'Catchment'
  waterBodyCode?: string
  wfdStatus?: string
  catchmentName?: string
  catchmentId?: string
  distance?: number
  areaHa?: number
  lengthKm?: number
}

export interface LinkedSAC {
  siteCode: string
  siteName: string
  matchScore: number
  matchReason: string
  siteArea?: number
  sscoUrl?: string
  aquaticHabitats: Array<{ code: string; name: string; description: string }>
  aquaticSpecies: Array<{ code: string; name: string; commonName: string }>
  allHabitats: Array<{ code: string; name: string }>
  allSpecies: Array<{ code: string; name: string }>
}

export interface WFDStatusHistory {
  period: string
  status: string
  details: string[]
}

export interface WFDTrend {
  ParameterName: string
  TrendDesc: string
}

export interface WFDFailure {
  Name: string
}

export interface WFDConnectivity {
  Code: string
  Name: string
  Type: string
  Direction: 'Input' | 'Output'
}

export interface WFDData {
  currentStatus?: string
  risk?: string
  statusHistory: WFDStatusHistory[]
  trends: WFDTrend[]
  failures: WFDFailure[]
  connectivity: WFDConnectivity[]
  catchmentName?: string
  subCatchmentName?: string
}

export interface AquaticResearchResult {
  summary: string
  linkedSACs: LinkedSAC[]
  wfdData: WFDData | null
  resources: {
    catchmentsUrl: string
    epaWaterMapUrl: string
    hydroNetUrl: string
    wfdDataUrl: string
    waterBodyUrl?: string
    sacUrl?: string
    sscoUrl?: string
    siUrl?: string
  }
}

// WFD Status colors
export const WFD_STATUS_COLORS: Record<string, string> = {
  High: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Good: 'bg-green-100 text-green-700 border-green-300',
  Moderate: 'bg-amber-100 text-amber-700 border-amber-300',
  Poor: 'bg-orange-100 text-orange-700 border-orange-300',
  Bad: 'bg-red-100 text-red-700 border-red-300',
}

// Water body type icons
export const WATER_BODY_ICONS: Record<string, ElementType> = {
  River: Waves,
  Lake: Droplets,
  Catchment: Mountain,
}
