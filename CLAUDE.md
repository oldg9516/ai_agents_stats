# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Agent Statistics Dashboard - a comprehensive analytics platform for monitoring and analyzing the performance of AI agents compared to human edits. The dashboard tracks quality metrics across different request categories, prompt versions, and time periods, providing real-time insights into AI-generated content quality.

**Business Context**: The system compares AI-generated outputs with human edits to measure AI quality. When a qualified agent reviews AI output without making changes (`changed = false`), it indicates high-quality AI performance. The dashboard aggregates these metrics across categories, versions, and time periods.

**Key Metrics**:
- **Quality Percentage**: (Records NOT changed by qualified agents / Total records by qualified agents) × 100
- **Qualified Agents**: Specific team members (`constants/qualified-agents.ts`) whose reviews are used for quality calculations
- **Categories**: Request subtypes (e.g., different types of content generation tasks)
- **Versions**: Prompt versions (v1, v2, v3, etc.) to track improvements over time

## Development Commands

```bash
# Development
npm run dev      # Start dev server (http://localhost:3000)

# Building
npm run build    # Build for production
npm start        # Start production server

# Code Quality
npm run lint     # Run ESLint

# Note: No test command configured yet
```

**Development Notes**:
- Default locale is Russian - access at http://localhost:3000 or http://localhost:3000/ru
- English version at http://localhost:3000/en
- You'll be redirected to `/login` for protected routes
- Use a @levhaolam.com Google account for authentication

## Tech Stack & Architecture

### Core Framework
- **Next.js 16** with App Router (`app/` directory structure)
- **React 19** with TypeScript
- **Tailwind CSS v4** with CSS variables for theming

### UI Components
- **shadcn/ui** components configured in "new-york" style
  - Configuration: [components.json](components.json)
  - UI components located in `components/ui/`
  - Adding new components: Use the shadcn MCP server (configured in `.mcp.json`)
  - Path aliases configured: `@/components`, `@/lib`, `@/hooks`

### Key Dependencies
- **@supabase/supabase-js**: PostgreSQL database client for real-time data
- **@tanstack/react-table**: Data table management with sorting, filtering, pagination
- **@tanstack/react-query**: Data fetching and caching
- **zustand**: State management for filters
- **Recharts**: Interactive charts and visualizations (line, pie, bar charts)
- **@nivo/sankey**: Sankey diagram for flow visualization
- **@nivo/heatmap**: Heatmap for correlation matrices
- **date-fns**: Date formatting and manipulation
- **@tabler/icons-react**: Icon library (note: shadcn config specifies lucide, but Tabler icons are used in sidebar)
- **next-themes**: Dark mode support
- **Zod**: Schema validation for API responses
- **Sonner**: Toast notifications
- **next-intl**: Internationalization with locale-based routing

### Internationalization (i18n)

The application supports multiple languages using **next-intl**:

**Configuration**:
- **Locales**: Russian (`ru`) and English (`en`)
- **Default locale**: Russian (`ru`)
- **Locale prefix strategy**: `as-needed` (default locale has no prefix)
- **Routing config**: [i18n/routing.ts](i18n/routing.ts)

**File Structure**:
```
i18n/
├── routing.ts          # Routing configuration and navigation wrappers
└── request.ts          # Request configuration for Server Components

messages/
├── en.json            # English translations (50KB+)
└── ru.json            # Russian translations (80KB+)
```

**Navigation**:
All navigation must use next-intl's navigation wrappers:
```typescript
// ❌ Don't use Next.js navigation directly
import { Link, useRouter, usePathname } from 'next/navigation'

// ✅ Use next-intl navigation wrappers
import { Link, useRouter, usePathname } from '@/i18n/routing'
```

**URL Structure**:
- Russian (default): `/dashboard`, `/support-overview`
- English: `/en/dashboard`, `/en/support-overview`

**Translations**:
All UI text must be translated. Use the `useTranslations` hook:
```typescript
import { useTranslations } from 'next-intl'

export function MyComponent() {
  const t = useTranslations('namespace')
  return <h1>{t('title')}</h1>
}
```

**Important**: When adding new UI text, update BOTH `messages/en.json` and `messages/ru.json`.

### Key Directories

- `app/[locale]/(root)/` - Public pages (landing, docs, login)
- `app/[locale]/(analytics)/` - Protected analytics pages (dashboard, support-overview, etc.)
- `components/` - React components (ui/, filters/, kpi/, charts/, tables/)
- `lib/supabase/` - Database clients and queries
  - `queries.ts` - Main dashboard queries
  - `queries-support/` - Support module queries (kpi.ts, charts.ts, threads.ts, utils.ts)
- `lib/actions/` - Server Actions for data fetching
- `lib/queries/` - React Query hooks
- `lib/store/` - Zustand state slices and hooks
- `constants/` - Qualified agents, statuses, classification types
  - `classification-types.ts` - v4.0 scoring system (penalties, groups, utility functions)
- `messages/` - i18n translations (en.json, ru.json)

## Architecture Notes

### Dashboard Layout Pattern
The main dashboard (`app/[locale]/(analytics)/dashboard/page.tsx`) uses a `SidebarProvider` + `SidebarInset` pattern:
- `AppSidebar` provides collapsible navigation
- `SiteHeader` displays the top header
- Main content area contains: `SectionCards`, `ChartAreaInteractive`, and `DataTable`
- Custom CSS variables for responsive spacing: `--sidebar-width` and `--header-height`

### Data Flow & Supabase Integration

**Database**: PostgreSQL via Supabase
- **Primary Table**: `ai_human_comparison`
  - `id` (bigint, auto-increment)
  - `request_subtype` (text) - Category
  - `prompt_version` (text) - Version (v1, v2, v3, etc.)
  - `created_at` (timestamp) - Record creation time
  - `email` (text) - Agent who processed the record
  - `changed` (boolean) - Whether human edited AI output (legacy v3.x)
  - `ai_approved` (boolean | null) - Priority field for quality calculation (v4.0)
  - `change_classification` (text | null) - Classification type for penalty scoring (v4.0)

**Data Fetching Pattern**:
1. **Server Actions** (`lib/actions/`) for data fetching (bypasses RLS with service_role key)
2. **React Query** (`lib/queries/`) for caching, timeout, retry logic
3. **Real-time subscriptions** via Supabase Realtime
4. **Filter state** synchronized with URL query params and localStorage (Zustand)
5. All SQL queries centralized in `lib/supabase/queries.ts` and `lib/supabase/queries-support.ts`

**Performance Optimizations** (see [docs/PERFORMANCE.md](docs/PERFORMANCE.md) for details):
- SELECT only needed fields (not SELECT *)
- Database indexes on frequently queried columns
- Pagination (limit 50-100 records)
- Timeout protection (30 seconds)
- Retry logic (2 attempts with 1s delay)
- Increased cache times (2 min staleTime, 10 min gcTime)
- Separate hooks for different pages (e.g., `useDetailedStats` for /detailed-stats)
- Performance logging with detailed timing metrics

**Quality Calculation Logic (Legacy v3.x)**:
```typescript
// Good percentage = records NOT changed by qualified agents
goodPercentage = (unchangedRecords / totalRecordsByQualifiedAgents) * 100

// Only records processed by qualified agents count toward metrics
// Qualified agents list: constants/qualified-agents.ts
```

**Quality Scoring (v4.0 - Current)**:

The system uses penalty-based scoring with 10 classifications. See `constants/classification-types.ts`.

| Classification | Penalty | Score |
|---------------|---------|-------|
| PERFECT_MATCH | 0 | 100 |
| STYLISTIC_EDIT | -2 | 98 |
| STRUCTURAL_FIX | -5 | 95 |
| TONAL_MISALIGNMENT | -10 | 90 |
| CONFUSING_VERBOSITY | -15 | 85 |
| MINOR_INFO_GAP | -20 | 80 |
| MAJOR_FUNCTIONAL_OMISSION | -50 | 50 |
| CRITICAL_FACT_ERROR | -100 | 0 |
| EXCL_WORKFLOW_SHIFT | N/A | Excluded |
| EXCL_DATA_DISCREPANCY | N/A | Excluded |

**Score Groups for UI**:
- **Critical (0-50)**: Red (`bg-red-100 dark:bg-red-900/30`)
- **Needs Work (51-89)**: Yellow (`bg-yellow-100 dark:bg-yellow-900/30`)
- **Good (90-100)**: Green (`bg-green-100 dark:bg-green-900/30`)
- **Excluded**: Gray (`bg-gray-100 dark:bg-gray-900/30`)

**Priority Logic** (see `isQualityRecord()` in classification-types.ts):
1. If `ai_approved = true` → Quality (takes priority)
2. Else → Use `change_classification` to determine quality

**Key Queries**:
- KPI aggregations with trend calculations (current vs. previous period)
- Time series data grouped by week for charts
- Category and version breakdowns for pie/bar charts
- Detailed hierarchical table data (version-level + week-level rows)

## Authentication & Authorization

The application uses **Google OAuth** with **email domain restriction** (@levhaolam.com only).

### Authentication Flow

1. User visits protected route (e.g., `/dashboard`)
2. Middleware checks session → redirects to `/login` if not authenticated
3. User clicks "Sign in with Google"
4. Google OAuth flow (PKCE) with domain hint
5. Callback to `/api/auth/callback/route`
6. Server validates email domain (@levhaolam.com)
7. Session stored in httpOnly cookies
8. Redirect to intended destination

### Triple-Layer Security

1. **Google OAuth Hint**: `hd=levhaolam.com` parameter (UX level)
2. **Application Check**: Server-side domain validation in auth callback
3. **Database Trigger**: PostgreSQL trigger blocks non-@levhaolam.com emails

### Key Files

```
lib/
├── auth/
│   ├── utils.ts              # Auth utility functions
│   └── types.ts              # Auth type definitions
└── supabase/
    ├── client.ts             # Browser client (with auth)
    ├── server.ts             # Server client (with cookies)

app/[locale]/
├── login/
│   └── page.tsx              # Login page
├── unauthorized/
│   └── page.tsx              # Access denied page
└── api/
    └── auth/
        └── callback/
            └── route.ts      # OAuth callback handler

middleware.ts                 # Auth + i18n middleware
```

### Protected vs Public Routes

**Public routes** (no auth required):
- `/` - Landing page
- `/docs` - Documentation
- `/login` - Login page
- `/unauthorized` - Access denied

**Protected routes** (auth required):
- `/dashboard` - Main dashboard
- `/agents-stats` - Agent statistics
- `/support-overview` - Support overview
- `/tickets-review` - Ticket review
- `/backlog-reports` - Backlog reports
- `/ai-chat` - AI chat
- `/request-categories` - Request categories
- `/detailed-stats` - Detailed statistics
- `/settings` - Settings

### Middleware Pattern

The middleware ([middleware.ts](middleware.ts)) handles both authentication and internationalization:

```typescript
// 1. Skip static files and API routes
if (shouldSkipMiddleware(pathname)) return NextResponse.next()

// 2. Check if route is public
const pathWithoutLocale = pathname.replace(/^\/(ru|en)/, '') || '/'
if (isPublicRoute(pathWithoutLocale)) return intlMiddleware(request)

// 3. Create Supabase client and check session
const supabase = createServerClient(...)
const { data: { user }, error } = await supabase.auth.getUser()

// 4. Redirect to login if no session
if (!user || error) {
  return NextResponse.redirect(`/${locale}/login?redirect=${pathname}`)
}

// 5. Validate email domain
if (!userEmail.endsWith('@levhaolam.com')) {
  await supabase.auth.signOut()
  return NextResponse.redirect(`/${locale}/unauthorized`)
}

// 6. Apply intl middleware
return intlMiddleware(request)
```

### Environment Variables

```env
# Required for authentication
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=levhaolam.com

# Optional: Service role key for bypassing RLS
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### User Session Access

**Server Components**:
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <div>Welcome, {user?.email}</div>
}
```

**Client Components**:
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function MyComponent() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return <div>Welcome, {user?.email}</div>
}
```

### Setup Guide

For complete OAuth setup instructions, see [docs/AUTH_SETUP_GUIDE.md](docs/AUTH_SETUP_GUIDE.md).

## Support Overview Section

The **Support Overview** section monitors support thread operations and AI draft performance in customer service.

### Database Tables

**Primary Table**: `support_threads_data`
- `thread_id` (text) - Unique thread identifier
- `ticket_id` (text) - Associated ticket ID
- `request_type` (text) - Type of support request
- `status` (text) - Thread status (11 possible values from database):
  - `AI Processing` - AI is processing the request
  - `Data collected` - Required data has been collected
  - `Getting tracking data` - Fetching tracking information
  - `Got tracking data` - Tracking data retrieved
  - `Identifying` - Identifying user
  - `Identifying — Many users` - Multiple users found
  - `Identifying — Not found` - User not found
  - `new` - New thread
  - `Reply is ready` - Response is ready (used for resolution calculations)
  - `Reply not required` - No response needed
  - `ZOHO draft created` - Draft created in ZOHO
- `requires_reply` (boolean) - Whether customer response is needed
- `requires_identification` (boolean) - Whether identity verification is needed
- `requires_editing` (boolean) - Whether AI draft needs human editing
- `requires_subscription_info` (boolean) - Whether subscription info is needed
- `requires_tracking_info` (boolean) - Whether tracking info is needed
- `requires_box_contents_info` (boolean) - Whether box contents info is needed
- `user` (text) - User identifier
- `identification` (text) - Identification data
- `subscription_info` (text) - Subscription information
- `tracking_info` (text) - Tracking information
- `box_contents_info` (text) - Box contents information
- `ai_draft_reply` (text) - AI-generated response content
- `full_request` (text) - Complete request text
- `request_subtype` (text) - Request subtype
- `prompt_version` (text) - Version of prompt used
- `created_at` (timestamp) - Thread creation time
- `thread_date` (timestamp) - Thread date

**JOIN Strategy**: Support overview combines data from `support_threads_data` and `ai_human_comparison` tables via JOIN on `prompt_version` and qualified agent emails to calculate quality metrics.

### Key Features

**4 KPI Cards**:
- AI Draft Coverage - % of threads with AI-generated draft
- Reply Required - % of threads requiring customer response
- Resolution Rate - % of threads with status 'Reply is ready'
- Avg Requirements - Average number of requirements per thread

**4 Charts**:
- Status Distribution (Recharts Pie) - Breakdown by status with theme colors
- Resolution Time (Recharts Bar) - Average time to resolve by week (filters by 'Reply is ready' status)
- AI Draft Flow (Nivo Sankey) - Journey from draft creation → usage/editing → resolution (responsive with mobile support)
- Requirements Correlation (Nivo Heatmap) - Which requirements co-occur (with theme colors)

**Filters**:
- Date range picker
- Status multi-select (with human-readable labels)
- Request type multi-select
- Requirements multi-select (with colored badges)
- Version multi-select

**Support Threads Table**:
- All threads with quality metrics
- Sortable columns
- Search by thread ID or ticket ID
- CSV export
- Click row → navigate to thread detail page

**Thread Detail Page** (`app/[locale]/(analytics)/support-overview/[threadId]`):
- Complete thread metadata
- Quality score from JOIN with ai_human_comparison
- Active requirements breakdown
- Full AI draft content
- Reviewed by (qualified agent email)
- Uses server-side Supabase client for data fetching

### Data Flow

1. **Client-side hooks**: `use-support-data.ts` and `use-support-filters.ts`
2. **Real-time updates**: Supabase Realtime subscription to `support_threads_data`
3. **Filter sync**: URL params + localStorage for persistence
4. **Queries centralized**: `lib/supabase/queries-support.ts`

### Styling Conventions
- Uses `cn()` utility from `lib/utils.ts` for merging Tailwind classes with clsx
- CSS variables defined in `globals.css` for theming
- Tailwind v4 with PostCSS configuration
- Component variants managed via `class-variance-authority`

**Quality Color Coding**:
- **Good (61-100%)**: Green background (`bg-green-100 dark:bg-green-900`)
- **Medium (31-60%)**: Yellow background (`bg-yellow-100 dark:bg-yellow-900`)
- **Poor (0-30%)**: Red background (`bg-red-100 dark:bg-red-900`)

### TypeScript Configuration
- Path alias `@/*` maps to root directory
- Strict mode enabled
- React JSX runtime configured
- Target: ES2017

## State Management

### Zustand Store
The app uses Zustand for global filter state management:

**Dashboard Slice** (`lib/store/slices/dashboard-slice.ts`):
- Date range filter
- Version filter
- Category filter
- Agent filter
- Persisted to localStorage

**Support Slice** (`lib/store/slices/support-slice.ts`):
- Date range filter
- Status filter
- Request type filter
- Requirements filter
- Version filter
- Persisted to localStorage

**Usage**:
```typescript
import { useDashboardFilters } from '@/lib/store/hooks'

const { filters, setDateRange, setVersions, resetFilters } = useDashboardFilters()
```

### React Query
Data fetching is managed with TanStack Query:

**Provider** (`lib/providers/query-provider.tsx`):
- Wraps app with QueryClientProvider
- Configured with default staleTime and cacheTime

**Query Functions** (`lib/queries/`):
- `dashboard-queries.ts` - Dashboard data queries
- `support-queries.ts` - Support data queries
- Uses React Query hooks (useQuery, useMutation)

**Server Actions** (`lib/actions/`):
- `support-actions.ts` - Server-side support data fetching
- Uses server Supabase client

## Chart Color Scheme

All charts use a consistent color palette from CSS variables:
- `--chart-1` through `--chart-5` (5-color rotation)
- Defined in `app/globals.css`
- Automatically work in light and dark modes

**Important**:
- Status names with spaces/special chars must be converted to safe CSS variable names
- Use `toSafeCssName()` helper to replace non-alphanumeric chars with dashes
- Example: `"Reply is ready"` → `Reply-is-ready` for CSS variable compatibility

## MCP Servers

Two MCP servers are configured in [.mcp.json](.mcp.json):
1. **shadcn**: For adding/managing shadcn/ui components
2. **context7**: Upstash context management service

## Key Files Reference

| Category | Files |
|----------|-------|
| Documentation | `docs/PERFORMANCE.md`, `docs/PRD.md`, `docs/AUTH_SETUP_GUIDE.md` |
| Database | `database-indexes.sql`, `lib/supabase/queries.ts`, `lib/supabase/queries-support/` |
| Auth | `middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts` |
| i18n | `i18n/routing.ts`, `messages/en.json`, `messages/ru.json` |
| Constants | `constants/classification-types.ts` (v4.0 scoring), `constants/qualified-agents.ts`, `constants/support-statuses.ts` |
| Config | `.env.local.example`, `components.json`, `.mcp.json` |

## Development Workflow

For installation and environment setup, see [README.md](README.md).

### Quick Reference

| Task | Location/Pattern |
|------|------------------|
| Add new feature | See [docs/PRD.md](docs/PRD.md) for specs |
| Database queries | Centralize in `lib/supabase/queries.ts` or `queries-support/` |
| Data fetching | Server Actions → React Query → Components |
| Filter state | Zustand store (`lib/store/slices/`) |
| Add translations | Update BOTH `messages/en.json` AND `messages/ru.json` |
| Chart colors | Use `--chart-1` through `--chart-5` CSS variables |
| Performance | See [docs/PERFORMANCE.md](docs/PERFORMANCE.md) |

## Common Pitfalls & Best Practices

### Internationalization

**❌ Don't**:
```typescript
// Don't use Next.js navigation directly
import { Link } from 'next/navigation'
import { useRouter } from 'next/navigation'
```

**✅ Do**:
```typescript
// Always use next-intl navigation wrappers
import { Link, useRouter } from '@/i18n/routing'
```

**❌ Don't**:
```typescript
// Don't hardcode text
<button>Save Changes</button>
```

**✅ Do**:
```typescript
// Always use translations
const t = useTranslations('common')
<button>{t('saveChanges')}</button>
```

### Authentication

**❌ Don't**:
```typescript
// Don't check auth in components
if (!user) return <LoginForm />
```

**✅ Do**:
```typescript
// Let middleware handle auth - protected routes are automatically guarded
// Components can assume user exists
```

**❌ Don't**:
```typescript
// Don't create Supabase client in middleware
import { createClient } from '@/lib/supabase/client'
```

**✅ Do**:
```typescript
// Use createServerClient directly in middleware
import { createServerClient } from '@supabase/ssr'
```

### Data Fetching

**❌ Don't**:
```typescript
// Don't use SELECT *
const { data } = await supabase.from('ai_human_comparison').select('*')
```

**✅ Do**:
```typescript
// Always SELECT specific fields
const { data } = await supabase
  .from('ai_human_comparison')
  .select('id, request_subtype, prompt_version, created_at, email, changed')
```

**❌ Don't**:
```typescript
// Don't call Supabase directly from Client Components
const supabase = createClient()
const { data } = await supabase.from('table').select('*')
```

**✅ Do**:
```typescript
// Use Server Actions from Client Components
import { fetchDashboardData } from '@/lib/actions/dashboard-actions'
const data = await fetchDashboardData(filters)
```

### Performance

**❌ Don't**:
```typescript
// Don't fetch all data on every page
const data = useDashboardData() // Fetches KPIs, charts, table
```

**✅ Do**:
```typescript
// Use page-specific hooks
const tableData = useDetailedStats() // Only table data for /detailed-stats
```

**❌ Don't**:
```typescript
// Don't forget timeout protection
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
})
```

**✅ Do**:
```typescript
// Always add timeout and retry logic
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  staleTime: 2 * 60 * 1000, // 2 min
  gcTime: 10 * 60 * 1000, // 10 min
  retry: 2,
  retryDelay: 1000,
})
```
