# Greg's Latest Feedback - Implementation Plan

> **Date:** 8 February 2026
> **Status:** Research & Planning
> **Priority:** High

---

## Table of Contents

1. [Overview](#1-overview)
2. [Feature 1: Caspio Bird Database (I-WeBS)](#2-feature-1-caspio-bird-database-i-webs)
3. [Feature 2: Automated Web Search](#3-feature-2-automated-web-search)
4. [Feature 3: Ecological Summary Auto-Generation](#4-feature-3-ecological-summary-auto-generation)
5. [Feature 4: Smart Scoping](#5-feature-4-smart-scoping)
6. [Feature 5: Photo & Asset Management](#6-feature-5-photo--asset-management)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Overview

Greg's latest feedback introduces 5 new features to enhance the Desk Research and Field Survey phases:

| #   | Feature              | Current Status | Integration Point       | Priority  |
| --- | -------------------- | -------------- | ----------------------- | --------- |
| 1   | Caspio Bird Database | ❌ Not Started | Species Records Substep | ❓ TBD    |
| 2   | Automated Web Search | ❌ Not Started | Desk Assessment Step    | ❓ TBD    |
| 3   | Ecological Summary   | ✅ Done        | Desk Assessment Step    | 🟡 Medium |
| 4   | Smart Scoping        | ✅ Done        | Field Survey Step       | 🔴 High   |
| 5   | Photo Gallery        | 🟡 Partial     | Field Survey Step       | 🟡 Medium |

---

## 2. Feature 1: Caspio Bird Database (I-WeBS)

### 2.1 Greg's Original Request

> "Query and integrate data from a comprehensive species bird database. The search mechanism must allow for highly granular location-based filtering. Within the selected site, the system should execute a final search to identify all bird species records. The ultimate goal is to retrieve the **mean number** and **name** for all recorded bird species within the defined area."
>
> **URL:** https://c0cre470.caspio.com/dp/4BAE30005dbe20614b404564be88

### 2.2 Research Findings

#### What is the Caspio URL?

The URL points to the **Irish Wetland Bird Survey (I-WeBS)** database interface. I-WeBS is:

- Ireland's programme for monitoring wintering waterbird populations
- Running since 1994/95
- Coordinated by BirdWatch Ireland
- Funded by NPWS
- Covers ~250 sites and 750 subsites annually

#### Data Available

The Caspio interface provides:

- **County Selection:** Dropdown with 26 Irish counties
- **Site Selection:** ~800 subsites
- **Data Tables:** Annual peak counts per species per site
- **Trend Reports:** Species population trends over time
- **Interactive Map:** All I-WeBS monitoring locations

#### API Access Options

| Option                | Description                        | Availability                      | Cost                                 |
| --------------------- | ---------------------------------- | --------------------------------- | ------------------------------------ |
| **Caspio REST API**   | OAuth 2.0 authenticated API        | Requires account owner permission | ❓ Unknown                           |
| **Data Request Form** | Official BirdWatch Ireland process | Available                         | Free for academic, ❓ for commercial |
| **data.gov.ie**       | Historical data (1994-2001)        | CSV download                      | Free (CC-BY 4.0)                     |
| **Web Scraping**      | Parse Caspio iframe responses      | Technically possible              | Legal grey area                      |

#### What the Caspio Page Actually Does

From analyzing the page (screenshot + web fetch):

```
┌─────────────────────────────────────────────────────────────┐
│ The Irish Wetland Bird Survey (I-WeBS)                      │
│                                                             │
│ County: [Leitrim        ▼]                                  │
│ Site:   [Ballinamore Lakes ▼]                               │
│                                                             │
│ [      SEARCH      ]                                        │
│                                                             │
│ Results: Site Summary Table                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Species         │ 2015 │ 2016 │ ... │ 2024 │ Mean      │ │
│ │ Whooper Swan    │  45  │  52  │ ... │  38  │   43      │ │
│ │ Teal            │ 120  │ 145  │ ... │  98  │  112      │ │
│ │ Mallard         │  78  │  82  │ ... │  65  │   74      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight:** This is NOT an API - it's a web form!

- User selects **County** → **Site** dropdown populates dynamically
- Click **SEARCH** → Returns site summary table
- Shows **annual peak counts** for past 10 winters
- **No bbox/coordinate search** - only by pre-defined site names

#### Integration Challenge

Our system searches by **project boundary coordinates**, but I-WeBS only allows search by **pre-defined site names**. We need to:

1. Convert project coordinates → nearest I-WeBS site(s)
2. Or ask Greg if BirdWatch Ireland can provide API access

#### Caspio API Technical Details (If We Get Access)

If we get API access:

- **Auth:** OAuth 2.0 with client_credentials flow
- **Endpoint:** `https://<account>.caspio.com/rest/v2/`
- **Token:** POST to `/oauth/token` with client_id/secret
- **Data:** Access tables/views via REST

**Reference:** [Caspio REST API Authentication](https://howto.caspio.com/web-services-api/rest-api/authenticating-rest/)

### 2.3 Comparison: GBIF vs I-WeBS

| Feature         | GBIF (Current)         | I-WeBS (Proposed)      |
| --------------- | ---------------------- | ---------------------- |
| **Coverage**    | Global                 | Ireland only           |
| **Species**     | All taxa               | Waterbirds only        |
| **Data Type**   | Individual occurrences | Aggregated counts      |
| **Mean Number** | ❌ Not available       | ✅ Available           |
| **API**         | ✅ Free, public        | ❌ Requires permission |
| **Real-time**   | ✅ Yes                 | ❓ Unknown             |

### 2.4 Integration Options

#### Option A: Add Tab to Species Substep (Recommended)

Add "Waterbirds (I-WeBS)" tab alongside existing GBIF/NBDC tabs:

```
┌─────────────────────────────────────────────────────────────┐
│ Species Records                                              │
│ ─────────────────────────────────────────────────────────── │
│ [All] [GBIF] [NBDC] [Protected] [Waterbirds (I-WeBS)]       │
│                                                              │
│ 🐦 Waterbird Species in Area                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Whooper Swan (Cygnus cygnus)                            │ │
│ │ Mean Count: 45 | Peak: 78 | Site: Tacumshin Lake       │ │
│ │ Trend: ↗️ Increasing | Conservation: Amber Listed       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Files to modify:**

- `components/steps/data-gathering/species-records-substep.tsx`
- New: `lib/external-apis/iwebs.ts`

#### Option B: Enrich GBIF Bird Records

When GBIF returns bird records, automatically fetch I-WeBS data for the same area and merge:

```typescript
// Pseudo-code
const gbifBirds = gbifResults.filter((r) => r.class === 'Aves')
const iweBsData = await fetchIWeBSForArea(projectBoundary)
const enrichedBirds = mergeBirdData(gbifBirds, iweBsData)
```

### 2.5 Questions for Greg

1. **API Access:** Do you have contact with BirdWatch Ireland for API access?
2. **Data Scope:** Is I-WeBS (waterbirds only) sufficient, or do you need all bird species?
3. **Mean Number:** Is this critical? GBIF has occurrence counts but not population means.
4. **Fallback:** If no API access, should we use data.gov.ie historical data (1994-2001)?

### 2.6 Implementation Tasks

- [ ] **2.6.1** Contact BirdWatch Ireland for API access (Greg to confirm)
- [ ] **2.6.2** Create `lib/external-apis/iwebs.ts` API client
- [ ] **2.6.3** Add "Waterbirds" tab to Species Records substep
- [ ] **2.6.4** Create I-WeBS finding display component
- [ ] **2.6.5** Test with sample sites

**Status:** ⏸️ BLOCKED - Waiting for API access confirmation

---

## 3. Feature 2: Automated Web Search

### 3.1 Greg's Original Request

> "Perform automated, targeted desk research to gather relevant ecological reports and contextual information from the public web. The search query should be dynamically constructed using: location area name, known habitats within the area, identified species, and relevant water features."
>
> **Prompt Template:** "Find an ecological report that is relevant to this area [LOCATION], is associated with these habitats [HABITATS], and relates to the report sector '[SECTOR]'."

### 3.2 Research Findings

#### Available Data Sources in Ireland

| Source                      | Description                                     | API?             | Data Type                 |
| --------------------------- | ----------------------------------------------- | ---------------- | ------------------------- |
| **EIA Portal**              | Environmental Impact Assessments since May 2017 | ❌ Web only      | Reports, applications     |
| **An Coimisiún Pleanála**   | Planning appeals and decisions                  | ❌ Web search    | Case documents            |
| **EPA Open Data**           | Environmental datasets                          | ✅ REST API      | Water quality, emissions  |
| **County Council Planning** | Local planning applications                     | ❌ Varies        | Planning files            |
| **NPWS**                    | Conservation reports                            | ❌ PDF downloads | Article 17, site synopses |

**Reference Links:**

- [EIA Portal](https://www.gov.ie/en/publication/9f9e7-eia-portal/)
- [An Coimisiún Pleanála Case Search](https://www.pleanala.ie/en-ie/case-search)
- [EPA Open Data](https://data.epa.ie/)

#### Technical Approaches

| Approach                     | Pros                            | Cons                                 |
| ---------------------------- | ------------------------------- | ------------------------------------ |
| **OpenAI Web Search**        | Easy, intelligent summarization | Cost per query, may hallucinate      |
| **Google Custom Search API** | Reliable, customizable          | $5/1000 queries after free tier      |
| **Direct Portal Scraping**   | Free, precise                   | Fragile, legal concerns, maintenance |
| **Hybrid**                   | Best of both                    | Complex implementation               |

### 3.3 Data We Already Have

When user reaches Desk Assessment, we have:

```typescript
// From Data Gathering step
{
  projectLocation: "Ballymun, Dublin",
  townland: "Ballymun",
  county: "Dublin",
  gridReference: "O 145 415",

  designatedSites: [
    { name: "South Dublin Bay SAC", code: "000210", distance: "3.2km" }
  ],

  habitatsFound: ["GA1", "WL1", "FW2"], // From Deep Research

  speciesRecords: [
    { name: "Otter", scientificName: "Lutra lutra", protected: true }
  ],

  aquaticFeatures: [
    { name: "River Tolka", type: "River", wfdStatus: "Moderate" }
  ],

  projectSector: "Housing Development" // NEW - needs to be added
}
```

### 3.4 Proposed Implementation

#### Add to Desk Assessment Step (Step 3)

New tab: "Related Reports"

```
┌─────────────────────────────────────────────────────────────┐
│ Desk Assessment                                              │
│ ─────────────────────────────────────────────────────────── │
│ [AI Insights] [Assessment] [Field Plan] [Related Reports]   │
│                                                              │
│ 🔍 Search for Ecological Reports                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Location: Ballymun, Dublin                              │ │
│ │ Habitats: GA1, WL1, FW2                                 │ │
│ │ Sector: [Housing Development ▼]                         │ │
│ │                                                          │ │
│ │ [🔍 Search Reports]                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ 📄 Found Reports (3)                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📄 EIA for Ballymun Regeneration (2019)                 │ │
│ │ Source: An Coimisiún Pleanála | Ref: ABP-304567        │ │
│ │ Relevance: High - Same location, housing sector        │ │
│ │ [View PDF] [Save to Project]                            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### API Endpoint

```typescript
// POST /api/search/ecological-reports
{
  location: string,      // "Ballymun, Dublin"
  county: string,        // "Dublin"
  habitats: string[],    // ["GA1", "WL1"]
  species: string[],     // ["Otter", "Badger"]
  sector: string,        // "Housing Development"
  waterFeatures: string[] // ["River Tolka"]
}

// Response
{
  reports: [
    {
      title: string,
      source: string,     // "EIA Portal" | "ABP" | "NPWS"
      url: string,
      date: string,
      relevanceScore: number,
      summary: string,    // AI-generated 2-line summary
      matchedTerms: string[]
    }
  ]
}
```

### 3.5 Project Sector Field

Need to add "Sector" field to project creation:

```typescript
type ProjectSector =
  | 'housing'
  | 'wind_farm'
  | 'solar_farm'
  | 'infrastructure'
  | 'industrial'
  | 'commercial'
  | 'forestry'
  | 'quarry'
  | 'port'
  | 'other'
```

**Files to modify:**

- `app/(dashboard)/projects/new/page.tsx` - Add sector dropdown
- `types/database.ts` - Add sector to Project type
- Database migration - Add sector column

### 3.6 Questions for Greg

1. **Search Scope:** Which sources are most valuable? (EIA Portal, ABP, NPWS, all?)
2. **Sector Field:** Is the list above sufficient? What sectors do you commonly work with?
3. **AI vs Manual:** Should we use AI to find/summarize, or just provide search interface?
4. **Cost:** OpenAI web search costs ~$0.01-0.05 per search. Acceptable?

### 3.7 Implementation Tasks

- [ ] **3.7.1** Add `sector` field to project creation form
- [ ] **3.7.2** Create database migration for sector column
- [ ] **3.7.3** Create `/api/search/ecological-reports` endpoint
- [ ] **3.7.4** Implement OpenAI web search integration
- [ ] **3.7.5** Add "Related Reports" tab to Desk Assessment
- [ ] **3.7.6** Create report card component with save functionality

**Status:** ⏸️ BLOCKED - Waiting for Greg's input on sources and approach

---

## 4. Feature 3: Ecological Summary Auto-Generation

### 4.1 Greg's Original Request

> "Automatically synthesize the collected findings into a structured and comprehensive Ecological Summary. The summary should be presented in a clear, easily digestible format with:
>
> - Habitats: Description and condition of primary habitat types found.
> - Species (Bird, Fauna, and Flora): A list of key species identified.
> - Aquatic Features: Details regarding significant water features, including their ecological status.
> - Designated Areas: A comprehensive list of all conservation designation areas relevant to the site."

### 4.2 Current State

**Already exists:** `/api/ai/desk-insights` endpoint generates AI analysis.

**What's different:**

1. Current format doesn't match Greg's 4-category structure
2. Not auto-triggered (requires manual button click)
3. Output is markdown prose, not structured bullet points

### 4.3 Proposed Changes

#### Update Output Format

**Current format:**

```markdown
## Executive Summary

The site at Ballymun shows...

## Key Findings

- Several protected species...
- The site is within 5km of...
```

**New format (Greg's structure):**

```markdown
## Ecological Summary

### 🌿 Habitats

- **GA1 - Improved Agricultural Grassland:** Dominant habitat type, covers 60% of site. Poor condition due to intensive grazing.
- **WL1 - Hedgerows:** Linear habitat along northern boundary. Good condition, species-rich with Hawthorn and Blackthorn.
- **FW2 - Depositing River:** River Tolka forms eastern boundary. Moderate WFD status.

### 🦎 Species

**Birds:**

- Kingfisher (Alcedo atthis) - 2 records within 2km, Annex I species
- Whooper Swan (Cygnus cygnus) - I-WeBS site nearby, Amber listed

**Mammals:**

- Otter (Lutra lutra) - Potential along River Tolka, Annex II/IV
- Badger (Meles meles) - Suitable sett habitat in hedgerows

**Flora:**

- No protected flora recorded

### 💧 Aquatic Features

- **River Tolka:** WFD Status: Moderate, Risk: At Risk
  - Downstream connectivity to Dublin Bay
  - Key pressures: Urban runoff, hydromorphological alterations

### 🏛️ Designated Areas

| Site                  | Code   | Type | Distance | Qualifying Interests |
| --------------------- | ------ | ---- | -------- | -------------------- |
| South Dublin Bay SAC  | 000210 | SAC  | 3.2km    | Mudflats, Saltmarsh  |
| North Bull Island SPA | 004006 | SPA  | 4.1km    | Wintering waterbirds |
```

#### Auto-Trigger on Step Transition

When user completes Data Gathering → automatically generate summary:

```typescript
// In data-gathering-step.tsx
const handleComplete = async () => {
  // Mark step as needs_review
  await updateWorkflowStep(workflowStep.id, { status: 'needs_review' })

  // Auto-generate ecological summary
  await fetch('/api/ai/ecological-summary', {
    method: 'POST',
    body: JSON.stringify({ projectId: project.id }),
  })

  // Navigate to Desk Assessment
  router.push(`/projects/${project.id}?step=3`)
}
```

### 4.4 Implementation Tasks

- [x] **4.4.1** Update `/api/ai/desk-insights` prompt to use 4-category structure ✅
- [ ] **4.4.2** Add auto-trigger when completing Data Gathering step
- [ ] **4.4.3** Create new `EcologicalSummaryPanel` component
- [ ] **4.4.4** Add export to PDF/Word functionality

**Status:** ✅ CORE IMPLEMENTED (4-category structure complete)

---

## 5. Feature 4: Smart Scoping

### 5.1 Greg's Original Request

> "Smart Scoping: The system must recommend specific protected species for field verification based on the findings of the initial Desk Research."

### 5.2 Current State

**Partially exists:** `field-survey-step.tsx` has survey recommendations:

- Designated sites → habitat mapping recommendation
- Bat species found → bat survey recommendation
- Bird species found → bird survey recommendation

**What's missing:**

- Specific species recommendations (not just survey types)
- Reasoning for each recommendation
- Priority levels (High/Medium/Low)
- Habitat-species mapping logic

### 5.3 Proposed Implementation

#### Smart Scoping Panel

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Smart Scoping - Recommended Species Surveys              │
│ Based on Desk Research findings from Step 2-3               │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ ⚠️ HIGH PRIORITY                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ Otter (Lutra lutra)                                   │ │
│ │   📍 Why: River Tolka (FW2) present on site boundary    │ │
│ │   📊 Evidence: 3 GBIF records within 2km (2019-2024)    │ │
│ │   🔬 Survey: Otter survey along watercourse, check for  │ │
│ │      spraints, slides, holts                            │ │
│ │   📅 Timing: Year-round, avoid flooding periods         │ │
│ │   [Add to Field Checklist]                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ Badger (Meles meles)                                  │ │
│ │   📍 Why: Hedgerow network (WL1) provides sett habitat  │ │
│ │   📊 Evidence: 1 GBIF record within 5km (2021)          │ │
│ │   🔬 Survey: Check hedgerows for setts, latrines, paths │ │
│ │   📅 Timing: Year-round, best Feb-Apr before vegetation │ │
│ │   [Add to Field Checklist]                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ 🔶 MEDIUM PRIORITY                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ Kingfisher (Alcedo atthis)                            │ │
│ │   📍 Why: River habitat present, within 5km of SPA      │ │
│ │   📊 Evidence: South Dublin Bay SPA nearby              │ │
│ │   🔬 Survey: Check riverbanks for nest burrows          │ │
│ │   📅 Timing: Breeding season (Apr-Aug)                  │ │
│ │   [Add to Field Checklist]                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ 🟢 LOW PRIORITY (Habitat Present, No Records)               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ Smooth Newt (Lissotriton vulgaris)                    │ │
│ │   📍 Why: Suitable terrestrial habitat (grassland)      │ │
│ │   📊 Evidence: No records, but species common in Dublin │ │
│ │   🔬 Survey: Check for ponds/wet areas on site          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Generate Field Checklist PDF] [Add All to Survey]          │
└─────────────────────────────────────────────────────────────┘
```

#### Habitat-Species Mapping

Create `lib/data/habitat-species-mapping.ts`:

```typescript
export const habitatSpeciesMapping: Record<string, SpeciesRecommendation[]> = {
  // Hedgerows
  WL1: [
    {
      species: 'Badger',
      scientificName: 'Meles meles',
      reason: 'Sett habitat in hedgerow banks',
      priority: 'high',
    },
    {
      species: 'Hedgehog',
      scientificName: 'Erinaceus europaeus',
      reason: 'Foraging and nesting habitat',
      priority: 'medium',
    },
    {
      species: 'Nesting Birds',
      scientificName: 'Various',
      reason: 'Breeding habitat for passerines',
      priority: 'medium',
    },
  ],

  // Rivers
  FW2: [
    {
      species: 'Otter',
      scientificName: 'Lutra lutra',
      reason: 'Key foraging habitat',
      priority: 'high',
    },
    {
      species: 'Kingfisher',
      scientificName: 'Alcedo atthis',
      reason: 'Nesting in riverbanks',
      priority: 'high',
    },
    {
      species: 'Dipper',
      scientificName: 'Cinclus cinclus',
      reason: 'Resident on clean rivers',
      priority: 'medium',
    },
    {
      species: 'Atlantic Salmon',
      scientificName: 'Salmo salar',
      reason: 'Spawning rivers',
      priority: 'medium',
    },
  ],

  // Woodland
  WN1: [
    {
      species: 'Red Squirrel',
      scientificName: 'Sciurus vulgaris',
      reason: 'Native woodland species',
      priority: 'medium',
    },
    {
      species: 'Pine Marten',
      scientificName: 'Martes martes',
      reason: 'Woodland predator',
      priority: 'low',
    },
    {
      species: 'Bats',
      scientificName: 'Chiroptera',
      reason: 'Roosting in mature trees',
      priority: 'high',
    },
  ],

  // Buildings/Structures
  BL3: [
    {
      species: 'Bats',
      scientificName: 'Chiroptera',
      reason: 'Roosting in buildings',
      priority: 'high',
    },
    {
      species: 'Barn Owl',
      scientificName: 'Tyto alba',
      reason: 'Nesting in old buildings',
      priority: 'medium',
    },
    {
      species: 'Swallow',
      scientificName: 'Hirundo rustica',
      reason: 'Nesting in outbuildings',
      priority: 'low',
    },
  ],

  // ... more habitats
}
```

#### Priority Calculation Logic

```typescript
function calculatePriority(
  species: string,
  habitatMatch: boolean,
  gbifRecords: number,
  distanceToRecords: number,
  isAnnexSpecies: boolean,
  nearDesignatedSite: boolean
): 'high' | 'medium' | 'low' {
  let score = 0

  if (habitatMatch) score += 2
  if (gbifRecords > 0) score += 2
  if (distanceToRecords < 2) score += 2 // Within 2km
  if (isAnnexSpecies) score += 3
  if (nearDesignatedSite) score += 1

  if (score >= 7) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}
```

### 5.4 Implementation Tasks

- [x] **5.4.1** Create `lib/data/habitat-species-mapping.ts` ✅
- [x] **5.4.2** Create `SmartScopingPanel` component ✅
- [x] **5.4.3** Implement priority calculation algorithm ✅
- [x] **5.4.4** Add "Generate Field Checklist" functionality ✅
- [x] **5.4.5** Integrate with Field Survey step ✅
- [x] **5.4.6** Create PDF export for field checklist ✅

**Status:** ✅ FULLY IMPLEMENTED

---

## 6. Feature 5: Photo & Asset Management

### 6.1 Greg's Original Request

> "Photos taken in the field must be automatically geotagged and synced to the specific project record. Unlike 'clunky' existing solutions (e.g., Survey 123), the system must provide a lightweight gallery view that allows ecologists to quickly tag and retrieve photos for report writing without high latency or storage friction."

### 6.2 Current State

**Partially exists:**

- `target_notes` table has photo attachment support
- `species_observations` can have photos
- Supabase Storage is configured

**Existing Map Screenshot System (can be extended):**

We already have a screenshot system that can serve as a foundation:

| Component           | File                                     | Description                   |
| ------------------- | ---------------------------------------- | ----------------------------- |
| `useMapScreenshot`  | `hooks/use-map-screenshot.ts`            | Capture using `html-to-image` |
| `ScreenshotGallery` | `components/maps/screenshot-gallery.tsx` | Grid view + preview dialog    |
| Storage             | `lib/map-screenshots/storage.ts`         | SessionStorage based (max 10) |
| Types               | `lib/map-screenshots/types.ts`           | MapScreenshot interface       |

**Key Patterns from Existing System:**

- Grid layout with thumbnails (aspect-video)
- Click for full preview dialog
- Delete button on hover
- Step/category badges on thumbnails
- Timestamp display

**What's missing for Field Photos:**

- Dedicated photo gallery view
- EXIF geotag extraction
- Batch tagging interface
- Quick search/filter for report writing
- **Persistent storage** (current system uses sessionStorage, we need Supabase)

### 6.3 Proposed Implementation

#### Database Schema

```sql
CREATE TABLE project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  survey_id UUID REFERENCES surveys(id),
  target_note_id UUID REFERENCES target_notes(id),

  -- File info
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  -- Geolocation (from EXIF or manual)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  altitude DECIMAL(6, 2),
  gps_accuracy DECIMAL(5, 2),
  location_source TEXT, -- 'exif' | 'manual' | 'device'

  -- Temporal
  taken_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Categorization
  tags TEXT[] DEFAULT '{}',
  category TEXT, -- 'habitat' | 'species' | 'feature' | 'damage' | 'access' | 'other'
  species_name TEXT,
  habitat_code TEXT,

  -- Metadata
  notes TEXT,
  is_key_photo BOOLEAN DEFAULT FALSE, -- Flagged for report

  -- User info
  created_by UUID REFERENCES profiles(id),

  -- EXIF data (stored as JSONB for flexibility)
  exif_data JSONB
);

CREATE INDEX idx_project_photos_project ON project_photos(project_id);
CREATE INDEX idx_project_photos_tags ON project_photos USING GIN(tags);
CREATE INDEX idx_project_photos_category ON project_photos(category);
CREATE INDEX idx_project_photos_location ON project_photos(latitude, longitude);
```

#### Gallery Component

```
┌─────────────────────────────────────────────────────────────┐
│ 📸 Project Photos (47)                                      │
│ ─────────────────────────────────────────────────────────── │
│ 🔍 Search... [Filter: All ▼] [Category: All ▼] [Map View]  │
│                                                              │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ 📷  │ │ 📷  │ │ 📷  │ │ 📷  │ │ 📷  │ │ 📷  │            │
│ │     │ │  ⭐ │ │     │ │     │ │  ⭐ │ │     │            │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │
│ Habitat  Otter   WL1    Damage  Access  River              │
│                                                              │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ 📷  │ │ 📷  │ │ 📷  │ │ 📷  │ │ 📷  │ │ 📷  │            │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │
│                                                              │
│ [Upload Photos] [Batch Tag Selected] [Export for Report]    │
└─────────────────────────────────────────────────────────────┘
```

#### Features

1. **Upload with EXIF extraction:**
   - Read GPS coordinates from EXIF
   - Read timestamp from EXIF
   - Show location on map during upload
   - Allow manual correction

2. **Tagging system:**
   - Predefined tags: habitat, species, damage, access, management, ownership
   - Custom tags
   - Batch tagging for multiple photos

3. **Map view:**
   - Show all photos on map by location
   - Click to preview photo
   - Filter by category/tag

4. **Report integration:**
   - Flag "key photos" for report (⭐)
   - Export selected photos with captions
   - Auto-resize for report (web quality)

### 6.4 EXIF Extraction

```typescript
// lib/utils/exif.ts
import ExifReader from 'exifreader'

interface PhotoMetadata {
  latitude?: number
  longitude?: number
  altitude?: number
  takenAt?: Date
  cameraModel?: string
  orientation?: number
}

export async function extractExifData(file: File): Promise<PhotoMetadata> {
  const tags = await ExifReader.load(file)

  return {
    latitude: tags.GPSLatitude?.description,
    longitude: tags.GPSLongitude?.description,
    altitude: tags.GPSAltitude?.description,
    takenAt: tags.DateTimeOriginal?.description
      ? new Date(tags.DateTimeOriginal.description)
      : undefined,
    cameraModel: tags.Model?.description,
    orientation: tags.Orientation?.value,
  }
}
```

### 6.5 Implementation Tasks

- [ ] **6.5.1** Create `project_photos` table migration
- [ ] **6.5.2** Set up Supabase Storage bucket with policies
- [ ] **6.5.3** Create `lib/utils/exif.ts` for EXIF extraction
- [ ] **6.5.4** Create photo upload component with preview
- [ ] **6.5.5** Create `PhotoGallery` component with grid view
- [ ] **6.5.6** Create `PhotoMapView` component
- [ ] **6.5.7** Add batch tagging functionality
- [ ] **6.5.8** Add "Export for Report" feature
- [ ] **6.5.9** Integrate gallery into Field Survey step

**Status:** 🟢 READY TO IMPLEMENT (after Features 3-4)

---

## 7. Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)

| Task                              | Feature            | Effort | Status   |
| --------------------------------- | ------------------ | ------ | -------- |
| Update AI prompt format           | Ecological Summary | Low    | ✅ Done  |
| Add auto-trigger on step complete | Ecological Summary | Low    | 🟢 Ready |
| Create habitat-species mapping    | Smart Scoping      | Medium | ✅ Done  |

### Phase 2: Core Features (3-4 days)

| Task                       | Feature       | Effort | Status   |
| -------------------------- | ------------- | ------ | -------- |
| Smart Scoping panel        | Smart Scoping | Medium | ✅ Done  |
| Field checklist generation | Smart Scoping | Medium | ✅ Done  |
| Photo gallery component    | Photo Gallery | High   | 🟢 Ready |
| EXIF extraction            | Photo Gallery | Low    | 🟢 Ready |

### Phase 3: Research Required (TBD)

| Task                   | Feature       | Effort | Status     |
| ---------------------- | ------------- | ------ | ---------- |
| I-WeBS API integration | Bird Database | Medium | ⏸️ Blocked |
| Web search for reports | Web Search    | Medium | ⏸️ Blocked |

### Blockers & Questions for Greg

1. **I-WeBS/Caspio:** Do you have API access or contact at BirdWatch Ireland?
2. **Web Search Sources:** Which sources are priority? (EIA Portal, ABP, NPWS?)
3. **Project Sector:** Should we add sector field to project creation?
4. **Priority:** Which features are critical for demo?

---

## Progress Tracking

| Feature          | Research | Design | Implement | Test | Status     |
| ---------------- | -------- | ------ | --------- | ---- | ---------- |
| 1. Bird DB       | ✅       | 🟡     | ⬜        | ⬜   | ⏸️ Blocked |
| 2. Web Search    | ✅       | 🟡     | ⬜        | ⬜   | ⏸️ Blocked |
| 3. Eco Summary   | ✅       | ✅     | ✅        | ✅   | ✅ Done    |
| 4. Smart Scoping | ✅       | ✅     | ✅        | ✅   | ✅ Done    |
| 5. Photo Gallery | ✅       | ✅     | ⬜        | ⬜   | 🟢 Ready   |

---

## Implementation Notes (Feb 8, 2026)

### Feature 3: Ecological Summary - IMPLEMENTED

Updated `/api/ai/desk-insights/route.ts` with Greg's 4-category structure:

- **Habitats**: FOSSITT codes with descriptions and conditions
- **Species**: Grouped by Birds, Mammals, Flora, Other Taxa
- **Aquatic Features**: WFD status, risk level, connectivity
- **Designated Areas**: Table format with qualifying interests

Key changes:

- Prompt now generates structured markdown with emojis for each section
- Table format for designated sites and survey timing
- Clear separation between Essential/Recommended surveys

### Feature 4: Smart Scoping - IMPLEMENTED

Created new files:

- `lib/data/habitat-species-mapping.ts` - Comprehensive FOSSITT→Species mapping
- `components/field-surveys/smart-scoping-panel.tsx` - Smart Scoping UI component

Features:

- 30+ habitat codes mapped to protected species
- Priority calculation based on: GBIF records, distance, designated site context
- Species grouped by High/Medium/Low priority
- Checkbox selection for field checklist generation
- Shows protection status (Annex II/IV, Wildlife Acts, Red List)
- Optimal survey months for each species

Integrated into `field-survey-step.tsx` after the Desk Research Findings Summary.

### Feature 4: Smart Scoping - Field Checklist PDF (Added Feb 8, 2026)

Created PDF generation for field checklists:

- `lib/pdf/field-checklist-generator.ts` - Professional PDF with jsPDF
- Features:
  - Project info header (name, code, grid ref)
  - FOSSITT habitat codes section
  - Species grouped by survey type
  - Checkbox for each species (for field use)
  - Optimal survey months column
  - Protection status badges
  - Field notes section
  - Weather/conditions recording form
- Integrated into Smart Scoping panel "Generate Field Checklist" button
- Downloads as: `field-checklist-{project-code}-{date}.pdf`

---

_Last updated: 8 February 2026_
