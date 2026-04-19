# `desk_research_findings.raw_data` Normalization — Migration Plan

**Status:**

- Aşama 1 applied 2026-04-19 — schema + backfill + dual-write.
- Aşama 2 steps 1-3 applied 2026-04-19 — read paths prefer typed columns, fall back to `raw_data`.
- Aşama 2 step 4 (narrow the `useSavedFindings` select) — deferred to its own PR: 11+ consumers directly read `savedFindings.raw_data` (deep research save, review-export, data-gathering-preview, baseline-report-tab, etc.). Auditing and refactoring them to on-demand fetch is a focused chunk of work worth its own review cycle.
- Aşama 2 steps 5-8 (desk assessment + data analysis + AI draft + export) — pending.
- Aşama 3 (raw_data cleanup) — pending, requires `pg_dump` backup.

## Why we are doing this

`desk_research_findings.raw_data` (JSONB) averages **38 KB/row**. The list-view
path (`useSavedFindings`) reads every column including this JSONB, triggering
Postgres TOAST decompression on every query.

Measured on production via `pg_stat_statements`:

| Query                                          | Calls | Mean       | Total time |
| ---------------------------------------------- | ----- | ---------- | ---------- |
| `SELECT * FROM desk_research_findings WHERE …` | 2 047 | **310 ms** | **636 s**  |

This one query accounts for the majority of DB time in the application.

Once the hot metadata fields live in their own columns, the list query can
select just what it needs and skip TOAST entirely. Expected drop: 310 ms → ~20 ms.

## Scope

### Columns added (Aşama 1 — done)

| Column            | Type      | Source `raw_data` path                                | data_type(s)                 |
| ----------------- | --------- | ----------------------------------------------------- | ---------------------------- |
| `ai_summary`      | `text`    | `metadata.aiSummary` (habitat: top-level `aiSummary`) | all                          |
| `site_code`       | `text`    | `metadata.siteCode` / top-level `SITECODE`            | designated, water, catchment |
| `site_type`       | `text`    | `metadata.siteType` / top-level `SITE_TYPE`           | designated, water, catchment |
| `scientific_name` | `text`    | `metadata.scientificName` / top-level                 | species                      |
| `common_name`     | `text`    | `metadata.commonName`                                 | species                      |
| `taxon_group`     | `text`    | `metadata.taxonGroup`                                 | species                      |
| `is_invasive`     | `boolean` | `metadata.isInvasive`                                 | species                      |
| `is_threatened`   | `boolean` | `metadata.isThreatened`                               | species                      |
| `fossitt_code`    | `text`    | top-level `fossittCode`                               | habitat                      |

### Stays in `raw_data` (NOT migrated)

- `deepResearch.aiAnalysis` — long narrative, cold access path
- `ssco` / `habitats` — SSCO enrichment arrays (26 designated_site rows)
- Full upstream API payload (OBJECTID, SITECODE, RiverCode, CatchmentId, …) — used by evidence matrix + export
- Species `gridSquares`, `nbdcData`, `sampleRecords` — bulky, spatial-only reads
- `geometry` inside raw_data (older rows) — separate cleanup; already have top-level `location` column

## Completed: Aşama 1 — dual-write foundation

**Applied 2026-04-19, zero regression risk.**

1. Migration `20260419_findings_extract_metadata_columns.sql` — adds 9 columns, backfills from existing `raw_data`, creates 3 partial indexes on site_code / scientific_name / fossitt_code.
2. Backfill coverage verified:
   - 1 902 / 1 904 species have `scientific_name`
   - 132 / 133 designated_site have `site_code`
   - 887 / 887 habitat have `fossitt_code`
   - All 197 aquatic/catchment rows have `site_code` + `site_type`
3. Write paths updated — every new finding populates both `raw_data` AND the new columns:
   - `components/steps/data-gathering/designated-sites-substep.tsx`
   - `components/steps/data-gathering/species-records-substep.tsx`
   - `components/steps/data-gathering/aquatic-features-substep.tsx`
   - `hooks/data-gathering/use-habitat-save.ts` (two payload sites)
4. TypeScript types extended in `types/database.ts`.

No read path was touched — existing code still reads from `raw_data`. This is deliberate: Aşama 1 is rollback-safe and has no user-visible change.

## Pending: Aşama 2 — gradual read migration (Greg approval)

Flip read paths one area at a time so each is independently testable and revertible.

### Order (low → high risk)

| #   | Area                                      | Files                                                                                                                                          | Risk    | Notes                                                                              |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| 1   | Step 2 restore path                       | `hooks/shared/use-substep-search.ts:132-157`                                                                                                   | 🟢 LOW  | Adds fallback `f.ai_summary ?? raw_data.metadata.aiSummary` — cache-miss path only |
| 2   | Step 2 filter/sort                        | `hooks/data-gathering/use-findings-filters.ts`                                                                                                 | 🟢 LOW  | In-memory filters; swap to column reads                                            |
| 3   | Step 2 UI cards                           | `components/steps/data-gathering/finding-card.tsx`, `findings-list.tsx`, `species-table-view.tsx`, `review-findings-table.tsx`                 | 🟡 MED  | Display values; regression visible immediately                                     |
| 4   | `useSavedFindings` explicit column select | `lib/supabase/queries/findings.ts`                                                                                                             | 🟡 MED  | THIS is where the 310 ms → 20 ms drop happens                                      |
| 5   | Step 3 Desk Assessment                    | `components/steps/desk-assessment/*.tsx`                                                                                                       | 🔴 HIGH | `designated-sites-matrix` has triple fallback chain — simplify carefully           |
| 6   | Step 5 Data Analysis                      | `components/steps/data-analysis/habitat-tab.tsx`, `desk-assessment-findings-section.tsx`                                                       | 🟡 MED  | Habitat `fossitt_code` swap                                                        |
| 7   | Step 6 AI Draft + reporting               | `app/api/ai/report-section/route.ts`, `app/api/ai/desk-insights/route.ts`, `lib/templates/template-renderer.ts`, `lib/export/appendix-data.ts` | 🔴 HIGH | LLM receives serialized findings; wrong field names = wrong reports                |
| 8   | Export helpers                            | `hooks/data-gathering/use-export-findings.ts`                                                                                                  | 🟢 LOW  | `getAISummary` helper already isolates this                                        |

Every step keeps the `raw_data` read as a fallback so partial deploys are safe.

### Safety nets

- `useSavedFindings` still selects `*` — do NOT narrow until step 4
- Keep `raw_data.metadata.*` writes in place (we dual-write; Aşama 3 removes them)
- After step 4 ships, measure: `pg_stat_statements` mean_time drop and frontend bundle size (fewer JSON bytes over the wire)

## Pending: Aşama 3 — cleanup (post-validation)

Only after Aşama 2 has stabilised in production for a sprint:

1. Remove `metadata.{aiSummary,siteCode,siteType,scientificName,commonName,taxonGroup,isInvasive,isThreatened}` from all write payloads and from existing rows:
   ```sql
   UPDATE desk_research_findings
   SET raw_data = raw_data
     #- '{metadata,aiSummary}'
     #- '{metadata,siteCode}'
     …
   WHERE raw_data->'metadata' IS NOT NULL;
   ```
2. Remove top-level `scientificName` / `SITECODE` / `fossittCode` duplicates.
3. Drop `raw_data.metadata.distance` (duplicate of `distance_from_boundary_km`) and `metadata.isProtected` (duplicate of `is_protected`).

**Before running:** take a `pg_dump` of `desk_research_findings`. JSONB pruning is not cleanly reversible.

## Danger zones observed in the audit

1. **`raw_data` shape is type-aware** — habitat has no `metadata` wrapper, every other type does. Migration SQL uses `CASE data_type` to handle this.
2. **Duplicate top-level + metadata** — species `scientificName` is written at both levels; designated `SITECODE` exists alongside `metadata.siteCode` in older rows. `COALESCE` handles reads, cleanup handles writes.
3. **`designation` (string) vs `designations` (array)** — species rows from different eras. Not migrated yet; still in `raw_data.metadata`.
4. **AI prompt serialization** — `app/api/ai/report-section/route.ts` serialises findings to the LLM. Any field-name mismatch after Aşama 2 step 7 = silently degraded reports. Manual regression test required before shipping.
5. **`deepResearch` is NOT migrated** — deep research analyses remain in `raw_data.deepResearch.aiAnalysis`. Restore path must still read from `raw_data` for this.

## Rollback

- **Aşama 1:** `ALTER TABLE … DROP COLUMN` + revert commit — zero data loss (`raw_data` still canonical).
- **Aşama 2:** revert commit per step — reads fall back to `raw_data` automatically.
- **Aşama 3:** restore from `pg_dump` — migration step is destructive.

## Effort

| Aşama                      | Estimate          | Status                   |
| -------------------------- | ----------------- | ------------------------ |
| 1 — schema + dual-write    | 1 day             | ✅ done                  |
| 2 — gradual read migration | 1-2 weeks (8 PRs) | ⏳ pending Greg approval |
| 3 — cleanup                | 1 day + backup    | ⏳ after Aşama 2 stable  |

## Open questions for Greg

1. Is there appetite to start Aşama 2 step 1 this sprint, or hold until mobile release is out?
2. Step 7 (AI/reporting) touches live client deliverables — do we want Greg to manually review a sample report before and after?
3. SSCO enrichment arrays — should we also normalize these, or leave in `raw_data`?
