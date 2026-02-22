# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dulra** is an end-to-end project management platform for ecological consultancies in Ireland. It manages ecological projects through desk research, field surveys, and reporting phases with a 10-step workflow system. The platform integrates with Irish/EU biodiversity databases (NPWS, GBIF, NBDC, EPA, Catchments.ie) and uses AI for report generation.

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

## Data Flow Conventions

- **Always use existing data — never re-fetch** — Before making any API call, check whether the data already exists in a prior workflow step, React Query cache, or Supabase table. For example: if Step 2 (Data Gathering) already saved NPWS findings, Step 3 onwards must read from `desk_research_findings`, not re-query the NPWS API.
- **Step data flows forward, never sideways** — Each step consumes outputs from earlier steps. Never trigger a fresh external API call for data that a previous step already gathered and persisted.

## Refactoring Guidelines

- **Think domain-first, not file-size-first** — Before proposing a refactor, understand the ecological consulting workflow and how users interact with the system. Don't give generic "split large files" advice. Consider which domain boundary the code belongs to (desk research vs field survey vs reporting) and restructure along those lines.
- **Adapt UI patterns, don't copy them** — When a component should visually match another (e.g., Species Records matching Designated Sites style), adapt the pattern for the specific component's unique data shape and context. Do NOT copy it verbatim. If unsure about the level of similarity expected, ask before writing code.

## GIS & Mapping

- **Always clip geometries to project boundary** — Before calculating any areas (CORINE, habitat polygons, etc.), use `turf.intersect` to clip to the project boundary. Never report raw polygon areas — they will include ocean and land outside the study area.
- **Use async processing for heavy turf.js operations** — `turf.intersect` on large polygon sets (200+ CORINE polygons) must be processed asynchronously or in chunks to avoid UI freezing. Cache results in React state or Supabase after first computation.
- **Verify GeoServer/ArcGIS layer names before coding** — Always check the actual API/layer name against the live service before hardcoding it. Wrong layer names cause silent 400 errors.
- **Always provide null/fallback handling for distance and area fields** — Zone of Influence distances, buffer areas, and GIS-derived values are commonly null. Display gracefully (e.g., "—" or "N/A"), never show zeros or blank cells.

## Known Issues & Gotchas

- **React 19 + Radix UI `removeChild` DOM errors** — If you see a `removeChild` / `insertBefore` DOM error, check for Radix UI Dialog (or Popover/Tooltip) using `asChild` combined with conditional rendering of the child. This is a known React 19 reconciler issue. Fix by ensuring the `asChild` child is always mounted (use CSS `hidden` instead of conditional `&&`), not by changing render props.
- **NBDC species search uses POST with form data** — Not JSON. Don't convert to `application/json`.
- **NPWS API has a 10-second timeout** — Handle timeout errors explicitly; don't rely on default fetch behaviour.

## UI Development

- **Adapt component styles contextually** — When matching a reference component's visual style, preserve the target component's own data structure, grouping logic, and unique fields. State explicitly in your plan which differences you will preserve before making changes.
- **Step root container must be `flex h-full flex-col`** — All step-level components must use this as their root className for consistent dashboard panel layout.

## Development Rules

These rules MUST be followed when writing or modifying code:

### Code Quality

- **No `any` types** — use `unknown`, proper interfaces, or Supabase generated types from `types/database.ts`
- **No `as unknown as undefined`** or double type casts — fix the underlying type issue instead
- **No `console.log` in production code** — remove debug logs before committing. Use `console.error` only for actual errors
- **Run `npm run lint` after every change** — zero warnings is the target (currently 24 warnings to clean up)
- **Run `npm run build` before marking a feature complete** — catches type errors that lint misses

### Component Patterns

- **Forms: always use React Hook Form + Zod** — `useForm({ resolver: zodResolver(schema) })` with `<Form>/<FormField>/<FormMessage>` from shadcn/ui. Never use raw `useState` for form state
- **Step components: use `flex h-full flex-col` as root container** — ensures consistent layout within the dashboard panel
- **Keep files under 400 lines** — extract sub-components into the step's subdirectory (e.g., `steps/desk-assessment/`)
- **Shared constants belong in `lib/config/`** — don't hardcode Ireland center coords, survey types, buffer colors, etc. in component files
- **Sub-components go in step subdirectories** — not inline at the bottom of large files

### Data Layer

- **Error handling: throw on failure** — don't silently return `null`. Let React Query catch errors via `mutateAsync`
- **React Query invalidation: always include entity ID** — `['findings', projectId]` not just `['findings']`
- **Use Supabase generated types** — import from `types/database.ts`, don't create parallel type definitions

### Git & Workflow

- **Conventional commits** — `feat:`, `fix:`, `refactor:`, `chore:`, `style:`, `docs:`
- **English commit messages**
- **Don't commit without being asked**

## Architecture

### Tech Stack

- Next.js 16+ (App Router)
- React 19+, TypeScript 5.9+
- Supabase (Auth & PostgreSQL with PostGIS)
- Tailwind CSS 4+ with shadcn/ui components
- React Hook Form + Zod for validation
- Leaflet for mapping (OSM/Esri tile layers)
- TanStack React Query for server state
- Turf.js (`@turf/turf`) for geospatial calculations
- OpenAI GPT-4o-mini for AI analysis
- jsPDF for PDF generation
- html-to-image for map screenshot capture

### Directory Structure

```
app/
├── (auth)/                    # Auth routes (login, register, accept-invite)
│   └── layout.tsx             # Split view with dev role selector
├── (dashboard)/               # Protected routes
│   ├── layout.tsx             # Sidebar + Header layout
│   ├── page.tsx               # Dashboard home
│   ├── audit/                 # Audit log page
│   ├── team/                  # Team management page
│   └── projects/
│       ├── page.tsx           # Projects list
│       ├── new/               # Create project
│       └── [id]/              # Project detail pages
└── api/                       # API routes
    ├── ai/                    # AI endpoints (desk-insights, species-research, legend, etc.)
    ├── boundaries/            # Boundary data endpoints
    ├── nbdc/                  # NBDC proxy (search, taxon)
    └── npws/                  # NPWS scrape, townlands lookup

components/
├── ui/                        # shadcn/ui primitives
├── layout/                    # Header, Sidebar, ThemeToggle
├── auth/                      # Auth modal
├── dashboard/                 # Project cards, stats, status filter
├── project/                   # Project workflow sidebar
├── providers/                 # React Query provider
├── maps/                      # Leaflet components
│   ├── project-map.tsx        # Display map with findings
│   ├── project-map-with-draw.tsx  # Interactive map with drawing
│   ├── measure-control.tsx    # Distance measurement tool
│   ├── npws-layer-overlay.tsx # NPWS designated sites overlay
│   ├── map-capture-button.tsx # Screenshot capture button
│   └── screenshot-gallery.tsx # Screenshot gallery viewer
├── gis/                       # GIS integration
│   ├── dataset-layers-panel.tsx # Layer toggle panel
│   ├── arcgis-connection.tsx  # ArcGIS connection
│   ├── qgis-connection.tsx    # QGIS connection
│   └── layer-info-modal.tsx   # Layer metadata display
├── steps/                     # Workflow step components
│   ├── gis-mapping-step.tsx
│   ├── gis-mapping/           # GIS step sub-components
│   │   ├── layers-sidebar.tsx
│   │   └── preview-panel.tsx
│   ├── data-gathering-step.tsx
│   ├── data-gathering/        # Data gathering substeps
│   │   ├── designated-sites-substep.tsx
│   │   ├── species-records-substep.tsx
│   │   ├── aquatic-features-substep.tsx
│   │   ├── review-export-substep.tsx
│   │   ├── data-gathering-substep-shell.tsx
│   │   ├── export-findings-modal.tsx
│   │   ├── findings-list.tsx
│   │   ├── project-info-substep.tsx
│   │   └── target-note-form.tsx
│   ├── desk-assessment-step.tsx
│   ├── desk-assessment/       # Desk assessment sub-components
│   │   ├── aquatic-environment-section.tsx
│   │   ├── baseline-report-tab.tsx
│   │   ├── constraints-summary-section.tsx
│   │   ├── designated-sites-matrix.tsx
│   │   └── species-records-section.tsx
│   ├── field-survey-step.tsx
│   ├── habitat-mapping-step.tsx
│   ├── target-notes-step.tsx
│   ├── data-analysis-step.tsx
│   ├── data-analysis/           # Data analysis sub-components
│   │   ├── gis-summary-tab.tsx
│   │   ├── data-gathering-tab.tsx
│   │   ├── desk-assessment-tab.tsx
│   │   ├── field-survey-tab.tsx
│   │   ├── habitat-tab.tsx
│   │   ├── target-notes-tab.tsx
│   │   ├── maps-tab.tsx         # Interactive map review with layers & screenshots
│   │   └── photographs-tab.tsx  # Field survey photo gallery
│   ├── ai-draft-step.tsx
│   ├── quality-review-step.tsx
│   └── final-submission-step.tsx
├── desk-research/             # Search, source selector, findings
└── field-surveys/             # Survey forms, observations
    ├── releve-survey-form.tsx # Relevé Survey orchestrator form
    ├── survey-view-dialog.tsx # View dialog (Relevé → full form, others → read-only)
    └── releve-survey/         # Relevé form sub-components (13 files)
        ├── types.ts           # Zod schema, CustomFieldDefinition, helpers
        ├── custom-fields-section.tsx  # Dynamic custom field builder
        ├── template-save-modal.tsx    # Save custom fields as template
        └── template-load-dropdown.tsx # Load template into form

lib/
├── supabase/
│   ├── client.ts              # Browser client
│   ├── server.ts              # Server client with cookies
│   ├── admin.ts               # Service-role admin client
│   └── queries/               # Database queries
│       ├── projects.ts
│       ├── findings.ts
│       ├── surveys.ts
│       ├── habitats.ts
│       ├── observations.ts
│       ├── target-notes.ts
│       ├── reports.ts
│       ├── workflow.ts
│       ├── deep-research.ts
│       ├── aquatic-research.ts
│       └── releve-surveys.ts  # Relevé CRUD + template queries
├── external-apis/
│   ├── npws.ts                # NPWS ArcGIS REST API
│   ├── gbif.ts                # GBIF species occurrences
│   ├── nbdc.ts                # NBDC species enrichment
│   ├── epa.ts                 # EPA water quality data
│   └── catchments.ts          # Catchments.ie WFD API
├── gis/
│   ├── validation.ts          # Ireland bounds, CRS detection
│   ├── shapefile-parser.ts    # .shp/.zip parsing
│   ├── buffer.ts              # Buffer zone utilities
│   ├── distance.ts            # Turf.js distance calculations
│   ├── bounding-box.ts        # Bounding box for API searches
│   └── reverse-geocode.ts     # Townland/County lookup
├── ai/
│   └── report-generator.ts    # OpenAI report generation
├── pdf/
│   └── field-checklist-generator.ts  # jsPDF field checklists
├── map-screenshots/
│   ├── storage.ts             # Supabase Storage integration
│   └── types.ts               # Screenshot types & step labels
├── config/
│   ├── workflow.ts            # Workflow step definitions
│   ├── dataset-layers.ts      # NPWS, EPA layer configs
│   ├── map-constants.ts       # Tile layers, Ireland center
│   ├── boundary-layers.ts     # County boundary layers
│   └── layer-metadata.ts      # Dataset source metadata
├── data/
│   ├── fossitt-codes.ts       # Irish habitat classification
│   ├── npws-site-lookup.ts    # Offline NPWS SAC/SPA lookup
│   ├── npws-sites-data.json   # NPWS site data (from Excel)
│   ├── article12-birds.ts     # Birds Directive Article 12 data
│   ├── article17-habitats.ts  # Habitats Directive Article 17 data
│   ├── article17-species.ts   # Species Article 17 data
│   ├── fpo-species.ts         # Flora Protection Order 2022
│   ├── ssco-lookup.ts         # Site-specific Conservation Objectives
│   ├── aquatic-sac-lookup.ts  # EPA rivers/lakes to SAC matching
│   ├── habitat-species-mapping.ts  # FOSSITT to expected species
│   └── common-irish-flora.ts # 23 common species + DOMIN scale
└── utils/
    └── grid-reference.ts      # ITM/Irish Grid coordinate conversion

hooks/
├── queries/                   # React Query hooks (domain-split)
│   ├── use-project-hooks.ts
│   ├── use-finding-hooks.ts
│   ├── use-survey-hooks.ts
│   ├── use-habitat-hooks.ts
│   ├── use-observation-hooks.ts
│   ├── use-target-note-hooks.ts
│   ├── use-workflow-hooks.ts
│   ├── use-report-hooks.ts
│   ├── use-deep-research-hooks.ts
│   └── use-releve-hooks.ts    # Relevé survey + template hooks
├── gis/                       # GIS-specific hooks
│   ├── use-boundary-management.ts
│   ├── use-buffer-configuration.ts
│   ├── use-gis-wizard.ts      # 4-step internal wizard
│   ├── use-layer-data.ts
│   └── use-map-view-persistence.ts
├── maps/
│   └── use-administrative-boundaries.ts
├── shared/
│   ├── use-session-storage.ts
│   └── use-substep-search.ts
├── use-map-screenshot.ts      # html-to-image capture
└── use-toast.ts

contexts/
├── project-context.tsx        # Project state management
└── role-context.tsx           # User role context

types/
└── database.ts                # Supabase generated types (source of truth)
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

| Step | Name             | Component                   | Description                         |
| ---- | ---------------- | --------------------------- | ----------------------------------- |
| 7    | Data Analysis    | `data-analysis-step.tsx`    | Statistics, synthesis, maps, photos |
| 8    | AI Draft         | `ai-draft-step.tsx`         | PEA report generation               |
| 9    | Quality Review   | `quality-review-step.tsx`   | Senior review, approval             |
| 10   | Final Submission | `final-submission-step.tsx` | Report finalization                 |

## External API Integrations

### NPWS (National Parks & Wildlife Service)

- **Endpoint:** `https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/ArcGIS/rest/services/NPWSDesignatedAreas/FeatureServer`
- **Layers:** SPA (0), pNHA (1), NHA (2), SAC (3)
- **File:** `lib/external-apis/npws.ts`
- **Offline data:** `lib/data/npws-site-lookup.ts` + `npws-sites-data.json`

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

### Catchments.ie (WFD API)

- **Endpoint:** `https://wfdapi.edenireland.ie/api/`
- **Features:** Catchment details, water body status history, trends
- **File:** `lib/external-apis/catchments.ts`

## Supabase Edge Functions

| Function                 | JWT | Description                               |
| ------------------------ | --- | ----------------------------------------- |
| `generate-desk-insights` | No  | OpenAI analysis of desk research findings |

## Database Schema (Supabase + PostGIS)

### All Tables

| Table                      | RLS    | Rows | Purpose                                    |
| -------------------------- | ------ | ---- | ------------------------------------------ |
| `organizations`            | Yes    | 0    | Multi-tenant organization                  |
| `profiles`                 | Yes    | 0    | User profiles (linked to auth.users)       |
| `clients`                  | Yes    | 0    | Client companies                           |
| `projects`                 | Yes    | 5    | Main project entity with PostGIS geometry  |
| `project_members`          | Yes    | 5    | Project team membership                    |
| `workflow_steps`           | Yes    | 752  | 10-step progress tracking per project      |
| `desk_research_findings`   | Yes    | 194  | API search results & manual findings       |
| `deep_research_results`    | Yes    | 13   | AI deep research on designated sites       |
| `aquatic_research_results` | Yes    | 8    | AI aquatic environment research            |
| `surveys`                  | Yes    | 3    | Field survey records                       |
| `releve_surveys`           | Yes    | 0    | Relevé vegetation survey data (40+ fields) |
| `releve_species`           | Yes    | 0    | Species records per relevé (DOMIN scale)   |
| `releve_survey_templates`  | Yes    | 0    | Reusable custom field templates            |
| `species_observations`     | Yes    | 0    | Species records per survey                 |
| `habitat_polygons`         | Yes    | 4    | Habitat mapping with FOSSITT codes         |
| `target_notes`             | Yes    | 2    | Field target notes (8 categories)          |
| `photos`                   | Yes    | 0    | Survey/observation photos                  |
| `reports`                  | Yes    | 1    | Generated reports (JSONB content)          |
| `map_screenshots`          | Yes    | 2    | Captured map images per step               |
| `audit_log`                | Yes    | 2215 | Automatic audit trail (trigger-based)      |
| `invites`                  | Yes    | 0    | Team invitation tokens                     |
| `spatial_ref_sys`          | **No** | 0    | PostGIS system table (RLS needs attention) |

### Enums (actual DB values)

```typescript
type user_role = 'admin' | 'assessor' | 'client'
type project_member_role = 'lead' | 'surveyor' | 'analyst' | 'reviewer' | 'viewer'
type project_status = 'draft' | 'active' | 'completed' | 'archived'
type project_phase = 'desk_research' | 'field_research' | 'reporting'
type health_status = 'on_track' | 'at_risk' | 'overdue'
type workflow_status = 'pending' | 'in_progress' | 'needs_review' | 'approved' | 'blocked'
type data_source = 'npws' | 'gbif' | 'nbdc' | 'epa' | 'catchments' | 'manual'
type finding_data_type =
  | 'designated_site'
  | 'species_record'
  | 'water_quality'
  | 'catchment'
  | 'other'
type survey_status = 'planned' | 'in_progress' | 'completed' | 'approved'
type report_status = 'draft' | 'internal_review' | 'client_review' | 'approved' | 'final'
type confidence_level = 'high' | 'medium' | 'low'
type sync_status = 'synced' | 'pending' | 'conflict'
type audit_action = 'INSERT' | 'UPDATE' | 'DELETE'
```

### Key Column Names (actual DB, not aliases)

- `surveys.weather` (JSONB, not `weather_conditions`)
- `surveys.start_time` / `end_time` (not `effort_hours`)
- `species_observations.species_name_scientific` (not `scientific_name`)
- `species_observations.species_name_common` (not `common_name`)
- `desk_research_findings.is_protected`, `relevance_level`, `red_list_status`, `distance_from_boundary_km`

### Supabase Security Advisories (known issues)

- **7 functions missing `search_path`**: `get_project_with_geojson`, `update_updated_at`, `add_project_creator_as_lead`, `audit_log_trigger`, `create_default_workflow_steps`, `get_user_organization_id`, `update_project_boundary` — should set `search_path = ''`
- **`spatial_ref_sys` has no RLS** — PostGIS system table exposed publicly
- **PostGIS extension is in `public` schema** — should be in a separate schema
- **Leaked password protection disabled** — enable in Supabase Auth settings
- **Multiple permissive RLS policies** on most tables — consider consolidating SELECT policies
- **RLS policies re-evaluate `current_setting()`** on every row — performance concern at scale

### Database Functions (via migrations)

- `update_project_boundary()` — updates boundary + reverse geocodes location
- `get_project_with_geojson()` — returns project with GeoJSON geometry
- `create_default_workflow_steps()` — trigger: creates 10 steps on project insert
- `add_project_creator_as_lead()` — trigger: adds creator as lead member
- `audit_log_trigger()` — trigger: logs all INSERT/UPDATE/DELETE to audit_log
- `update_updated_at()` — trigger: auto-updates `updated_at` timestamps
- `get_user_organization_id()` — helper for RLS policies

## Key Patterns

### Form Validation

```tsx
const schema = z.object({ ... })
const form = useForm({ resolver: zodResolver(schema) })
// Use shadcn Form components:
<Form {...form}>
  <FormField control={form.control} name="fieldName" render={...} />
</Form>
```

### React Query Hooks

```tsx
// Hooks are split by domain in hooks/queries/
// Example from hooks/queries/use-finding-hooks.ts
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

## Known Issues to Fix

- [ ] `habitat-mapping-step.tsx:539` — `disabled={false}` hardcoded, should respect step completion
- [ ] Ireland center `[53.1424, -7.6921]` duplicated in 4+ files — move to `lib/config/map-constants.ts`
- [ ] `SURVEY_TYPE_LABELS` defined in `field-survey-step.tsx`, `survey-form.tsx`, and `survey-view-dialog.tsx`
- [ ] `findingsByType` grouping logic duplicated in 3 step components
- [ ] Two separate `TargetNoteForm` components exist (field-surveys vs data-gathering)
- [ ] `field-survey-step.tsx:408` uses `space-y-6` root instead of `flex h-full flex-col`
- [ ] Debug `console.log` with emoji in `designated-sites-substep.tsx` and `species-records-substep.tsx`

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=                # Server-side AI (edge functions, API routes)
NEXT_PUBLIC_OPENAI_API_KEY=    # Client-side AI (reports page)
```

## Development Notes

- Auth layout has dev mode role switcher (yellow button, bottom-right)
- Site codes format: XXX-YYYY-NNN (auto-generated)
- GIS Mapping step has internal 4-step wizard: source > boundary > buffers > layers
- Wizard state persisted to sessionStorage
- NPWS API has 10-second timeout configured
- NBDC species search uses POST with form data (not JSON)
- Map tiles: OSM Streets, Esri Satellite, Hybrid, Topo (free providers, no API key needed)
- 40 migrations applied (initial_schema through create_releve_survey_templates)

## FOSSITT Habitat Classification

Irish habitat classification system used throughout the platform:

- **Level 1:** Broad categories (e.g., Woodland, Grassland)
- **Level 2:** Sub-categories (e.g., Semi-natural woodland)
- **Level 3:** Specific habitats (e.g., WN1 Oak-birch-holly woodland)

Example codes: `GA1` (Improved grassland), `WS1` (Scrub), `WL1` (Hedgerows), `WL2` (Treelines), `FW2` (Depositing rivers), `PB4` (Cutover bog)

## PEA Report Structure (CIEEM Standard)

1. **Introduction** - Project background, site location, scope
2. **Methodology** - Desk study sources, field survey dates, constraints
3. **Results** - Designated Sites, Habitats, Flora & Invasive Species, Fauna
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
