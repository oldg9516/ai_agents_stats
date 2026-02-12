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
- Package manager is **pnpm** — do not use npm or yarn
- Default locale is Russian — access at `http://localhost:3000` (or `/ru`)
- English at `http://localhost:3000/en`
- Protected routes redirect to `/login`; requires @levhaolam.com Google account

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS v4** with OKLCH color space CSS variables — no `tailwind.config.ts` (v4 uses `@tailwindcss/postcss` plugin + `@theme inline` in `app/globals.css`)
- **shadcn/ui** (new-york style) — add components via shadcn MCP server
- **Supabase** (PostgreSQL) — `@supabase/supabase-js` + `@supabase/ssr`
- **TanStack React Query** — caching, retry, timeout
- **TanStack React Table** — sorting, filtering, pagination
- **Zustand** — filter state with localStorage persistence
- **Recharts** + **@nivo/sankey** + **@nivo/heatmap** — charts
- **next-intl** — i18n (Russian default, English); timezone `Asia/Jerusalem`
- **next-themes** — dark mode (class-based, custom variant: `@custom-variant dark (&:is(.dark *))`)
- **@dnd-kit** — drag-and-drop (sortable columns in tables)
- **tw-animate-css** — animation utilities

## Architecture

### Key Directories

```
app/[locale]/(root)/        # Public pages (landing, docs, login, unauthorized)
app/[locale]/(analytics)/   # Protected pages (see Analytics Pages below)
components/                 # UI (ui/, filters/, kpi/, charts/, tables/, layouts/, shared/)
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
constants/                  # qualified-agents, classification-types, action-types, pagination, etc.
messages/                   # en.json, ru.json (translation files)
i18n/                       # routing.ts (locale config), request.ts
```

### Analytics Pages

```
/dashboard                              # Main analytics dashboard
/dashboard/category/[categoryName]      # Category detail (parallel route modal)
/support-overview                       # Support threads overview
/support-overview/thread/[threadId]     # Thread detail (parallel route modal)
/tickets-review                         # Ticket reviews for qualified agents
/tickets-review/ticket/[ticketId]       # Ticket detail (parallel route modal)
/detailed-stats                         # Detailed statistics table
/request-categories                     # Request category analysis
/backlog-reports                        # Backlog reports list
/backlog-reports/[reportId]             # Individual report detail
/agents-stats                           # Agent performance statistics
/subcategories-stats                    # Subcategory analysis
/ai-chat                                # AI chat interface
/settings                               # User settings
```

### Parallel Routes (Modal Pattern)

Detail pages (category, thread, ticket) use **Next.js Parallel Routes** for intercepting modals:

```
app/[locale]/(analytics)/dashboard/
  @modal/(.)category/[categoryName]/page.tsx   # Intercepted modal route
  category/[categoryName]/page.tsx             # Full-page fallback
  layout.tsx                                   # Must accept { children, modal } props
```

Layout must render both slots:
```typescript
export default function Layout({ children, modal }: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return <>{children}{modal}</>
}
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
- Ticket review updates use UPSERT pattern (rows may not exist yet) and can update two tables in one action (`ticket_reviews` + `ai_human_comparison.change_classification`)
- Parallel fetching with `Promise.all()` for independent queries (e.g., main data + thread enrichment)

### Supabase Clients

Two distinct clients in `lib/supabase/`:

| Client | File | Purpose |
|--------|------|---------|
| `createServerClient()` | `server.ts` | Service role, bypasses RLS, singleton. Used for all data queries. Guarded by `'server-only'` import. |
| `createAuthClient()` | `server.ts` | Cookie-based, respects RLS. Used for auth operations. Requires `await cookies()`. |
| Browser client | `client.ts` | Client-side, used only for `AuthProvider` (auth state changes). |

### Server Action Pattern

All Server Actions follow this structure:
```typescript
'use server'
// 1. Import from page-specific query module
// 2. Use createTimeoutPromise() for 30s timeout protection
// 3. Promise.race([query, timeout]) for each call
// 4. Return { success: boolean, data?, error?: string }
// 5. Performance logging with Date.now()
```

### Database Tables

**`ai_human_comparison`** — Primary table for quality metrics:
- `request_subtype` (category), `prompt_version`, `email` (reviewer), `created_at`
- `changed` (boolean) — legacy v3.x quality field
- `ai_approved` (boolean | null) — v4.0 priority field (takes precedence when true)
- `change_classification` (text | null) — v4.0 penalty-based classification

**`support_threads_data`** — Support thread operations and AI drafts.
Joined with `ai_human_comparison` for quality metrics.

**`ticket_reviews`** — Qualified agent review data for tickets:
- `comparison_id` (FK → `ai_human_comparison.id`, unique conflict key for UPSERT)
- `review_status` ('processed' | 'unprocessed'), `ai_approved` (boolean), `reviewer_name`
- `manual_comment`, `requires_editing_correct`, `action_analysis_verification` (JSONB)
- Queried via `ai_comparison_with_reviews` VIEW (LEFT JOIN with `ai_human_comparison`)

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

### Pagination Constants

Centralized in `constants/pagination.ts` — used across queries and UI:

| Constant | Value | Usage |
|----------|-------|-------|
| `CLIENT_BATCH_SIZE` | 60 | Records per client request |
| `SUPABASE_BATCH_SIZE` | 500 | Server query batch size |
| `MAX_CLIENT_RECORDS` | 1200 | Max records in memory (60 × 20 batches) |
| `REQUEST_TIMEOUT` | 30000 | Server action timeout (ms) |
| `MODAL_PAGE_SIZE` | 20 | Table pagination in modals |
| `MAX_CONCURRENT_BATCHES` | 3 | Parallel batch fetching limit |

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

**Rehydration**: `onRehydrateStorage` converts date strings back to `Date` objects. `validateAndFixDateRange()` validates dates on rehydration. `partialize` excludes transient state (e.g., `searchQuery`) from persistence.

### Date Filter Mode

Queries support two filter modes passed through the entire data flow:
- `'created'` — filter by `created_at` (when record was created)
- `'human_reply'` — filter by human review date

### Authentication

Google OAuth via Supabase with @levhaolam.com email domain restriction. Triple-layer validation: OAuth hint → server-side domain check → PostgreSQL trigger.

Middleware (`middleware.ts`) handles both auth and i18n. Protected routes are under `(analytics)/` route group. Components can assume user exists on protected routes.

Client-side `AuthProvider` (in `lib/auth/`) uses `supabase.auth.onAuthStateChange()` and provides `{ user, session, isLoading, signOut }` via React context.

**Key files**: `middleware.ts`, `lib/auth/`, `lib/supabase/server.ts`, `lib/supabase/client.ts`

### Cross-Component Refresh

Custom event pattern for refreshing data across unrelated components:
```typescript
// Dispatch: triggerTicketsRefresh() — fires 'tickets-review-refresh' on window
// Listen: useEffect with addEventListener in use-paginated-tickets.ts
```

## Internationalization (i18n)

- **Locales**: Russian (`ru`, default — no URL prefix) and English (`en`, prefixed)
- **Timezone**: `Asia/Jerusalem` (configured in `i18n/request.ts`)
- **Config**: `i18n/routing.ts` (locale prefix strategy: `'as-needed'`)
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

### Supabase Types
- Generated types don't include manually added tables (`ticket_reviews`, etc.)
- Use `as any` on `.from('table_name')` but `satisfies` on data objects for type safety
- RPC functions not in generated types — cast client `as any` before calling

### Ticket Review Updates
- Use UPSERT (`onConflict: 'comparison_id'`) for `ticket_reviews` — rows may not exist
- `change_classification` lives in `ai_human_comparison`, not `ticket_reviews` — requires separate UPDATE
- Cross-component refresh via `triggerTicketsRefresh()` custom event (`lib/hooks/use-paginated-tickets.ts`)

### Styling
- Use `cn()` from `lib/utils` for merging Tailwind classes
- Chart colors: `--chart-1` through `--chart-12` CSS variables (auto dark mode)
- Status names with spaces must use `toSafeCssName()` for CSS variable compatibility
- Component variants via `class-variance-authority`
- Tailwind v4: no config file — styles defined via `@theme inline` in `app/globals.css`

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
| Next.js 16 best practices | `docs/NEXTJS_16_BEST_PRACTICES.md` |
| v4.0 scoring system | `constants/classification-types.ts` |
| Qualified agents list | `constants/qualified-agents.ts` |
| Action types list | `constants/action-types.ts` |
| Pagination constants | `constants/pagination.ts` |
| Category labels | `constants/category-labels.ts` |
| Ticket update actions | `lib/actions/ticket-update-actions.ts` |
| Shared components | `components/shared/` (classification-selector, action-analysis-verification) |
| Cache configuration | `lib/queries/query-config.ts` |
| Query key factories | `lib/queries/query-keys.ts` |
| Filter slice factory | `lib/store/create-filter-slice.ts` |
| Global styles & theme | `app/globals.css` |
| Environment template | `.env.local.example` |
