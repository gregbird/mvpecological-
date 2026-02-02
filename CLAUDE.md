# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dulra** is an end-to-end project management platform for ecological consultancies in Ireland. It manages ecological projects through desk research, field surveys, and reporting phases with a 10-step workflow system. The platform integrates with Irish/EU biodiversity databases (NPWS, GBIF, NBDC, EPA) and uses AI for report generation.

### Target Users

| Persona          | Role                  | Primary Use                                               |
| ---------------- | --------------------- | --------------------------------------------------------- |
| Senior Ecologist | Admin/Project Manager | Project oversight, quality review, report approval        |
| Field Ecologist  | Team Member           | Species recording, habitat surveys, field data collection |
| GIS Specialist   | Team Member           | Spatial data validation, map production                   |
| Junior Ecologist | Team Member           | Learning, data entry with guidance                        |
| Client           | External              | Project status monitoring, report review                  |

### Report Types Supported

- **PEA** (Preliminary Ecological Appraisal) - Primary focus
- **EcIA** (Ecological Impact Assessment)
- **AA Screening** (Appropriate Assessment)
- **NIS** (Natura Impact Statement)

## Build & Development Commands

```bash
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run format:check     # Check formatting
npm run type-check       # TypeScript type checking
```

## Architecture

### Tech Stack

- Next.js 16+ (App Router)
- React 19+, TypeScript 5.9+
- Supabase (Auth & PostgreSQL with PostGIS)
- Tailwind CSS 4+ with shadcn/ui components
- React Hook Form + Zod for validation
- Leaflet for mapping (switched from Mapbox)
- TanStack React Query for server state
- OpenAI GPT-4 for report generation

### Directory Structure

```
app/
├── (auth)/                    # Auth routes (login, register)
│   └── layout.tsx             # Split view with dev role selector
├── (dashboard)/               # Protected routes
│   ├── layout.tsx             # Sidebar + Header layout
│   ├── page.tsx               # Dashboard home
│   └── projects/
│       ├── page.tsx           # Projects list
│       ├── new/               # Create project
│       └── [id]/              # Project detail pages
└── api/                       # API routes
    └── nbdc/                  # NBDC proxy endpoints

components/
├── ui/                        # shadcn/ui primitives
├── layout/                    # Header, Sidebar, ThemeToggle
├── maps/                      # Leaflet components
│   ├── project-map.tsx        # Display map with findings
│   ├── project-map-with-draw.tsx  # Interactive map with drawing
│   ├── measure-control.tsx    # Distance measurement tool
│   └── npws-layer-overlay.tsx # NPWS designated sites overlay
├── gis/                       # GIS integration
│   ├── buffer-zone-panel.tsx  # Buffer zone controls
│   └── dataset-layers-panel.tsx # Layer toggle panel
├── steps/                     # Workflow step components
│   ├── gis-mapping-step.tsx
│   ├── data-gathering-step.tsx
│   ├── data-gathering/        # Data gathering substeps
│   │   ├── designated-sites-substep.tsx
│   │   ├── species-records-substep.tsx
│   │   ├── aquatic-features-substep.tsx
│   │   └── review-export-substep.tsx
│   ├── desk-assessment-step.tsx
│   ├── field-survey-step.tsx
│   ├── habitat-mapping-step.tsx
│   ├── target-notes-step.tsx
│   ├── data-analysis-step.tsx
│   ├── ai-draft-step.tsx
│   ├── quality-review-step.tsx
│   └── final-submission-step.tsx
├── desk-research/             # Search, source selector, findings
└── field-surveys/             # Survey forms, observations

lib/
├── supabase/
│   ├── client.ts              # Browser client
│   ├── server.ts              # Server client with cookies
│   └── queries/               # Database queries (1700+ lines)
│       ├── projects.ts
│       ├── findings.ts
│       ├── surveys.ts
│       ├── habitats.ts
│       ├── observations.ts
│       ├── target-notes.ts
│       └── reports.ts
├── external-apis/
│   ├── npws.ts                # NPWS ArcGIS REST API
│   ├── gbif.ts                # GBIF species occurrences
│   ├── nbdc.ts                # NBDC species enrichment
│   └── epa.ts                 # EPA water quality data
├── gis/
│   ├── validation.ts          # Ireland bounds, CRS detection
│   ├── shapefile-parser.ts    # .shp/.zip parsing
│   ├── buffer.ts              # Buffer zone utilities
│   └── reverse-geocode.ts     # Townland/County lookup
├── ai/
│   └── report-generator.ts    # OpenAI report generation
├── config/
│   ├── workflow.ts            # Workflow step definitions
│   └── dataset-layers.ts      # NPWS, EPA layer configs
└── data/
    └── fossitt-codes.ts       # Irish habitat classification

hooks/
└── use-project-data.ts        # React Query hooks (794 lines)

contexts/
├── project-context.tsx        # Project state management
└── role-context.tsx           # User role context

types/
└── database.ts                # Supabase generated types
```

## 10-Step Workflow

Projects use a standardized workflow in 3 phases:

### Phase 1: Desk Research (Steps 1-3)

| Step | Name            | Component                  | Description                               |
| ---- | --------------- | -------------------------- | ----------------------------------------- |
| 1    | GIS Mapping     | `gis-mapping-step.tsx`     | Site boundary, buffer zones, NPWS overlay |
| 2    | Data Gathering  | `data-gathering-step.tsx`  | NPWS, GBIF, NBDC, EPA searches            |
| 3    | Desk Assessment | `desk-assessment-step.tsx` | AI insights, relevance assessment         |

### Phase 2: Field Research (Steps 4-6)

| Step | Name            | Component                  | Description                      |
| ---- | --------------- | -------------------------- | -------------------------------- |
| 4    | Field Survey    | `field-survey-step.tsx`    | Survey creation, weather, effort |
| 5    | Habitat Mapping | `habitat-mapping-step.tsx` | FOSSITT classification, polygons |
| 6    | Target Notes    | `target-notes-step.tsx`    | Field observations, 8 categories |

### Phase 3: Reporting (Steps 7-10)

| Step | Name             | Component                   | Description             |
| ---- | ---------------- | --------------------------- | ----------------------- |
| 7    | Data Analysis    | `data-analysis-step.tsx`    | Statistics, synthesis   |
| 8    | AI Draft         | `ai-draft-step.tsx`         | PEA report generation   |
| 9    | Quality Review   | `quality-review-step.tsx`   | Senior review, approval |
| 10   | Final Submission | `final-submission-step.tsx` | Report finalization     |

## External API Integrations

### NPWS (National Parks & Wildlife Service)

- **Endpoint:** `https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/ArcGIS/rest/services/NPWSDesignatedAreas/FeatureServer`
- **Layers:** SPA (0), pNHA (1), NHA (2), SAC (3)
- **File:** `lib/external-apis/npws.ts`

### GBIF (Global Biodiversity Information Facility)

- **Endpoint:** `https://api.gbif.org/v1/`
- **Features:** Species occurrence search by bounding box
- **File:** `lib/external-apis/gbif.ts`

### NBDC (National Biodiversity Data Centre)

- **Endpoint:** `https://maps.biodiversityireland.ie/`
- **Note:** WFS deprecated (2024), use species enrichment API
- **Features:** Protection status, Red List, Irish records
- **File:** `lib/external-apis/nbdc.ts`

### EPA (Environmental Protection Agency)

- **Endpoint:** `https://gis.epa.ie/geoserver/EPA/wfs`
- **Features:** Rivers, lakes, catchments, WFD status
- **File:** `lib/external-apis/epa.ts`

## Database Schema (Supabase + PostGIS)

### Key Tables

| Table                    | Purpose              | Key Fields                                        |
| ------------------------ | -------------------- | ------------------------------------------------- |
| `projects`               | Main project entity  | boundary (geometry), center_point, grid_reference |
| `workflow_steps`         | Progress tracking    | step_number, status, started_at, completed_at     |
| `desk_research_findings` | API search results   | source, data_type, location, is_protected         |
| `surveys`                | Field survey records | survey_date, weather_conditions, effort_hours     |
| `species_observations`   | Species records      | scientific_name, count, evidence_type             |
| `habitat_polygons`       | Habitat mapping      | fossitt_code, boundary, condition                 |
| `target_notes`           | Field notes          | category, title, priority, is_verified            |
| `reports`                | Generated reports    | content (JSONB), version, status                  |

### Enums

```typescript
type ProjectPhase = 'desk_research' | 'field_research' | 'reporting'
type WorkflowStatus = 'pending' | 'in_progress' | 'needs_review' | 'approved' | 'blocked'
type DataSource = 'npws' | 'gbif' | 'nbdc' | 'epa' | 'catchments' | 'manual'
type FindingType = 'designated_site' | 'species_record' | 'water_quality' | 'catchment' | 'other'
type TargetNoteCategory =
  | 'access_point'
  | 'check_feature'
  | 'habitat'
  | 'fauna'
  | 'flora'
  | 'management'
  | 'damage'
  | 'ownership'
```

### User Roles

- `admin` - Full system access
- `senior_ecologist` - Project management, report approval
- `ecologist` - Standard project work
- `field_ecologist` - Field data collection
- `gis_specialist` - Spatial data management
- `client` - Read-only project access

## Key Patterns

### Form Validation

```tsx
const schema = z.object({ ... })
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) })
```

### React Query Hooks

```tsx
// Example from hooks/use-project-data.ts
export function useProjectFindings(projectId: string) {
  return useQuery({
    queryKey: ['findings', projectId],
    queryFn: () => getProjectFindings(projectId),
    enabled: !!projectId,
  })
}
```

### Path Alias

Use `@/` for all imports: `import { Button } from '@/components/ui/button'`

### Status Colors

- **Phase:** desk_research (blue), field_research (green), reporting (purple)
- **Health:** on_track (green), at_risk (amber), overdue (red)
- **Workflow:** pending (gray), in_progress (blue), needs_review (amber), approved (green)

## FOSSITT Habitat Classification

Irish habitat classification system used throughout the platform:

- **Level 1:** Broad categories (e.g., Woodland, Grassland)
- **Level 2:** Sub-categories (e.g., Semi-natural woodland)
- **Level 3:** Specific habitats (e.g., WN1 Oak-birch-holly woodland)

Example codes:

- `GA1` - Improved agricultural grassland
- `WS1` - Scrub
- `WL1` - Hedgerows
- `WL2` - Treelines
- `FW2` - Depositing/lowland rivers
- `PB4` - Cutover bog

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=            # For AI report generation
```

## Development Notes

- Auth layout has dev mode role switcher (yellow button, bottom-right)
- Site codes format: XXX-YYYY-NNN (auto-generated)
- Wizard state persisted to sessionStorage
- NPWS API has 10-second timeout configured
- NBDC species search uses POST with form data (not JSON)

## PEA Report Structure (CIEEM Standard)

The platform generates Preliminary Ecological Appraisal reports following this structure:

1. **Introduction** - Project background, site location, scope
2. **Methodology** - Desk study sources, field survey dates, constraints
3. **Results**
   - 3.1 Designated Sites (SAC, SPA, NHA table + map)
   - 3.2 Habitats (FOSSITT classification)
   - 3.3 Flora & Invasive Species
   - 3.4 Fauna (mammals, birds, bats, etc.)
4. **Ecological Constraints** - Constraints table with recommendations
5. **Discussion & Conclusions** - Further survey recommendations
6. **Appendices** - Habitat map, photos, species lists

## Irish Ecological Terminology

| Term     | Meaning                                              |
| -------- | ---------------------------------------------------- |
| SAC      | Special Area of Conservation (EU Habitats Directive) |
| SPA      | Special Protection Area (EU Birds Directive)         |
| NHA      | Natural Heritage Area (Irish designation)            |
| pNHA     | Proposed Natural Heritage Area                       |
| WFD      | Water Framework Directive                            |
| ITM      | Irish Transverse Mercator (EPSG:2157)                |
| Grid Ref | Irish Grid Reference (e.g., O 318 259)               |
| DAFOR    | Dominant, Abundant, Frequent, Occasional, Rare       |
| BoCCI    | Birds of Conservation Concern in Ireland             |

## Protected Species (Ireland)

Species protected under Wildlife Acts 1976-2021:

- All bat species (9 resident species)
- Badger (Meles meles) - setts protected
- Otter (Lutra lutra) - holts and couches protected
- Pine Marten, Red Squirrel
- Kingfisher (Alcedo atthis) - Annex I Birds Directive
- Whooper Swan (Cygnus cygnus) - Annex I Birds Directive
