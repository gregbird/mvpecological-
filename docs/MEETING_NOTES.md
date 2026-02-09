# Dulra - Meeting Notes & Action Items

## 🚨 Demo Deadline: Monday (Feb 10, 2026) Afternoon

Greg has a demo call with an ecological firm. Need a working end-to-end prototype.

---

## Meeting: Feb 6, 2026 (09:48 GMT)

### Attendees

- Greg Birdthistle
- Abdurrahim Balta

### Key Decisions

1. Demo must show full workflow: Dashboard → GIS → Data Gathering → Field Survey → AI Report
2. Controlled environment: Pre-defined location (Ross Bay area), 10km buffer
3. Focus on "wow effect" - showing functionality, not perfection
4. Greg will talk to Paddy (ecologist) to improve AI prompts

---

## 🔴 Critical Bugs

### 1. Boundary Search Bug

**Status:** ✅ FIXED
**Problem:** NPWS designated sites search only finds sites OUTSIDE boundary, not INSIDE.
**Example:** Ross Bay (SAC) is inside the boundary but doesn't appear in results.
**Root Cause:** `calculateDistanceFromBoundary()` was checking if site centroid is inside boundary, not if site geometry intersects boundary.
**Fix:** Updated to use `turf.booleanIntersects()` for polygon geometries - now correctly detects when project boundary overlaps with or is inside a designated site. Also added sorting: distance=0 sites appear first.
**File:** `components/steps/data-gathering/designated-sites-substep.tsx`

### 2. Desk Assessment AI Not Using Findings

**Status:** 🟡 Waiting for Paddy
**Problem:** AI Generate says "No designated sites" even though sites were found.
**Solution:** Prompt needs to use actual desk research findings data.
**Waiting:** Greg will update after Paddy call (~2 hours from meeting)

---

## 📋 Action Items

### High Priority (Before Monday)

| #   | Task                           | Owner      | Status     | Notes                                  |
| --- | ------------------------------ | ---------- | ---------- | -------------------------------------- |
| 1   | Fix boundary interior search   | Abdurrahim | ✅ DONE    | Fixed with booleanIntersects + sorting |
| 2   | Update Management Dashboard    | Abdurrahim | 🔴 TODO    | Match existing prototype visuals       |
| 3   | Fix Desk Assessment AI prompt  | Abdurrahim | 🟡 WAITING | Need Paddy's input from Greg           |
| 4   | Layout 60% map / 40% panel     | Abdurrahim | 🔴 TODO    | All Data Gathering screens             |
| 5   | Default satellite map style    | Abdurrahim | ✅ DONE    | All map screens                        |
| 6   | Remove GIS Mapping Review step | Abdurrahim | 🔴 TODO    | Layers → Complete directly             |

### Medium Priority

| #   | Task                         | Owner      | Status     | Notes                     |
| --- | ---------------------------- | ---------- | ---------- | ------------------------- |
| 7   | Protected species sort first | Abdurrahim | 🟡 TODO    | In Species Records list   |
| 8   | Field Survey implementation  | Abdurrahim | 🟡 WAITING | Need info from Greg/Paddy |
| 9   | PEA Report generation        | Abdurrahim | 🟡 TODO    | Review sample report      |
| 10  | Map screenshot for report    | Abdurrahim | 🟡 TODO    | Boundary + icons visible  |

### Low Priority (Post-Demo)

| #   | Task                                 | Owner      | Status   | Notes                       |
| --- | ------------------------------------ | ---------- | -------- | --------------------------- |
| 11  | Toast notifications - remove/shorten | Abdurrahim | ⚪ LATER | Greg finds them distracting |
| 12  | Header overlap fix                   | Abdurrahim | ⚪ LATER | Minor UI issue              |
| 13  | Draggable Deep Research modal        | Abdurrahim | ⚪ LATER |                             |

---

## Meeting: Feb 5, 2026 (14:14 GMT)

### Attendees

- Greg Birdthistle
- Abdurrahim Balta

### Key Points

- Anna (department manager) needs to understand Dulra functionality
- Team meeting in Kerry ~Feb 26 (dates jam-packed)
- Greg explained habitat/species importance for ecologists

### Feedback Items (Incorporated Above)

- Default satellite on all maps
- Remove Review step from GIS wizard
- 60/40 layout for Data Gathering
- NBDC enrichment: common name, scientific name, group, designations, records
- AI summary for designated sites (from SSCO PDFs)
- Hide from map toggle not working in Aquatic Features

---

## Technical Notes

### NPWS Site Search - Current Flow

1. Get project boundary
2. Calculate bounding box with buffer
3. Query NPWS API for sites in bbox
4. **BUG:** This excludes sites that are INSIDE the boundary

### Proposed Fix

```
1. Search sites intersecting with boundary (distance = 0)
2. Search sites within buffer zones
3. Sort: boundary interior first, then by distance
```

### Data Sources

- **NPWS:** SAC, SPA, NHA, pNHA (ArcGIS REST)
- **GBIF:** Species occurrences
- **NBDC:** Species enrichment (protection status, Irish records)
- **EPA:** Rivers, Lakes, Catchments (WFS)

### AI Integration

- OpenAI GPT-4 via direct fetch
- SSCO PDF parsing with `unpdf` library
- Deep Research: Excel data + PDF + AI analysis

---

## Greg's Contact Info

- Next update: ~2 hours after Feb 6 meeting (after Paddy call)
- Available for calls: anytime, just ask

---

## File References

- GIS Mapping: `components/steps/gis-mapping-step.tsx`
- Data Gathering: `components/steps/data-gathering-step.tsx`
- Designated Sites: `components/steps/data-gathering/designated-sites-substep.tsx`
- Species Records: `components/steps/data-gathering/species-records-substep.tsx`
- Aquatic Features: `components/steps/data-gathering/aquatic-features-substep.tsx`
- NPWS API: `lib/external-apis/npws.ts`
- NPWS Excel Data: `lib/data/npws-sites-data.json`

---
