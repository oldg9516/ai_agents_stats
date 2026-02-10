# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Agent Statistics Dashboard — analytics platform for monitoring AI agent performance vs. human edits. Compares AI-generated outputs with human reviews to measure quality across request categories, prompt versions, and time periods.

**Business Context**: When a qualified agent (defined in `constants/qualified-agents.ts`) reviews AI output without changes, it indicates high-quality AI performance. The dashboard aggregates these metrics for tracking improvement.

## Development Commands

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
# No test command configured yet
```

**Notes**:
- Default locale is Russian — access at `http://localhost:3000` (or `/ru`)
- English at `http://localhost:3000/en`
- Protected routes redirect to `/login`; requires @levhaolam.com Google account

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS v4** with OKLCH color space CSS variables
- **shadcn/ui** (new-york style) — add components via shadcn MCP server
- **Supabase** (PostgreSQL) — `@supabase/supabase-js` + `@supabase/ssr`
- **TanStack React Query** — caching, retry, timeout
- **TanStack React Table** — sorting, filtering, pagination
- **Zustand** — filter state with localStorage persistence
- **Recharts** + **@nivo/sankey** + **@nivo/heatmap** — charts
- **next-intl** — i18n (Russian default, English)
- **next-themes** — dark mode (class-based)

## Architecture

### Key Directories

```
app/[locale]/(root)/        # Public pages (landing, docs, login, unauthorized)
app/[locale]/(analytics)/   # Protected pages (dashboard, support-overview, etc.)
components/                 # UI (ui/, filters/, kpi/, charts/, tables/, layouts/)
lib/
  supabase/                 # DB clients + query functions
    queries/                # Dashboard queries (kpi.ts, charts.ts, filters.ts, utils.ts)
    queries-support/        # Support queries (kpi.ts, charts.ts, threads.ts, utils.ts)
  actions/                  # Server Actions (one per page module)
  queries/                  # React Query hooks + query-keys.ts + query-config.ts
  store/                    # Zustand slices + hooks + create-filter-slice.ts factory
  auth/                     # Auth provider + utilities
  hooks/                    # Custom hooks (use-dashboard-data, use-support-data, etc.)
  utils/                    # Helpers (export, quality-colors, validate-date-range, etc.)
constants/                  # qualified-agents, classification-types, support-statuses, etc.
messages/                   # en.json, ru.json (translation files)
i18n/                       # routing.ts (locale config), request.ts
```

### Data Flow

```
Client Component → Zustand filters (persisted to localStorage)
                 → React Query hook (lib/queries/)
                 → Server Action (lib/actions/)
                 → Query function (lib/supabase/queries/)
                 → Supabase client (service_role key, bypasses RLS)
                 → PostgreSQL
```

**Key architectural decisions**:
- Server Actions fetch data (not Client Components calling Supabase directly)
- Service role key used server-side to bypass RLS
- Real-time subscriptions are **disabled** — with 5500+ records/day they caused excessive queries. Users see updates after staleTime expires or manual refresh
- Charts use dynamic imports with `ssr: false` for code splitting

### Database Tables

**`ai_human_comparison`** — Primary table for quality metrics:
- `request_subtype` (category), `prompt_version`, `email` (reviewer), `created_at`
- `changed` (boolean) — legacy v3.x quality field
- `ai_approved` (boolean | null) — v4.0 priority field (takes precedence when true)
- `change_classification` (text | null) — v4.0 penalty-based classification

**`support_threads_data`** — Support thread operations and AI drafts.
Joined with `ai_human_comparison` for quality metrics.

**`ticket_reviews`** — Ticket review data.

### Quality Scoring (v4.0)

Penalty-based scoring with 11 classifications (see `constants/classification-types.ts`):

| Classification | Penalty | Score | Group |
|---------------|---------|-------|-------|
| PERFECT_MATCH | 0 | 100 | Good (green) |
| STYLISTIC_EDIT | -2 | 98 | Good |
| STRUCTURAL_FIX | -5 | 95 | Good |
| TONAL_MISALIGNMENT | -10 | 90 | Good |
| CONFUSING_VERBOSITY | -15 | 85 | Needs Work (yellow) |
| MINOR_INFO_GAP | -20 | 80 | Needs Work |
| MAJOR_FUNCTIONAL_OMISSION | -50 | 50 | Critical (red) |
| CRITICAL_FACT_ERROR | -100 | 0 | Critical |
| EXCL_WORKFLOW_SHIFT | N/A | — | Excluded (gray) |
| EXCL_DATA_DISCREPANCY | N/A | — | Excluded |
| HUMAN_INCOMPLETE | N/A | — | Excluded |

**Priority logic** (`isQualityRecord()`): `ai_approved = true` → Quality; else use `change_classification`.

### React Query Configuration

Cache settings are centralized in `lib/queries/query-config.ts`:

```typescript
import { QUERY_CACHE_CONFIG } from '@/lib/queries/query-config'

// Use spread — don't hardcode cache values
const { data } = useQuery({
  queryKey: dashboardKeys.data(filters),
  queryFn: () => fetchDashboardData(filters),
  ...QUERY_CACHE_CONFIG,  // 5min staleTime, 15min gcTime, 2 retries
})
```

Query keys are centralized in `lib/queries/query-keys.ts` — always use the factory functions (e.g., `dashboardKeys.data(filters)`) for cache invalidation consistency.

### Zustand State Management

Combined store with 5 slices, persisted to `localStorage` key `ai-stats-storage` (version 10 with migration):

| Slice | Default Period | Location |
|-------|---------------|----------|
| dashboardFilters | 30 days | `lib/store/slices/dashboard-slice.ts` |
| supportFilters | 30 days | `lib/store/slices/support-slice.ts` |
| ticketsReviewFilters | 30 days | `lib/store/slices/tickets-review-slice.ts` |
| backlogReportsFilters | 90 days | `lib/store/slices/backlog-reports-slice.ts` |
| agentStatsFilters | 30 days | `lib/store/slices/agents-stats-slice.ts` |

New slices should use `create-filter-slice.ts` factory (`filterSliceActions()`) for standard CRUD operations. Access via hooks in `lib/store/hooks/`.

### Date Filter Mode

Queries support two filter modes passed through the entire data flow:
- `'created'` — filter by `created_at` (when record was created)
- `'human_reply'` — filter by human review date

### Authentication

Google OAuth via Supabase with @levhaolam.com email domain restriction. Triple-layer validation: OAuth hint → server-side domain check → PostgreSQL trigger.

Middleware (`middleware.ts`) handles both auth and i18n. Protected routes are under `(analytics)/` route group. Components can assume user exists on protected routes.

**Key files**: `middleware.ts`, `lib/auth/`, `lib/supabase/server.ts`, `lib/supabase/client.ts`

## Internationalization (i18n)

- **Locales**: Russian (`ru`, default — no URL prefix) and English (`en`, prefixed)
- **Config**: `i18n/routing.ts`
- **Translations**: `messages/en.json` and `messages/ru.json` — update BOTH when adding text

**Critical**: Always use next-intl navigation wrappers:
```typescript
// ✅ Correct
import { Link, useRouter, usePathname } from '@/i18n/routing'

// ❌ Wrong — loses locale context
import { Link, useRouter, usePathname } from 'next/navigation'
```

Use `useTranslations('namespace')` in client components, `getTranslations('namespace')` in server components.

## Common Pitfalls

### Data Fetching
- **Always** use Server Actions from Client Components — never call Supabase directly from client
- **Always** SELECT specific fields, never `SELECT *`
- Use page-specific hooks (e.g., `useDetailedStats` for /detailed-stats) — don't fetch all data on every page
- Spread `QUERY_CACHE_CONFIG` — don't hardcode cache/retry values
- All Server Actions include 30s timeout protection via `REQUEST_TIMEOUT`

### Styling
- Use `cn()` from `lib/utils` for merging Tailwind classes
- Chart colors: `--chart-1` through `--chart-12` CSS variables (auto dark mode)
- Status names with spaces must use `toSafeCssName()` for CSS variable compatibility
- Component variants via `class-variance-authority`

### Charts
- Dynamic import with `ssr: false` to reduce initial bundle:
```typescript
const Chart = dynamic(
  () => import('./charts/my-chart').then(mod => ({ default: mod.MyChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
)
```

## Key References

| Resource | Location |
|----------|----------|
| Product spec | `docs/PRD.md` |
| Performance & indexes | `docs/PERFORMANCE.md` |
| Auth setup guide | `docs/AUTH_SETUP_GUIDE.md` |
| Server Actions architecture | `docs/SERVER_ACTIONS_ARCHITECTURE.md` |
| v4.0 scoring system | `constants/classification-types.ts` |
| Qualified agents list | `constants/qualified-agents.ts` |
| Cache configuration | `lib/queries/query-config.ts` |
| Query key factories | `lib/queries/query-keys.ts` |
| Filter slice factory | `lib/store/create-filter-slice.ts` |
| MCP servers | `.mcp.json` (shadcn + context7) |
| Environment template | `.env.local.example` |
