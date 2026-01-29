# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dulra is an end-to-end project management platform for ecological consultancies in Ireland. It manages ecological projects through desk research, field surveys, and reporting phases with a 16-step workflow system.

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
- Tailwind CSS 4+ with Radix UI components
- React Hook Form + Zod for validation
- Leaflet for mapping
- TanStack React Query

### Route Structure
```
app/
├── (auth)/              # Auth routes (login, register)
│   └── layout.tsx       # Split view with dev role selector
├── (dashboard)/         # Protected routes
│   ├── layout.tsx       # Sidebar + Header layout
│   ├── page.tsx         # Dashboard home
│   └── projects/
│       ├── page.tsx     # Projects list
│       ├── new/         # Create project
│       └── [id]/        # Project detail, desk-research, field-surveys, reports
```

### Component Organization
- `components/ui/` - Radix UI + shadcn primitives
- `components/layout/` - Header, Sidebar, ThemeToggle
- `components/dashboard/` - Project cards, stats, filters
- `components/maps/` - Leaflet map and draw controls
- `components/desk-research/` - Search, source selector, findings
- `components/field-surveys/` - Survey forms, species observations, habitats

### Data Layer
- `lib/supabase/client.ts` - Browser client
- `lib/supabase/server.ts` - Server client with cookies
- `lib/external-apis/` - NPWS, GBIF, NBDC integrations
- `types/database.ts` - Supabase generated types

## Key Patterns

### 16-Step Workflow
Projects use a standardized workflow in 3 phases:
- **Desk Research** (steps 1-5): Historical data, GIS mapping, data mining
- **Field Research** (steps 6-11): Habitat surveys, species recording, photo documentation
- **Reporting** (steps 12-16): Data quality, analysis, peer review, final report

### Form Validation
```tsx
const schema = z.object({ ... })
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) })
```

### Path Alias
Use `@/` for all imports: `import { Button } from '@/components/ui/button'`

### Status Colors
- Phase: desk_research (blue), field_research (green), reporting (purple)
- Health: on_track (green), at_risk (amber), overdue (red)
- Workflow: pending (gray), in_progress (blue), needs_review (amber), approved (green)

## Database Schema

Key tables: organizations, profiles, clients, projects (with PostGIS geometry), project_members, workflow_steps, desk_research_findings, surveys, species_observations, habitat_polygons, photos, reports, audit_log

User roles: admin, senior_ecologist, ecologist, field_ecologist, gis_specialist, client

## External APIs

- **NPWS**: ArcGIS REST API for designated sites (SAC, SPA, NHA, etc.)
- **GBIF**: Global species occurrence records
- **NBDC**: National biodiversity data with protected status

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=  # optional
OPENAI_API_KEY=            # optional
```

## Development Notes

- Auth layout has dev mode role switcher (yellow button, bottom-right)
- Pages currently use mock data - replace with Supabase queries
- Site codes format: XXX-YYYY-NNN (auto-generated)
- FOSSITT codes in `lib/data/fossitt-codes.ts` for Irish habitat classification
