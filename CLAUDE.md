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

### Project Structure

```
app/
├── globals.css              # Global styles with Tailwind directives
└── [locale]/               # Internationalization wrapper (ru, en)
    ├── layout.tsx          # Root layout with providers, fonts
    ├── (root)/             # Public pages route group
    │   ├── page.tsx        # Landing page with hero, mockup, features
    │   ├── docs/           # Documentation
    │   │   ├── page.tsx    # User guide
    │   │   └── error.tsx   # Error boundary
    │   └── login/          # Login page
    │       └── page.tsx    # Google OAuth login
    ├── (analytics)/        # Analytics pages (auth required)
    │   ├── layout.tsx      # Analytics layout with sidebar
    │   ├── dashboard/      # Main dashboard (AI quality metrics)
    │   │   ├── page.tsx    # KPIs, charts, filters, table
    │   │   └── error.tsx   # Error boundary
    │   ├── agents-stats/   # Agent statistics dashboard
    │   │   ├── page.tsx    # Agent performance metrics
    │   │   └── error.tsx   # Error boundary
    │   ├── detailed-stats/ # Full-page table view
    │   │   └── page.tsx    # Optimized table (3-5x faster)
    │   ├── support-overview/ # Support operations & threads
    │   │   ├── page.tsx      # Support KPIs, charts, table
    │   │   ├── error.tsx     # Error boundary
    │   │   ├── thread/[threadId]/
    │   │   │   └── page.tsx  # Thread detail page
    │   │   └── @modal/       # Parallel route for modals
    │   │       └── (.)thread/[threadId]/
    │   │           └── page.tsx # Thread detail modal
    │   ├── tickets-review/    # Ticket review interface
    │   │   ├── page.tsx       # Review & approve tickets
    │   │   └── ticket/[ticketId]/
    │   │       └── page.tsx   # Ticket detail
    │   ├── backlog-reports/   # Backlog reports management
    │   │   └── page.tsx       # Backlog statistics
    │   ├── ai-chat/           # AI chat interface
    │   │   └── page.tsx       # Interactive AI conversation
    │   ├── request-categories/ # Request category management
    │   │   └── page.tsx        # Add/edit/delete categories
    │   └── settings/          # Settings
    │       └── page.tsx       # User preferences
    ├── unauthorized/          # Access denied page
    │   └── page.tsx          # Invalid email domain
    └── api/
        └── auth/
            └── callback/
                └── route.ts  # OAuth callback handler

components/
├── ui/                 # shadcn/ui components
│   ├── glow.tsx        # Background glow effect component with variants
│   ├── mockup.tsx      # Browser chrome mockup component
│   └── ...             # Other shadcn components
├── filters/            # Filter components (date, version, category, agent, status, requirements)
├── kpi/                # KPI card components
├── charts/             # Chart components (quality trends, pie, bar, sankey, heatmap)
├── tables/             # Data table components
├── loading/            # Skeleton loading states
├── error/              # Error boundary and display
├── app-sidebar.tsx     # Main navigation sidebar
├── site-header.tsx     # Header component
├── dashboard-content.tsx        # Main dashboard client component
└── support-overview-content.tsx # Support overview client component

lib/
├── supabase/
│   ├── client.ts         # Browser Supabase client (with auth)
│   ├── server.ts         # Server Supabase client (with cookies)
│   ├── types.ts          # Database types (auto-generated)
│   ├── queries.ts        # SQL queries for dashboard (OPTIMIZED)
│   ├── queries-support.ts # SQL queries for support (OPTIMIZED)
│   └── queries-support/  # Support-specific query modules
│       └── threads.ts    # Thread queries
├── auth/
│   ├── utils.ts          # Auth utility functions
│   └── types.ts          # Auth type definitions
├── actions/
│   ├── dashboard-actions.ts    # Server Actions for dashboard data (with performance logging)
│   └── support-actions.ts      # Server Actions for support data (with performance logging)
├── queries/
│   ├── dashboard-queries.ts    # React Query functions for dashboard (with timeout & retry)
│   ├── support-queries.ts      # React Query functions for support (with timeout & retry)
│   └── index.ts                # Query exports
├── store/
│   ├── index.ts                # Zustand store initialization
│   ├── slices/
│   │   ├── dashboard-slice.ts  # Dashboard filter state
│   │   └── support-slice.ts    # Support filter state
│   └── hooks/
│       ├── use-dashboard-filters.ts  # Dashboard filter hooks
│       └── use-support-filters.ts    # Support filter hooks
├── providers/
│   └── query-provider.tsx      # React Query provider wrapper
├── hooks/
│   ├── use-dashboard-data.ts   # Dashboard data fetching hook (re-export from queries)
│   ├── use-detailed-stats.ts   # Optimized hook for /detailed-stats page (ONLY table data)
│   ├── use-filters.ts          # Legacy filter hook (dashboard)
│   ├── use-realtime.ts         # Real-time updates hook
│   ├── use-support-data.ts     # Support data fetching hook
│   └── use-support-filters.ts  # Legacy filter hook (support)
└── utils/
    ├── date.ts         # Date formatting utilities
    ├── calculations.ts # Trend calculations, quality scores
    ├── export.ts       # CSV export logic (dashboard)
    ├── export-support.ts       # CSV export logic (support)
    ├── support-calculations.ts # Support metrics calculations
    └── parse-filters.ts        # Filter parsing utilities

constants/
├── qualified-agents.ts     # Qualified agent emails
├── support-statuses.ts     # Support status definitions (11 statuses)
├── request-types.ts        # Request type definitions
└── requirement-types.ts    # Requirement flag definitions

i18n/
├── routing.ts              # next-intl routing config
└── request.ts              # Server-side request config

messages/
├── en.json                 # English translations (50KB)
└── ru.json                 # Russian translations (80KB)

docs/                       # Additional documentation
├── AUTH_SETUP_GUIDE.md    # Google OAuth setup (1300+ lines)
├── PERFORMANCE.md         # Performance optimization
├── PRD.md                 # Product requirements
├── NEXTJS_16_BEST_PRACTICES.md
├── SERVER_ACTIONS_ARCHITECTURE.md
├── FEATURES_ROADMAP_2025.md
└── AI_CHAT_FOR_BACKLOG_REPORTS.md

middleware.ts               # Auth + i18n middleware
database-indexes.sql        # Database optimization indexes
```

## Architecture Notes

### Landing Page
The landing page ([app/(root)/page.tsx](app/(root)/page.tsx)) features:
- **Hero Section**: Gradient title, description, 3 CTA buttons (Dashboard, Support Overview, Documentation)
- **Mockup Section**: Browser chrome mockup displaying dashboard screenshot from `/public/dashboard-hero.png`
- **Features Section**: 4 cards with hover effects describing each analytics section
- **Key Features Highlight**: Two-column section explaining platform capabilities
- **Design**: Background glow effects, staggered animations, fully responsive, dark mode support
- **UI Components**: Uses custom `Glow` and `Mockup` components from `components/ui/`

### Dashboard Layout Pattern
The main dashboard ([app/(analytics)/dashboard/page.tsx](app/(analytics)/dashboard/page.tsx)) uses a `SidebarProvider` + `SidebarInset` pattern:
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
  - `changed` (boolean) - Whether human edited AI output

**Data Fetching Pattern**:
1. **Server Actions** (`lib/actions/`) for data fetching (bypasses RLS with service_role key)
2. **React Query** (`lib/queries/`) for caching, timeout, retry logic
3. **Real-time subscriptions** via Supabase Realtime
4. **Filter state** synchronized with URL query params and localStorage (Zustand)
5. All SQL queries centralized in `lib/supabase/queries.ts` and `lib/supabase/queries-support.ts`

**Performance Optimizations** (see [PERFORMANCE.md](PERFORMANCE.md) for details):
- SELECT only needed fields (not SELECT *)
- Database indexes on frequently queried columns
- Pagination (limit 50-100 records)
- Timeout protection (30 seconds)
- Retry logic (2 attempts with 1s delay)
- Increased cache times (2 min staleTime, 10 min gcTime)
- Separate hooks for different pages (e.g., `useDetailedStats` for /detailed-stats)
- Performance logging with detailed timing metrics

**Quality Calculation Logic**:
```typescript
// Good percentage = records NOT changed by qualified agents
goodPercentage = (unchangedRecords / totalRecordsByQualifiedAgents) * 100

// Only records processed by qualified agents count toward metrics
// Qualified agents list: constants/qualified-agents.ts
```

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

**Thread Detail Page** (`/(analytics)/support-overview/[threadId]`):
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
- Defined in [globals.css](app/globals.css#L66-L70)
- Automatically work in light and dark modes

**Important**:
- Status names with spaces/special chars must be converted to safe CSS variable names
- Use `toSafeCssName()` helper to replace non-alphanumeric chars with dashes
- Example: `"Reply is ready"` → `Reply-is-ready` for CSS variable compatibility

## MCP Servers

Two MCP servers are configured in [.mcp.json](.mcp.json):
1. **shadcn**: For adding/managing shadcn/ui components
2. **context7**: Upstash context management service

## Important Files

### Documentation
- **[CLAUDE.md](CLAUDE.md)**: Development guide for Claude Code (this file)
- **[README.md](README.md)**: Project overview and getting started guide
- **[docs/PERFORMANCE.md](docs/PERFORMANCE.md)**: Performance optimization guide with indexing strategies
- **[docs/PRD.md](docs/PRD.md)**: Complete Product Requirements Document
- **[docs/AUTH_SETUP_GUIDE.md](docs/AUTH_SETUP_GUIDE.md)**: Complete Google OAuth setup guide (1300+ lines)
- **[docs/NEXTJS_16_BEST_PRACTICES.md](docs/NEXTJS_16_BEST_PRACTICES.md)**: Next.js 16 patterns and practices
- **[docs/SERVER_ACTIONS_ARCHITECTURE.md](docs/SERVER_ACTIONS_ARCHITECTURE.md)**: Server Actions architecture
- **[docs/FEATURES_ROADMAP_2025.md](docs/FEATURES_ROADMAP_2025.md)**: Feature roadmap
- **[docs/AI_CHAT_FOR_BACKLOG_REPORTS.md](docs/AI_CHAT_FOR_BACKLOG_REPORTS.md)**: AI Chat feature documentation

### Configuration
- **[.env.local.example](.env.local.example)**: Template for environment variables
- **[database-indexes.sql](database-indexes.sql)**: 22 database indexes for performance (deploy to Supabase)
- **[components.json](components.json)**: shadcn/ui configuration
- **[.mcp.json](.mcp.json)**: MCP server configuration (shadcn, context7)

### Key Constants
- **[constants/qualified-agents.ts](constants/qualified-agents.ts)**: List of qualified agent emails for quality calculations
- **[constants/support-statuses.ts](constants/support-statuses.ts)**: Support status definitions (11 statuses)
- **[constants/request-types.ts](constants/request-types.ts)**: Request type definitions
- **[constants/requirement-types.ts](constants/requirement-types.ts)**: Requirement flag definitions

### Core Architecture
- **[middleware.ts](middleware.ts)**: Combined authentication + internationalization middleware
- **[i18n/routing.ts](i18n/routing.ts)**: Internationalization routing configuration
- **[lib/supabase/server.ts](lib/supabase/server.ts)**: Server-side Supabase client with cookie-based sessions
- **[lib/supabase/client.ts](lib/supabase/client.ts)**: Browser Supabase client

## Development Workflow

### 1. Environment Setup

**Prerequisites**:
- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase account with Google OAuth configured
- @levhaolam.com email address for authentication

**Initial Setup**:

```bash
# Clone the repository
git clone <repository-url>
cd ai_agent_stats

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
```

**Configure `.env.local`**:
```env
# Supabase Configuration (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Authentication (required)
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=levhaolam.com

# Optional: Service role key for RLS bypass
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Database Setup** (one-time):
1. Open Supabase SQL Editor
2. Copy contents of `database-indexes.sql`
3. Execute the SQL script to create indexes
4. Verify: `SELECT * FROM pg_indexes WHERE tablename IN ('ai_human_comparison', 'support_threads_data')`

**Google OAuth Setup**:
- Follow the complete guide in [docs/AUTH_SETUP_GUIDE.md](docs/AUTH_SETUP_GUIDE.md)
- This is required for authentication to work

**Start Development**:
```bash
npm run dev
# Opens at http://localhost:3000 (Russian)
# Or http://localhost:3000/en (English)
```

**First Login**:
- Visit any protected route (e.g., `/dashboard`)
- You'll be redirected to `/login`
- Sign in with your @levhaolam.com Google account

### 2. Adding New Features

Refer to [docs/PRD.md](docs/PRD.md) for complete feature specifications and implementation phases.

### 3. Database Queries

All SQL queries should be centralized in:
- `lib/supabase/queries.ts` - Dashboard queries (OPTIMIZED: SELECT specific fields only)
- `lib/supabase/queries-support/` - Support queries (OPTIMIZED: SELECT specific fields only)
- **Important**: Always SELECT only needed fields, never use SELECT *

### 4. Data Fetching Pattern

- **Server Actions** ([lib/actions/](lib/actions/)) for database queries (bypasses RLS)
- **React Query hooks** ([lib/queries/](lib/queries/)) for caching and timeout handling
- **Custom hooks** ([lib/hooks/](lib/hooks/)) for component-specific logic
- **Important**: Use `fetchFilterOptions` from `dashboard-actions.ts` (not client-side queries)

### 5. State Management

- Use Zustand store for filter state
- Use React Query for data fetching and caching
- Server Components use `createClient()` from [lib/supabase/server.ts](lib/supabase/server.ts)
- Client Components should call Server Actions, not direct Supabase client queries

### 6. Internationalization

- Always use next-intl navigation wrappers from `@/i18n/routing`
- Update BOTH `messages/en.json` and `messages/ru.json` when adding UI text
- Use `useTranslations()` hook for all text content
- Test in both Russian and English locales

### 7. Charts

- Always use CSS variables from `--chart-1` to `--chart-5`
- Convert status/category names with spaces to safe CSS names
- Test in both light and dark modes

### 8. Performance Best Practices

- SELECT only needed fields in queries (see [lib/supabase/queries.ts](lib/supabase/queries.ts) for examples)
- Add timeout protection (30s) and retry logic (2 attempts) to React Query hooks
- Use appropriate cache times: `staleTime: 2 * 60 * 1000` (2 min), `gcTime: 10 * 60 * 1000` (10 min)
- Add performance logging to Server Actions for monitoring
- Consider pagination for large datasets (limit 50-100 records)
- Create page-specific hooks (like `useDetailedStats`) instead of fetching all data
- Monitor performance in browser console (logs show timing metrics)
- Refer to [docs/PERFORMANCE.md](docs/PERFORMANCE.md) for detailed optimization guide

## Application Routes

### Public Routes (No Authentication Required)

- **`/`** - Landing page with hero, mockup, features
- **`/docs`** - User documentation and guides
- **`/login`** - Google OAuth login page
- **`/unauthorized`** - Access denied page (invalid email domain)

### Protected Routes (Authentication Required)

All protected routes are under `app/[locale]/(analytics)/`:

#### Core Analytics

- **`/dashboard`** - Main dashboard
  - KPI cards: Quality %, total records, changes, trends
  - Quality trends chart (time-series)
  - Category distribution (pie chart)
  - Version comparison (bar chart)
  - Detailed stats table (hierarchical)
  - Filters: date range, versions, categories, agents

- **`/detailed-stats`** - Full-page table view
  - Optimized for large datasets (3-5x faster than dashboard)
  - Advanced sorting, search, pagination
  - CSV export

#### Agent & Support Analytics

- **`/agents-stats`** - Agent statistics dashboard
  - Agent performance metrics
  - Quality trends per agent
  - Category breakdowns

- **`/support-overview`** - Support operations overview
  - Support KPIs: draft coverage, reply required, resolution rate
  - Status distribution (pie chart)
  - Resolution time (bar chart)
  - AI draft flow (Sankey diagram)
  - Requirements correlation (heatmap)
  - Support threads table with search
  - Click row → thread detail modal

- **`/support-overview/thread/[threadId]`** - Thread detail page
  - Complete thread metadata
  - Quality score (from ai_human_comparison JOIN)
  - Active requirements breakdown
  - Full AI draft content
  - Reviewed by qualified agent

#### Ticket Management

- **`/tickets-review`** - Ticket review interface
  - Review and approve tickets
  - Ticket quality assessment
  - Assignment management

- **`/backlog-reports`** - Backlog reports management
  - View backlog statistics
  - Generate reports
  - Track backlog trends

#### AI Features

- **`/ai-chat`** - AI chat interface
  - Interactive AI conversation
  - Context-aware responses
  - Integration with backlog reports
  - See [docs/AI_CHAT_FOR_BACKLOG_REPORTS.md](docs/AI_CHAT_FOR_BACKLOG_REPORTS.md)

#### Configuration

- **`/request-categories`** - Request category management
  - Add/edit/delete categories
  - Category mappings
  - Category statistics

- **`/settings`** - Application settings
  - User preferences
  - Display options
  - (Placeholder - minimal functionality)

### Route Patterns

**Locale Prefixes**:
- Russian (default): `/dashboard`, `/support-overview`
- English: `/en/dashboard`, `/en/support-overview`

**Modal Routes**:
Support overview uses parallel routes for modals:
- **`@modal/(.)thread/[threadId]`** - Intercepted route for modal display
- **`thread/[threadId]`** - Full page fallback

**API Routes**:
- **`/api/auth/callback`** - Google OAuth callback handler

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
