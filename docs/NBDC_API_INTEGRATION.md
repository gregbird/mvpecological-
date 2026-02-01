# NBDC API Integration Guide

## Overview

This document describes how to integrate NBDC (National Biodiversity Data Centre) API with GBIF data to enrich species occurrence records with Irish-specific biodiversity information.

**Key Finding:** NBDC's WFS/GeoServer service is no longer available (returns 404), but species search and taxon detail APIs are still functional.

## Available NBDC API Endpoints

### 1. Species Search (DataTables)

**Endpoint:** `POST /Species/GetSpecies`

**Purpose:** Search for species by name and get NBDC taxonId

**Request:**

```
POST https://maps.biodiversityireland.ie/Species/GetSpecies
Content-Type: application/x-www-form-urlencoded

speciesName=Meles%20meles&taxonomicSource=0&iDisplayStart=0&iDisplayLength=10&sEcho=1
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| speciesName | Yes | Scientific or common name to search |
| taxonomicSource | Yes | `0` = Available Species, `1` = Full Dictionary |
| iDisplayStart | Yes | Pagination offset (0-based) |
| iDisplayLength | Yes | Number of results per page |
| sEcho | Yes | DataTables request identifier |
| speciesGroupId | No | Filter by species group |
| speciesDesignation | No | Filter by protection designation |

**Response (JSON):**

```json
{
  "iTotalRecords": 50945,
  "iTotalDisplayRecords": 1,
  "sEcho": 1,
  "aaData": [
    [
      "index",
      "119470",
      "Badger (Meles meles)",
      "Linnaeus, 1758",
      "Terrestrial mammal",
      "Species",
      "45792",
      "..."
    ]
  ]
}
```

**Response Array Columns:**

- `[0]` - Row index
- `[1]` - **TaxonId** (use this for subsequent API calls)
- `[2]` - Display name (Common Name + Scientific Name)
- `[3]` - Authority
- `[4]` - Taxon Group
- `[5]` - Taxonomic Rank
- `[6]` - Record Count
- `[7]` - Links/Actions

---

### 2. Taxon Details (ABP Service)

**Endpoint:** `POST /api/services/app/taxonService/GetTaxon`

**Purpose:** Get detailed information about a species including protection status

**Request:**

```
POST https://maps.biodiversityireland.ie/api/services/app/taxonService/GetTaxon?taxonId=119470
Content-Type: application/json

{}
```

**Response:**

```json
{
  "result": {
    "taxonId": 119470,
    "taxonName": "Meles meles",
    "commonName": "Badger",
    "formattedTaxonName": "Meles meles",
    "taxonGroupName": "Terrestrial mammal",
    "taxonRankName": "Species",
    "taxonAuthority": "(Linnaeus, 1758)",
    "designations": "Protected Species: Wildlife Acts",
    "recordCount": 45792,
    "tenKRecordCount": 936,
    "fiftyKRecordCount": 127,
    "oldestRecord": "1911-01-01T00:00:00",
    "newestRecord": "2023-04-30T00:00:00",
    "taxonVersionKey": "NBNSYS0000005186"
  },
  "success": true
}
```

**Key Fields:**
| Field | Description |
|-------|-------------|
| taxonId | NBDC internal ID |
| taxonName | Scientific name |
| commonName | English common name |
| designations | Protection status (Wildlife Acts, Habitats Directive, etc.) |
| recordCount | Total occurrence records in Ireland |
| tenKRecordCount | Number of 10km grid squares with records |
| fiftyKRecordCount | Number of 50km grid squares with records |
| oldestRecord | Date of oldest record |
| newestRecord | Date of most recent record |

---

### 3. Taxon Profile (ABP Service)

**Endpoint:** `POST /api/services/app/taxonProfileService/GetTaxonProfile`

**Purpose:** Get extended profile information (ecology, habitat, conservation)

**Request:**

```
POST https://maps.biodiversityireland.ie/api/services/app/taxonProfileService/GetTaxonProfile?taxonId=119470
Content-Type: application/json

{}
```

**Response:**

```json
{
  "result": {
    "taxonId": 119470,
    "taxonName": "Meles meles",
    "conservationStatus": "...",
    "legalStatus": "...",
    "nativeStatus": "...",
    "habitat": "...",
    "irishDistribution": "...",
    "ecology": "...",
    "diet": "...",
    "irishName": "...",
    "images": [...]
  },
  "success": true
}
```

**Note:** Many species have empty profile fields. Profile data is manually curated.

---

### 4. Other Useful Endpoints

#### Taxon Name Autocomplete

```
POST /api/services/app/taxonService/GetTaxonNames?searchString=badger
Content-Type: application/json
{}

Response: {"result": ["Badger (Meles meles)"], "success": true}
```

⚠️ Returns only names, not taxonIds. Use `/Species/GetSpecies` instead.

#### Taxon Designation Summaries

```
POST /api/services/app/taxonService/GetTaxonDesignationSummaries
Content-Type: application/json
{}

Response: {
  "result": [
    {"taxonDesignationId": 1, "name": "Invasive Species", "speciesCount": 257},
    {"taxonDesignationId": 2, "name": "Protected Species", "speciesCount": 431},
    {"taxonDesignationId": 3, "name": "Threatened Species", "speciesCount": 965}
  ]
}
```

#### Dataset Groups

```
POST /api/services/app/datasetService/GetDatasetGroups
Content-Type: application/json
{}

Response includes: Terrestrial mammals (10), Birds (3), Amphibians & reptiles (25), etc.
```

#### Species List by Dataset

```
POST /api/services/app/visualisationService/GetSpeciesListForDataset?datasetId=4
Content-Type: application/json
{}

Returns species in "Badger and Habitats Survey of Ireland" dataset with taxonIds.
```

---

## Integration Workflow: GBIF → NBDC Enrichment

### Step 1: Get Species from GBIF

```typescript
// Search GBIF for species in a bounding box
const gbifResults = await fetch(
  `https://api.gbif.org/v1/occurrence/search?` +
    `decimalLatitude=${lat1},${lat2}&decimalLongitude=${lng1},${lng2}&limit=100`
)
const occurrences = await gbifResults.json()

// Extract unique species names
const speciesNames = [...new Set(occurrences.results.map((r) => r.scientificName))]
```

### Step 2: Search NBDC for TaxonId

```typescript
async function searchNBDCSpecies(scientificName: string): Promise<number | null> {
  const response = await fetch('https://maps.biodiversityireland.ie/Species/GetSpecies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      speciesName: scientificName,
      taxonomicSource: '0',
      iDisplayStart: '0',
      iDisplayLength: '5',
      sEcho: '1',
    }),
  })

  const data = await response.json()

  // Find exact match
  for (const row of data.aaData) {
    const displayName = row[2] // "Badger (Meles meles)"
    if (displayName.includes(scientificName)) {
      return parseInt(row[1]) // taxonId
    }
  }

  return null
}
```

### Step 3: Get NBDC Details

```typescript
interface NBDCTaxonDetails {
  taxonId: number
  scientificName: string
  commonName: string
  designations: string | null
  recordCount: number
  tenKGridSquares: number
  oldestRecord: string | null
  newestRecord: string | null
}

async function getNBDCTaxonDetails(taxonId: number): Promise<NBDCTaxonDetails | null> {
  const response = await fetch(
    `https://maps.biodiversityireland.ie/api/services/app/taxonService/GetTaxon?taxonId=${taxonId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }
  )

  const data = await response.json()

  if (!data.success || !data.result) {
    return null
  }

  const r = data.result
  return {
    taxonId: r.taxonId,
    scientificName: r.taxonName,
    commonName: r.commonName,
    designations: r.designations,
    recordCount: r.recordCount,
    tenKGridSquares: r.tenKRecordCount,
    oldestRecord: r.oldestRecord,
    newestRecord: r.newestRecord,
  }
}
```

### Step 4: Combine Data

```typescript
interface EnrichedSpeciesRecord {
  // From GBIF
  gbifKey: number
  scientificName: string
  decimalLatitude: number
  decimalLongitude: number
  eventDate: string

  // From NBDC (enrichment)
  nbdcTaxonId?: number
  commonName?: string
  protectionStatus?: string
  totalIrishRecords?: number
  gridSquaresCovered?: number
  recordDateRange?: string
}

async function enrichWithNBDC(gbifRecord: any): Promise<EnrichedSpeciesRecord> {
  const enriched: EnrichedSpeciesRecord = {
    gbifKey: gbifRecord.key,
    scientificName: gbifRecord.scientificName,
    decimalLatitude: gbifRecord.decimalLatitude,
    decimalLongitude: gbifRecord.decimalLongitude,
    eventDate: gbifRecord.eventDate,
  }

  // Search NBDC
  const taxonId = await searchNBDCSpecies(gbifRecord.scientificName)

  if (taxonId) {
    const nbdcDetails = await getNBDCTaxonDetails(taxonId)

    if (nbdcDetails) {
      enriched.nbdcTaxonId = nbdcDetails.taxonId
      enriched.commonName = nbdcDetails.commonName
      enriched.protectionStatus = nbdcDetails.designations
      enriched.totalIrishRecords = nbdcDetails.recordCount
      enriched.gridSquaresCovered = nbdcDetails.tenKGridSquares

      if (nbdcDetails.oldestRecord && nbdcDetails.newestRecord) {
        enriched.recordDateRange = `${nbdcDetails.oldestRecord.slice(0, 4)} - ${nbdcDetails.newestRecord.slice(0, 4)}`
      }
    }
  }

  return enriched
}
```

---

## Protection Status Values

NBDC tracks species under various Irish and EU designations:

| Designation                    | Description                                   |
| ------------------------------ | --------------------------------------------- |
| Wildlife Acts                  | Protected under Irish Wildlife Acts 1976-2012 |
| EU Habitats Directive Annex II | Species requiring SAC designation             |
| EU Habitats Directive Annex IV | Strictly protected species                    |
| EU Habitats Directive Annex V  | Species subject to management measures        |
| EU Birds Directive Annex I     | Bird species requiring special conservation   |
| Flora Protection Order         | Protected plant species in Ireland            |
| CITES                          | Internationally trade-controlled species      |

---

## Rate Limiting & Best Practices

1. **Cache taxonId lookups** - Species names don't change; cache the name→taxonId mapping
2. **Batch requests** - When enriching multiple records, deduplicate species first
3. **Handle failures gracefully** - NBDC API may be slow or unavailable
4. **Respect server load** - Add delays between requests (100-200ms recommended)

---

## Deprecated/Non-functional Endpoints

The following NBDC services are no longer available:

| Service                           | Status              | Alternative                |
| --------------------------------- | ------------------- | -------------------------- |
| `/geoserver/ows` (WFS)            | 404 - Removed       | Use GBIF for bbox searches |
| `GetStandardSpeciesVisualisation` | Internal Error      | N/A                        |
| `GetTaxonsQuery`                  | Serialization Error | Use `/Species/GetSpecies`  |

---

## Example: Protected Species Check

```typescript
async function isProtectedSpecies(scientificName: string): Promise<{
  isProtected: boolean
  designations: string[]
}> {
  const taxonId = await searchNBDCSpecies(scientificName)

  if (!taxonId) {
    return { isProtected: false, designations: [] }
  }

  const details = await getNBDCTaxonDetails(taxonId)

  if (!details?.designations) {
    return { isProtected: false, designations: [] }
  }

  // Parse designations string
  // Format: "Protected Species: Wildlife Acts, EU Habitats Directive Annex IV"
  const designations = details.designations
    .split(',')
    .map((d) => d.trim())
    .filter((d) => d.length > 0)

  return {
    isProtected: designations.length > 0,
    designations,
  }
}

// Usage
const result = await isProtectedSpecies('Meles meles')
// { isProtected: true, designations: ['Protected Species: Wildlife Acts'] }
```

---

## References

- NBDC Maps Portal: https://maps.biodiversityireland.ie/
- NBDC Main Site: https://biodiversityireland.ie/
- GBIF NBDC Dataset: https://www.gbif.org/dataset/66a51aea-8662-4685-9fd0-9d4b596617d5
- Irish Wildlife Acts: https://www.npws.ie/legislation
