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
# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

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

### Project Structure

```
app/
├── layout.tsx           # Root layout with Geist fonts and providers
├── globals.css          # Global styles with Tailwind directives
├── (root)/
│   └── page.tsx        # Landing page
└── (analytics)/        # Route group for analytics pages
    ├── layout.tsx      # Analytics layout with sidebar
    ├── dashboard/
    │   ├── page.tsx    # Main dashboard with KPIs, charts, filters, and table
    │   └── error.tsx   # Error boundary
    ├── detailed-stats/
    │   └── page.tsx    # Full-page table view
    ├── support-overview/
    │   ├── page.tsx        # Support operations overview
    │   ├── error.tsx       # Error boundary
    │   └── [threadId]/
    │       └── page.tsx    # Thread detail view (uses server Supabase client)
    └── settings/
        └── page.tsx    # Settings (placeholder)

components/
├── ui/                 # shadcn/ui components
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
│   ├── client.ts       # Client-side Supabase (for Client Components)
│   ├── server.ts       # Server-side Supabase (for Server Components, Actions, Routes)
│   ├── types.ts        # Database types (auto-generated)
│   ├── queries.ts      # SQL queries for dashboard data
│   └── queries-support.ts      # SQL queries for support overview
├── actions/
│   └── support-actions.ts      # Server Actions for support data
├── queries/
│   ├── dashboard-queries.ts    # React Query functions for dashboard
│   ├── support-queries.ts      # React Query functions for support
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
│   ├── use-dashboard-data.ts   # Dashboard data fetching hook
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
├── qualified-agents.ts # List of qualified agent emails
├── support-statuses.ts # Support status definitions (11 real statuses from DB)
├── request-types.ts    # Request type definitions
└── requirement-types.ts # Requirement flag definitions
```

## Architecture Notes

### Dashboard Layout Pattern
The main dashboard ([app/dashboard/page.tsx](app/dashboard/page.tsx#L1)) uses a `SidebarProvider` + `SidebarInset` pattern:
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
1. Client-side data fetching with React Query patterns (via custom hooks)
2. Real-time subscriptions via Supabase Realtime
3. Filter state synchronized with URL query params and localStorage
4. All SQL queries centralized in `lib/supabase/queries.ts`

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

- **[PRD.md](PRD.md)**: Complete Product Requirements Document with detailed feature specs, SQL queries, component architecture, and implementation roadmap
- **[.env.local.example](.env.local.example)**: Template for Supabase credentials (copy to `.env.local` and fill in)
- **[constants/qualified-agents.ts](constants/qualified-agents.ts)**: List of qualified agent emails used in quality calculations

## Development Workflow

1. **Environment Setup**:
   ```bash
   cp .env.local.example .env.local
   # Fill in Supabase credentials
   npm install
   npm run dev
   ```

2. **Adding New Features**: Refer to [PRD.md](PRD.md) for complete feature specifications and implementation phases

3. **Database Queries**: All SQL queries should be centralized in:
   - `lib/supabase/queries.ts` - Dashboard queries
   - `lib/supabase/queries-support.ts` - Support queries

4. **State Management**:
   - Use Zustand store for filter state
   - Use React Query for data fetching
   - Server Components use `supabaseServer` from `lib/supabase/server.ts`
   - Client Components use `supabase` from `lib/supabase/client.ts`

5. **Charts**:
   - Always use CSS variables from `--chart-1` to `--chart-5`
   - Convert status/category names with spaces to safe CSS names
   - Test in both light and dark modes
