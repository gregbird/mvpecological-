/**
 * Flora Protection Order (FPO) 2022 Species Lookup
 * Searches protected plant species by grid reference
 */

export interface FPORecord {
  latinName: string
  commonName: string
  date: string
  year: number
  hectad: string
  monad: string
  gridReference: string
  location: string
  locationName: string
  surveyName: string
  isSensitive: boolean
}

// CSV'den parse edilen veriler (lazy loaded)
let fpoData: FPORecord[] | null = null

/**
 * CSV dosyasını parse eder ve cache'ler
 */
async function loadFPOData(): Promise<FPORecord[]> {
  if (fpoData) return fpoData

  const response = await fetch('/data/fpo-2022.csv')
  const csvText = await response.text()

  const lines = csvText.split('\n')
  const records: FPORecord[] = []

  // İlk satır header, atla
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // CSV parse (basit - tırnak içinde virgül yoksa çalışır)
    const parts = parseCSVLine(line)

    if (parts.length >= 11) {
      records.push({
        latinName: parts[0] || '',
        commonName: parts[1] || '',
        date: parts[2] || '',
        year: parseInt(parts[3]) || 0,
        hectad: parts[4] || '',
        monad: parts[5] || '',
        gridReference: parts[6] || '',
        location: parts[7] || '',
        locationName: parts[8] || '',
        surveyName: parts[9] || '',
        isSensitive: parts[11]?.toLowerCase() === 'yes',
      })
    }
  }

  fpoData = records
  return records
}

/**
 * CSV satırını parse eder (tırnak içi virgülleri destekler)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Grid reference'a göre FPO korumalı türleri arar
 * @param gridRef - Irish Grid Reference (örn: "G 7045" veya "G7045")
 * @returns Eşleşen FPO kayıtları
 */
export async function searchFPOByGridRef(gridRef: string): Promise<FPORecord[]> {
  const data = await loadFPOData()

  // Grid ref'i normalize et (boşlukları kaldır, büyük harf)
  const normalized = gridRef.replace(/\s/g, '').toUpperCase()

  // Hectad (ilk 3 karakter: harf + 2 rakam)
  const hectad = normalized.substring(0, 3)

  // Monad (ilk 5 karakter: harf + 4 rakam) - varsa
  const monad = normalized.length >= 5 ? normalized.substring(0, 5) : null

  // Önce Monad ile ara (daha spesifik)
  if (monad) {
    const monadMatches = data.filter(
      (r) => r.monad.toUpperCase() === monad || r.monad.toUpperCase().startsWith(monad)
    )
    if (monadMatches.length > 0) {
      return monadMatches
    }
  }

  // Monad bulamazsa Hectad ile ara (daha geniş)
  return data.filter((r) => r.hectad.toUpperCase() === hectad)
}

/**
 * Birden fazla grid reference için toplu arama
 */
export async function searchFPOByMultipleGridRefs(gridRefs: string[]): Promise<FPORecord[]> {
  const allResults: FPORecord[] = []
  const seen = new Set<string>()

  for (const gridRef of gridRefs) {
    const results = await searchFPOByGridRef(gridRef)
    for (const record of results) {
      // Duplicate kontrolü (aynı tür + aynı konum)
      const key = `${record.latinName}-${record.gridReference}`
      if (!seen.has(key)) {
        seen.add(key)
        allResults.push(record)
      }
    }
  }

  return allResults
}

/**
 * FPO sonuçlarını AI prompt için özetler
 */
export function formatFPOForPrompt(records: FPORecord[]): string {
  if (records.length === 0) {
    return 'No Flora Protection Order (FPO) 2022 protected species records found in this area.'
  }

  // Türlere göre grupla
  const speciesMap = new Map<string, { commonName: string; locations: string[]; count: number }>()

  for (const record of records) {
    const existing = speciesMap.get(record.latinName)
    if (existing) {
      existing.count++
      if (record.locationName && !existing.locations.includes(record.locationName)) {
        existing.locations.push(record.locationName)
      }
    } else {
      speciesMap.set(record.latinName, {
        commonName: record.commonName,
        locations: record.locationName ? [record.locationName] : [],
        count: 1,
      })
    }
  }

  const lines = [
    `Flora Protection Order (FPO) 2022 Protected Species in this area (${records.length} records):`,
    '',
  ]

  for (const [latinName, info] of speciesMap) {
    const locationText =
      info.locations.length > 0 ? ` - recorded at: ${info.locations.slice(0, 3).join(', ')}` : ''
    lines.push(
      `- ${info.commonName} (${latinName})${info.count > 1 ? ` [${info.count} records]` : ''}${locationText}`
    )
  }

  lines.push('')
  lines.push(
    'These species are legally protected under the Flora Protection Order 2022. Any development in this area must consider potential impacts on these species.'
  )

  return lines.join('\n')
}

/**
 * Hassas türleri filtreler (sensitive species)
 */
export async function getSensitiveSpecies(gridRef: string): Promise<FPORecord[]> {
  const results = await searchFPOByGridRef(gridRef)
  return results.filter((r) => r.isSensitive)
}
