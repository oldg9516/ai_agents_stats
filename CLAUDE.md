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
├── settings/
│   └── page.tsx        # Settings (placeholder)
└── globals.css         # Global styles with Tailwind directives

components/
├── ui/                 # shadcn/ui components
├── filters/            # Filter components (date, version, category, agent)
├── kpi/                # KPI card components
├── charts/             # Chart components (quality trends, pie, bar)
├── tables/             # Data table components
├── loading/            # Skeleton loading states
├── error/              # Error boundary and display
├── app-sidebar.tsx     # Main navigation sidebar
└── site-header.tsx     # Header component

lib/
├── supabase/
│   ├── client.ts       # Supabase client initialization
│   ├── types.ts        # Database types (auto-generated)
│   ├── queries.ts      # SQL queries for all dashboard data
│   └── realtime.ts     # Real-time subscription setup
├── hooks/
│   ├── use-dashboard-data.ts  # Main data fetching hook
│   ├── use-filters.ts         # Filter state management
│   └── use-realtime.ts        # Real-time updates hook
└── utils/
    ├── date.ts         # Date formatting utilities
    ├── calculations.ts # Trend calculations, quality scores
    └── export.ts       # CSV export logic

constants/
└── qualified-agents.ts # List of qualified agent emails
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
