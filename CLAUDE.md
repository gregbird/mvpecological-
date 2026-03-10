# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Detailed domain rules are in `.claude/rules/` — they load automatically when working with matching files.

## Project Overview

**Dulra** is an end-to-end project management platform for ecological consultancies in Ireland. It manages ecological projects through desk research, field surveys, and reporting phases with a 10-step workflow system. The platform integrates with Irish/EU biodiversity databases (NPWS, GBIF, NBDC, EPA, Catchments.ie) and uses AI for report generation.

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

### Component Patterns

- **Forms: always use React Hook Form + Zod** — `useForm({ resolver: zodResolver(schema) })` with shadcn `<Form>/<FormField>/<FormMessage>`
- **Step root container: `flex h-full flex-col`** — ensures consistent dashboard panel layout
- **Keep files under 400 lines** — extract sub-components into the step's subdirectory
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
- TanStack React Query, OpenAI GPT-4o-mini, jsPDF

### Path Alias

Use `@/` for all imports: `import { Button } from '@/components/ui/button'`

### Status Colors

- **Phase:** desk_research (blue), field_research (green), reporting (purple)
- **Health:** on_track (green), at_risk (amber), overdue (red)
- **Workflow:** pending (gray), in_progress (blue), needs_review (amber), approved (green)

## 10-Step Workflow

| Phase          | Step | Name             | Component                   |
| -------------- | ---- | ---------------- | --------------------------- |
| Desk Research  | 1    | GIS Mapping      | `gis-mapping-step.tsx`      |
| Desk Research  | 2    | Data Gathering   | `data-gathering-step.tsx`   |
| Desk Research  | 3    | Desk Assessment  | `desk-assessment-step.tsx`  |
| Field Research | 4    | Field Survey     | `field-survey-step.tsx`     |
| Field Research | 5    | Habitat Mapping  | `habitat-mapping-step.tsx`  |
| Field Research | 6    | Target Notes     | `target-notes-step.tsx`     |
| Reporting      | 7    | Data Analysis    | `data-analysis-step.tsx`    |
| Reporting      | 8    | AI Draft         | `ai-draft-step.tsx`         |
| Reporting      | 9    | Quality Review   | `quality-review-step.tsx`   |
| Reporting      | 10   | Final Submission | `final-submission-step.tsx` |

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=                # Server-side AI
NEXT_PUBLIC_OPENAI_API_KEY=    # Client-side AI (reports)
```

## Known Issues to Fix

- [x] `habitat-mapping-step.tsx:539` — `disabled={false}` hardcoded → fixed: uses `workflowStep.status === 'approved'`
- [x] Ireland center coords duplicated in 13 files → fixed: all use `IRELAND_CENTER` from `lib/config/map-constants.ts`
- [x] `SURVEY_TYPE_LABELS` duplicated in 6 files → fixed: centralized in `lib/config/survey.ts`
- [x] `findingsByType` grouping logic duplicated → fixed: `groupFindingsByType()` in `lib/utils/group-findings-by-type.ts`
- [ ] Two separate `TargetNoteForm` components exist
- [x] Debug `console.log` in production code (5 files) → fixed: all removed
