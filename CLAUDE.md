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
├── layout.tsx           # Root layout with Geist fonts
├── page.tsx            # Landing page
├── dashboard/
│   └── page.tsx        # Main dashboard with KPIs, charts, filters, and table
├── detailed-stats/
│   └── page.tsx        # Full-page table view
├── support-overview/
│   ├── page.tsx        # Support operations overview
│   ├── error.tsx       # Error boundary
│   └── [threadId]/
│       └── page.tsx    # Thread detail view
├── settings/
│   └── page.tsx        # Settings (placeholder)
└── globals.css         # Global styles with Tailwind directives

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
│   ├── client.ts       # Supabase client initialization
│   ├── types.ts        # Database types (auto-generated)
│   ├── queries.ts      # SQL queries for dashboard data
│   ├── queries-support.ts      # SQL queries for support overview
│   └── realtime.ts     # Real-time subscription setup
├── hooks/
│   ├── use-dashboard-data.ts   # Main data fetching hook
│   ├── use-filters.ts          # Filter state management (dashboard)
│   ├── use-realtime.ts         # Real-time updates hook
│   ├── use-support-data.ts     # Support data fetching hook
│   └── use-support-filters.ts  # Support filter state management
└── utils/
    ├── date.ts         # Date formatting utilities
    ├── calculations.ts # Trend calculations, quality scores
    ├── export.ts       # CSV export logic (dashboard)
    ├── export-support.ts       # CSV export logic (support)
    └── support-calculations.ts # Support metrics calculations

constants/
├── qualified-agents.ts # List of qualified agent emails
├── support-statuses.ts # Support status definitions
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
- `status` (text) - Thread status (pending_response, waiting_on_customer, resolved, escalated, in_progress)
- `requires_reply` (boolean) - Whether customer response is needed
- `requires_identification` (boolean) - Whether identity verification is needed
- `requires_editing` (boolean) - Whether AI draft needs human editing
- `requires_subscription_info` (boolean) - Whether subscription info is needed
- `requires_tracking_info` (boolean) - Whether tracking info is needed
- `ai_draft_reply` (text) - AI-generated response content
- `prompt_version` (text) - Version of prompt used
- `created_at` (timestamp) - Thread creation time

**JOIN Strategy**: Support overview combines data from `support_threads_data` and `ai_human_comparison` tables via JOIN on `prompt_version` and qualified agent emails to calculate quality metrics.

### Key Features

**4 KPI Cards**:
- AI Draft Coverage - % of threads with AI-generated draft
- Reply Required - % of threads requiring customer response
- Resolution Rate - % of threads marked as resolved
- Avg Requirements - Average number of requirements per thread

**4 Charts**:
- Status Distribution (Recharts Pie) - Breakdown by status
- Resolution Time (Recharts Bar) - Average time to resolve by week
- AI Draft Flow (Nivo Sankey) - Journey from draft creation → usage/editing → resolution
- Requirements Correlation (Nivo Heatmap) - Which requirements co-occur

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

**Thread Detail Page** (`/support-overview/[threadId]`):
- Complete thread metadata
- Quality score from JOIN with ai_human_comparison
- Active requirements breakdown
- Full AI draft content
- Reviewed by (qualified agent email)

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

3. **Database Queries**: All SQL queries should be centralized in `lib/supabase/queries.ts`

4. **Filters**: All dashboard filters sync to URL params (shareable links) and localStorage (persistence)
