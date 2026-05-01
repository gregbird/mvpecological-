# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Detailed domain rules are in `.claude/rules/` — they load automatically when working with matching files.

## Project Overview

**Dulra** is an end-to-end project management platform for ecological consultancies in Ireland. It manages ecological projects through desk research, field surveys, and reporting phases with an 8-step workflow system. The platform integrates with Irish/EU biodiversity databases (NPWS, GBIF, NBDC, EPA, Catchments.ie) and uses AI for report generation.

### Report Types: PEA, EcIA, AA Screening, NIS

## Build & Development Commands

```bash
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking
```

## Data Flow Conventions

- **Always use existing data — never re-fetch** — Check whether data exists in a prior workflow step, React Query cache, or Supabase table before making API calls.
- **Step data flows forward, never sideways** — Each step consumes outputs from earlier steps.

## Development Rules

### Code Quality

- **No `any` types** — use `unknown`, proper interfaces, or Supabase generated types from `types/database.ts`
- **No double type casts** (`as unknown as undefined`) — fix the underlying type issue
- **No `console.log` in production code** — use `console.error` only for actual errors
- **Run `npm run lint` after every change** — zero warnings is the target
- **Run `npm run build` before marking a feature complete**

### Dark Mode (Tailwind v4)

- **`@custom-variant dark` in `globals.css`** — without this, `dark:` prefix binds to `@media (prefers-color-scheme)` instead of `.dark` class
- **Structural backgrounds: use CSS variables** — `bg-background`, `bg-card`, `text-foreground`, `border-border` (auto-adapts)
- **Specific colors: add `dark:` variant** — e.g. `bg-emerald-50 dark:bg-emerald-950`
- **Never use `bg-white`** — use `bg-background` or `bg-card` instead
- **Markdown content: always add `dark:prose-invert`** alongside `prose`

### AI Analysis Data Flow

- **Step 3 Ecological Summary** → `api/ai/desk-insights` — takes all saved findings (designated_site, species_record, water_quality, catchment, habitat, company_report) + deep research + aquatic research
- **Summary persists** to workflow step metadata as `aiInsights`
- **Step 6 AI Draft** → `api/ai/report-section` uses `deskInsights` from metadata as context for report generation

### Component Patterns

- **Forms: always use React Hook Form + Zod** — `useForm({ resolver: zodResolver(schema) })` with shadcn `<Form>/<FormField>/<FormMessage>`
- **Step root container: `flex h-full flex-col`** — ensures consistent dashboard panel layout
- **Keep files under 500 lines** — extract logic into hooks (`hooks/`) and UI into sub-components in the step's subdirectory
- **Shared constants in `lib/config/`** — don't hardcode values in component files
- **Dialog forms must `form.reset()` on open** — `useForm` only uses `defaultValues` on first mount

### Data Layer

- **Error handling: throw on failure** — don't silently return `null`. Let React Query catch errors
- **React Query invalidation: always include entity ID** — `['findings', projectId]` not `['findings']`
- **Use Supabase generated types** — import from `types/database.ts`, don't create parallel type definitions

### Git & Workflow

- **Conventional commits** — `feat:`, `fix:`, `refactor:`, `chore:`, `style:`, `docs:`
- **English commit messages**
- **Don't commit without being asked**

## Refactoring Guidelines

- **Think domain-first, not file-size-first** — Understand the ecological consulting workflow before restructuring.
- **Adapt UI patterns, don't copy them** — Preserve target component's own data shape and context.

## Known Issues & Gotchas

- **React 19 + Radix UI `removeChild` DOM errors** — Fix by ensuring the `asChild` child is always mounted (use CSS `hidden` instead of conditional `&&`).
- **NBDC species search uses POST with form data** — Not JSON.
- **NPWS API has a 10-second timeout** — Handle explicitly.

## Architecture

### Tech Stack

- Next.js 16+ (App Router), React 19+, TypeScript 5.9+
- Supabase (Auth & PostgreSQL with PostGIS)
- Tailwind CSS 4+ with shadcn/ui, React Hook Form + Zod
- Leaflet for mapping, Turf.js for geospatial calculations
- TanStack React Query, Anthropic Claude (Sonnet/Haiku) via Supabase Edge Function proxy, OpenAI text-embedding-3-small (Company Reports RAG only), jsPDF

### Path Alias

Use `@/` for all imports: `import { Button } from '@/components/ui/button'`

### Modular Architecture (Post Multi-Site Refactoring)

- **Context providers** — `DataGatheringProvider` in `contexts/data-gathering-context.tsx` eliminates prop drilling for data gathering substeps
- **Shared hooks** — `hooks/shared/` contains reusable hooks:
  - `use-spatial-filter.ts` — turf.js spatial filtering (boundary + buffer)
  - `use-boundary-hash.ts` — boundary change detection + cache invalidation
  - `use-auto-search.ts` — auto-search orchestration without mounting substeps
  - `use-project-boundary.ts` — shared boundary resolution across steps
- **Domain hooks** — `hooks/data-gathering/`, `hooks/maps/`, `hooks/steps/` contain extracted business logic
- **Config files** — `lib/config/finding-colors.ts` for shared color constants

### Status Colors

- **Phase:** desk_research (blue), field_research (green), reporting (purple)
- **Health:** on_track (green), at_risk (amber), overdue (red)
- **Workflow:** pending (gray), in_progress (blue), needs_review (amber), approved (green)

## 8-Step Workflow

| Phase          | Step | Name             | Component                                                                     |
| -------------- | ---- | ---------------- | ----------------------------------------------------------------------------- |
| Desk Research  | 1    | GIS Mapping      | `gis-mapping-step.tsx`                                                        |
| Desk Research  | 2    | Data Gathering   | `data-gathering-step.tsx`                                                     |
| Desk Research  | 3    | Desk Assessment  | `desk-assessment-step.tsx`                                                    |
| Field Research | 4    | Field Research   | `field-research-step.tsx` (tabs: Field Survey, Habitat Mapping, Target Notes) |
| Reporting      | 5    | Data Analysis    | `data-analysis-step.tsx`                                                      |
| Reporting      | 6    | AI Draft         | `ai-draft-step.tsx`                                                           |
| Reporting      | 7    | Quality Review   | `quality-review-step.tsx`                                                     |
| Reporting      | 8    | Final Submission | `final-submission-step.tsx`                                                   |

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=                # Embeddings only — Company Reports RAG (text-embedding-3-small)
DROPBOX_APP_KEY=               # Dropbox OAuth — Company Reports document sync
DROPBOX_APP_SECRET=
NEXT_PUBLIC_APP_URL=           # e.g. http://localhost:3000 — used by Dropbox OAuth callback
```

**AI provider note:** All chat/synthesis goes through Anthropic Claude via the
`claude-proxy` Supabase Edge Function (key in Edge Function Secret
`ANTHROPIC_API_KEY`, not in `.env.local`). Two tiers in `lib/ai/anthropic-models.ts`:
`CLAUDE_SYNTHESIS_MODEL` (Sonnet — Step 3 desk-insights, Step 8 final-tier
data-analysis-summary) and `CLAUDE_CHEAP_MODEL` (Haiku — everything else).
OpenAI is retained only for embeddings in `lib/dropbox/embeddings.ts` because
Anthropic does not offer an embedding API; re-indexing risk made migration
unjustified. See `docs/feedback/feedback-1-5-may-claude-migration.md` for the
full migration record.

## Performance Debt

Tracked items that would speed up the app or reduce cost. Tackle when touching the affected area.

- **`raw_data` normalization — Aşama 2 step 4 + 5-8** — typed columns exist and are dual-written (Aşama 1 done 2026-04-19). Read paths in Step 2 prefer columns already. Remaining work: narrow `useSavedFindings` to skip `raw_data` (the 310ms → 20ms win) + migrate reads in Step 3 desk-assessment, Step 5 data-analysis, Step 6 AI draft. Full plan in `docs/raw-data-migration-plan.md`.
- **`select('*')` in non-findings list queries** — `projects.ts:71`, `releve-surveys.ts` and others still return all columns. Same refactor pattern as findings.
- **Client-side habitat stats reduce** — `getHabitatStats()` pulls all rows then reduces in JS. Move to a PostGIS RPC (`GROUP BY fossitt_code, condition`, `SUM(area_hectares)`) once habitat counts exceed a few hundred per project.
- **EPA `Promise.all` without per-type fallback** — `lib/external-apis/epa.ts` fires rivers/lakes/catchments/water quality in parallel; one failing type produces an ambiguous empty UI. Switch to `Promise.allSettled` and surface which feature timed out.
- **FOSSITT em-dash save guard** — `mapNlcToFossitt` returns `'—'` when no mapping exists; that string survives into reports as an empty row. Add a save-time guard that warns or relabels "Unclassified NLC <id>".
- **Supabase advisors unreviewed** — run `mcp__supabase__get_advisors` periodically; surface RLS/index/function `search_path` findings to Greg rather than acting blindly.

## Known Dangerous Shapes

- **Save All fires one AI request per saved finding** — default behaviour. Substeps that can return thousands of rows MUST configure `autoAiSummaryFilter` or Save All burns ~$3 + 30 min of UI lockup. See `step2-species-records.md` for the species filter and the 2026-04-19 incident that forced the guard.
