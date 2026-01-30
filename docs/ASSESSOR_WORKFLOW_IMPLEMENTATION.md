# Assessor Workflow Implementation Documentation

## Overview

This document details the implementation of the 10-step Assessor (Ecologist) workflow for the Dulra ecological project management platform. The workflow covers the complete lifecycle of a Preliminary Ecological Appraisal (PEA) project from GIS mapping through final report submission.

**Implementation Status:** Complete (Steps 1-10)
**Supabase Integration:** Complete

---

## Source References

The implementation follows specifications from these source documents:

### 1. Product Requirements Document (PRD)

**Location:** `/docs/prd.md`

Key sections referenced:

- **Section 4.3** - GIS Data & Desk Research
- **Section 4.5** - Mobile Field Survey (Offline-First)
- **Section 4.6** - AI-Powered Reporting & Post-Survey
- **Section 6.1** - Template: Preliminary Ecological Appraisal (PEA)
- **Section 7** - Prompt Logic: The "Ecological Opinion" Input

### 2. Draft of Key Data and Workflow

**Location:** `/docs/draft_of_key_data_and_workflow.md`

Key sections referenced:

- **Section 1** - The GIS & Desk Study Interface
- **Section 2** - Desk Research to Field Survey
- **Section 3** - Field Survey Structure (The Digital Form)
- **Section 3 (continued)** - The PEA Report Output (CIEEM Structure)

### 3. Ecological Survey Types

**Location:** `/docs/Ecological_survey_types.md`

Contains detailed survey methodology and field data requirements.

### 4. User Personas and Use Cases

**Location:** `/docs/USER_PERSONAS_AND_USE_CASES.md`

Defines user roles and workflows for Assessor perspective.

---

## Architecture

### Directory Structure

```
/hooks/
  use-project-data.ts       # React Query hooks for all data operations

/lib/supabase/queries/
  projects.ts               # Project CRUD operations
  surveys.ts                # Survey CRUD operations
  habitats.ts               # Habitat polygon operations
  observations.ts           # Species observation operations
  findings.ts               # Desk research findings operations
  reports.ts                # Report generation and management
  workflow.ts               # Workflow step status management

/components/steps/
  index.ts                  # Barrel export file
  gis-mapping-step.tsx      # Step 1
  data-gathering-step.tsx   # Step 2
  desk-assessment-step.tsx  # Step 3
  field-survey-step.tsx     # Step 4
  habitat-mapping-step.tsx  # Step 5
  target-notes-step.tsx     # Step 6
  data-analysis-step.tsx    # Step 7
  ai-draft-step.tsx         # Step 8
  quality-review-step.tsx   # Step 9
  final-submission-step.tsx # Step 10

/app/(dashboard)/projects/[id]/
  page.tsx                  # Project detail page with step navigation
```

### Database Tables Used

| Table                    | Steps    | Purpose                    |
| ------------------------ | -------- | -------------------------- |
| `projects`               | 1, 10    | Project boundary, status   |
| `workflow_steps`         | All      | Step completion tracking   |
| `desk_research_findings` | 2, 3     | External data storage      |
| `surveys`                | 4, 5, 6  | Field survey management    |
| `habitat_polygons`       | 5, 7     | Habitat mapping data       |
| `species_observations`   | 6, 7     | Species records            |
| `reports`                | 8, 9, 10 | Report drafts and versions |

### Key Dependencies

```json
{
  "react-query": "TanStack Query for data fetching",
  "recharts": "Charts in Step 7 (Data Analysis)",
  "leaflet": "Map rendering",
  "react-leaflet-draw": "Polygon drawing tools",
  "@turf/turf": "GeoJSON calculations"
}
```

---

## Workflow Steps Detail

### Phase 1: Desk Research (Steps 1-3)

#### Step 1: GIS Mapping

**Component:** `/components/steps/gis-mapping-step.tsx`
**PRD Reference:** Section 4.3 - GIS map Data upload

**Purpose:**
Upload or draw the project site boundary for all subsequent analysis.

**Features:**

- GeoJSON/Shapefile upload (drag-drop)
- Manual boundary drawing using Leaflet DrawControls
- Automatic area calculation (hectares)
- Irish Grid Reference conversion
- Center point calculation
- Boundary visualization on map

**Database Operations:**

```typescript
// Save boundary to project
updateProject({
  projectId: project.id,
  updates: {
    boundary: geoJson,
    center_point: centerPoint,
    area_hectares: calculatedArea,
  },
})
```

**Key Functions:**

- `calculateAreaHectares(geoJson)` - Calculates polygon area
- `getGridReference(lng, lat)` - Converts coordinates to Irish Grid
- `handleShapeCreated(e)` - Handles draw events

---

#### Step 2: Data Gathering

**Component:** `/components/steps/data-gathering-step.tsx`
**PRD Reference:** Section 4.3 - External Data Gathering

**Purpose:**
Search external databases (NPWS, GBIF, NBDC) and save relevant findings.

**Features:**

- Search NPWS designated sites (SAC, SPA, NHA, pNHA)
- Search GBIF species occurrences
- Search NBDC biodiversity records
- Buffer radius configuration (1-15km)
- Save/remove findings
- Findings persistence to Supabase

**External APIs:**

```typescript
// Located in /lib/external-apis/
;-npws.ts - // NPWS ArcGIS REST API
  gbif.ts - // Global Biodiversity Information Facility
  nbdc.ts // National Biodiversity Data Centre
```

**Database Operations:**

```typescript
// Save finding
createFinding({
  project_id: projectId,
  source: 'npws' | 'gbif' | 'nbdc',
  data_type: 'designated_site' | 'species_record',
  title: finding.title,
  content: finding.content,
  raw_data: finding.rawData,
  location: finding.location,
  is_saved: true,
})
```

---

#### Step 3: Desk Assessment

**Component:** `/components/steps/desk-assessment-step.tsx`
**PRD Reference:** Section 4.3 - Data search Considerations

**Purpose:**
Review and assess saved findings, assign relevance ratings.

**Features:**

- View all saved findings by source tab
- Assign relevance: High / Medium / Low / None
- Add assessment notes to each finding
- Overall assessment summary
- Filter by data type

**Database Operations:**

```typescript
// Update finding assessment
updateFinding({
  findingId: finding.id,
  updates: {
    notes: JSON.stringify({
      relevance,
      assessmentNotes,
    }),
  },
})
```

---

### Phase 2: Field Research (Steps 4-6)

#### Step 4: Field Survey

**Component:** `/components/steps/field-survey-step.tsx`
**PRD Reference:** Section 4.5 - Mobile Field Survey

**Purpose:**
Plan and manage field surveys for the project.

**Features:**

- Survey list with status (Planned/In Progress/Completed/Approved)
- Create new surveys with type, date, surveyor
- Survey types: habitat_survey, species_survey, protected_species, vegetation_survey
- Weather conditions recording
- Survey notes and constraints

**Existing Components Used:**

- `/components/field-surveys/survey-form.tsx`
- `/components/field-surveys/survey-card.tsx`

**Database Operations:**

```typescript
// Create survey
createSurvey({
  project_id: projectId,
  survey_type: selectedType,
  survey_date: date,
  surveyor_id: userId,
  weather_conditions: weather,
  notes: notes,
  status: 'planned',
})
```

---

#### Step 5: Habitat Mapping

**Component:** `/components/steps/habitat-mapping-step.tsx`
**PRD Reference:** Draft document Section 3 - Field Survey Structure

**Purpose:**
Map habitats on-site using Fossitt classification codes.

**Features:**

- Split panel: Map (left) + Habitat list (right)
- Polygon drawing with automatic area calculation
- Fossitt code selection with color coding
- Condition assessment (1-5 scale)
- Evaluation (local to international importance)
- Habitat form dialog

**Fossitt Codes:**
Located in `/lib/data/fossitt-codes.ts` - Complete Irish habitat classification system.

**Existing Components Used:**

- `/components/field-surveys/habitat-form.tsx`
- `/components/maps/draw-controls.tsx`
- `/components/maps/project-map.tsx`

**Database Operations:**

```typescript
// Create habitat polygon
createHabitat({
  project_id: projectId,
  survey_id: selectedSurveyId,
  fossitt_code: selectedCode,
  boundary: geoJson,
  area_hectares: calculatedArea,
  condition: conditionScore,
  evaluation: evaluationLevel,
  notes: description,
})
```

---

#### Step 6: Target Notes

**Component:** `/components/steps/target-notes-step.tsx`
**PRD Reference:** Draft document - Target Notes shapefile

**Purpose:**
Record species observations and georeferenced notes.

**Features:**

- Map marker placement for observations
- Species observation form with:
  - Species name (common and scientific)
  - Taxon group (mammals, birds, plants, etc.)
  - Protected status flagging
  - Confidence level
  - Evidence type and count
- Photo upload support
- Filter by taxon group
- Survey selection

**Taxon Groups:**
mammals, birds, reptiles, amphibians, fish, invertebrates, plants, fungi

**Existing Components Used:**

- `/components/field-surveys/species-observation-form.tsx`

**Database Operations:**

```typescript
// Create observation
createObservation({
  survey_id: selectedSurveyId,
  species_name: speciesName,
  scientific_name: scientificName,
  taxon_group: taxonGroup,
  location: { type: 'Point', coordinates: [lng, lat] },
  is_protected: isProtected,
  confidence: confidenceLevel,
  evidence_type: evidenceType,
  count: observedCount,
  notes: observationNotes,
})
```

---

### Phase 3: Reporting (Steps 7-10)

#### Step 7: Data Analysis

**Component:** `/components/steps/data-analysis-step.tsx`
**PRD Reference:** Section 4.6 - Data Visualization

**Purpose:**
Analyze and visualize collected data before report generation.

**Features:**

- Summary statistics cards
- Habitat breakdown bar chart (Recharts)
- Habitat condition pie chart
- Species summary by taxon group
- Protected species count
- Data quality indicators
- CSV export functionality

**Charts (Recharts):**

```typescript
// Habitat area breakdown
<BarChart data={habitatData}>
  <Bar dataKey="area" fill="color" />
</BarChart>

// Condition distribution
<PieChart>
  <Pie data={conditionData} />
</PieChart>
```

**Database Operations:**

```typescript
// Read-only aggregation queries
useHabitatStats(projectId)
useObservationStats(projectId)
```

---

#### Step 8: AI Draft

**Component:** `/components/steps/ai-draft-step.tsx`
**PRD Reference:** Section 4.6, Section 6.1, Section 7

**Purpose:**
Generate AI-assisted report draft with ecologist input.

**Features:**

- 11 PEA report sections (CIEEM structure)
- Ecologist Opinion input field (critical PRD requirement)
- Section-by-section generation
- Edit generated content
- Regenerate individual sections
- Version management
- Draft status tracking

**Report Sections (PEA_REPORT_SECTIONS):**

1. Introduction
2. Site Description
3. Methodology
4. Desktop Study Results
5. Field Survey Results - Habitats
6. Field Survey Results - Fauna
7. Field Survey Results - Flora
8. Invasive Species
9. Ecological Evaluation
10. Recommendations
11. Conclusions

**Database Operations:**

```typescript
// Create/update report
createReport({
  project_id: projectId,
  report_type: 'pea',
  version: 1,
  status: 'draft',
  content: { sections: [...] },
  generated_by: userId
})
```

**AI Integration Note:**
Currently uses mock AI generation. To integrate real AI:

- Add OpenAI API integration in `/lib/ai/report-generator.ts`
- Use provided prompts from PRD Section 6.1

---

#### Step 9: Quality Review

**Component:** `/components/steps/quality-review-step.tsx`
**PRD Reference:** Section 4.6 - Quality Control

**Purpose:**
Peer review and approval workflow for generated reports.

**Features:**

- Full report preview
- Quality checklist (4 categories, 16 items):
  - Data Completeness
  - Report Structure
  - Scientific Accuracy
  - Formatting & Presentation
- Auto-check based on data availability
- Reviewer assignment
- Approve/Reject workflow
- Status: draft → internal_review → approved

**Checklist Categories:**

```typescript
const QUALITY_CHECKLIST = {
  data_completeness: [
    'Site boundary defined',
    'Habitat mapping complete',
    'Species observations recorded',
    'Desk study findings documented'
  ],
  report_structure: [...],
  scientific_accuracy: [...],
  formatting: [...]
}
```

**Database Operations:**

```typescript
// Approve report
updateReport({
  reportId: report.id,
  updates: {
    status: 'approved',
    reviewed_by: userId,
  },
})
```

---

#### Step 10: Final Submission

**Component:** `/components/steps/final-submission-step.tsx`
**PRD Reference:** Section 4.6 - Final Report

**Purpose:**
Export and finalize the project report.

**Features:**

- Report summary statistics
- Cover page configuration (title, client)
- Appendix selection:
  - Habitat Map
  - Species List
  - Site Photographs
  - Survey Datasheets
  - Desk Study Data
  - Legislation References
- Export format selection (PDF/DOCX/HTML)
- Project completion marking

**Export Note:**
Currently generates mock text export. For production:

- Integrate `@react-pdf/renderer` for PDF
- Use `docx` package for Word documents

**Database Operations:**

```typescript
// Finalize project
updateReport({
  reportId: report.id,
  updates: { status: 'final' },
})

updateProject({
  projectId: project.id,
  updates: { status: 'completed' },
})

completeWorkflowStep({
  projectId: project.id,
  stepNumber: 10,
})
```

---

## React Query Hooks Reference

All data operations use React Query hooks from `/hooks/use-project-data.ts`:

### Read Hooks

```typescript
useProject(projectId) // Get project details
useWorkflowSteps(projectId) // Get all workflow steps
useProjectProgress(projectId) // Calculate completion percentage
useSurveys(projectId) // Get project surveys
useHabitats(projectId) // Get habitat polygons
useObservations(surveyId) // Get species observations
useFindings(projectId) // Get desk research findings
useLatestReport(projectId) // Get latest report version
useHabitatStats(projectId) // Aggregated habitat data
useObservationStats(projectId) // Aggregated observation data
```

### Mutation Hooks

```typescript
useUpdateProject() // Update project fields
useCreateSurvey() // Create new survey
useUpdateSurvey() // Update survey status
useCreateHabitat() // Create habitat polygon
useDeleteHabitat() // Remove habitat
useCreateObservation() // Create species observation
useDeleteObservation() // Remove observation
useCreateFinding() // Save desk research finding
useUpdateFinding() // Update finding notes
useDeleteFinding() // Remove finding
useCreateReport() // Create new report
useUpdateReport() // Update report content/status
useCompleteWorkflowStep() // Mark step as complete
```

---

## Future Development Guide

### For Each Step Iteration

When continuing work on a specific step:

1. **Read the step component:**

   ```
   /components/steps/{step-name}-step.tsx
   ```

2. **Check related hooks:**

   ```
   /hooks/use-project-data.ts
   ```

3. **Check related queries:**

   ```
   /lib/supabase/queries/{relevant-file}.ts
   ```

4. **Reference PRD sections** noted above for requirements

### Common Enhancement Areas

1. **Step 1 (GIS Mapping):**
   - Add Shapefile parsing with `shpjs`
   - KML/KMZ import support

2. **Step 2 (Data Gathering):**
   - Add EPA Catchments API
   - Aerial imagery time series

3. **Step 5 (Habitat Mapping):**
   - Linear habitat support (hedgerows, streams)
   - Point habitat support (springs)

4. **Step 6 (Target Notes):**
   - Photo upload to Supabase Storage
   - Offline support for field use

5. **Step 8 (AI Draft):**
   - OpenAI API integration
   - Custom prompt templates per report type

6. **Step 10 (Final Submission):**
   - PDF generation with `@react-pdf/renderer`
   - DOCX generation with `docx` package

---

## Troubleshooting

### Common TypeScript Issues

1. **Json type casting:**

   ```typescript
   // When reading Json from Supabase
   const data = rawData as unknown as ExpectedType

   // When writing to Supabase Json field
   raw_data: (value as unknown as Json) || null
   ```

2. **Database type mismatches:**
   Check `/types/database.ts` for valid status values and field names.

### Database Field Reference

| Field                   | Valid Values                                 |
| ----------------------- | -------------------------------------------- |
| `projects.status`       | draft, active, completed, archived           |
| `surveys.status`        | planned, in_progress, completed, approved    |
| `reports.status`        | draft, internal_review, approved, final      |
| `workflow_steps.status` | pending, in_progress, needs_review, approved |

---

## Testing Checklist

For each step, verify:

- [ ] UI renders correctly
- [ ] Forms submit successfully
- [ ] Data saves to Supabase
- [ ] Data loads from Supabase
- [ ] Workflow step status updates
- [ ] Navigation to next step works
- [ ] Error states display properly
- [ ] Loading states show spinner

---

_Last Updated: January 2026_
_Implementation completed with Supabase integration_
