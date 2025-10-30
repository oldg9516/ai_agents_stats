# AI Agent Statistics Dashboard

A comprehensive analytics platform for monitoring and analyzing the performance of AI agents compared to human edits. The dashboard tracks quality metrics across different request categories, prompt versions, and time periods, providing real-time insights into AI-generated content quality.

## Features

### 📊 Main Dashboard (`/dashboard`)
- **KPI Cards**: Quality percentage, total records, changes, trends
- **Quality Trends Chart**: Time-series visualization of AI quality over time
- **Category Distribution**: Pie chart showing quality breakdown by request type
- **Version Comparison**: Bar chart comparing different prompt versions
- **Detailed Stats Table**: Hierarchical table with version and week-level data
- **Advanced Filters**: Date range, versions, categories, agents

### 🎯 Support Overview (`/support-overview`)
- **Support KPIs**: AI draft coverage, reply required rate, resolution rate, avg requirements
- **Status Distribution**: Pie chart of thread statuses
- **Resolution Time**: Bar chart showing average time to resolve by week
- **AI Draft Flow**: Sankey diagram showing journey from draft creation to resolution
- **Requirements Correlation**: Heatmap showing which requirements co-occur
- **Support Threads Table**: Searchable, sortable table with quality metrics
- **Thread Detail View**: Deep-dive into individual thread metrics and AI draft content

### 📋 Detailed Stats (`/detailed-stats`)
- Full-page table view with all detailed statistics
- Advanced sorting, search, and pagination
- CSV export functionality
- Optimized for large datasets (3-5x faster than main dashboard)

### 🌐 Internationalization
- Full support for English and Russian languages
- Seamless language switching
- Comprehensive translation of all UI elements and documentation

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **Database**: PostgreSQL via Supabase with Row Level Security
- **State Management**: Zustand for filters, TanStack Query for data fetching
- **UI Components**: shadcn/ui (New York style) with Tailwind CSS v4
- **Charts**: Recharts (line, pie, bar), Nivo (Sankey, heatmap)
- **Icons**: Tabler Icons
- **Internationalization**: next-intl

## Performance

The application has been heavily optimized for performance:

- **Dashboard**: 300-1000ms load time
- **Support Overview**: 500-2000ms load time
- **Detailed Stats**: 300-800ms load time

Key optimizations:
- 22 database indexes for 10-20x query speedup
- SELECT specific fields (not SELECT *)
- Pagination for large datasets
- React Query caching (2 min staleTime, 10 min gcTime)
- Timeout protection (30s) and retry logic
- Page-specific data fetching hooks

See [PERFORMANCE.md](PERFORMANCE.md) for detailed optimization guide.

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai_agent_stats
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. Deploy database indexes (one-time setup):
   - Open Supabase SQL Editor
   - Copy contents of `database-indexes.sql`
   - Execute the SQL script

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
ai_agent_stats/
├── app/                    # Next.js App Router pages
│   ├── (root)/            # Public pages (landing, docs)
│   └── (analytics)/       # Analytics pages (dashboard, support, detailed-stats)
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── filters/          # Filter components
│   ├── kpi/              # KPI card components
│   ├── charts/           # Chart components
│   └── tables/           # Data table components
├── lib/
│   ├── supabase/         # Database queries and clients
│   ├── actions/          # Next.js Server Actions
│   ├── queries/          # React Query hooks
│   ├── store/            # Zustand state management
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
├── constants/            # Constants and configuration
├── public/               # Static assets
├── messages/             # i18n translation files
├── database-indexes.sql  # Database optimization indexes
├── PERFORMANCE.md        # Performance optimization guide
├── CLAUDE.md            # Development guide for Claude Code
└── PRD.md               # Product Requirements Document
```

## Available Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Key Concepts

### Quality Calculation

Quality percentage is calculated as:
```
Quality % = (Records NOT changed by qualified agents / Total records by qualified agents) × 100
```

Only records processed by qualified agents (defined in `constants/qualified-agents.ts`) count toward quality metrics.

### Data Fetching Pattern

1. **Server Actions** handle database queries (bypasses RLS)
2. **React Query** manages caching, timeouts, and retries
3. **Zustand** stores filter state (persisted to localStorage)
4. **Supabase Realtime** provides real-time updates

### Performance Best Practices

- Always SELECT specific fields, never use `SELECT *`
- Use Server Actions for data fetching (not direct client queries)
- Add timeout protection and retry logic to queries
- Create page-specific hooks for optimized data fetching
- Monitor performance with browser console logs

See [PERFORMANCE.md](PERFORMANCE.md) for detailed guidelines.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Complete development guide for working with the codebase
- **[PERFORMANCE.md](PERFORMANCE.md)** - Performance optimization strategies and troubleshooting
- **[PRD.md](PRD.md)** - Product requirements and feature specifications
- **[User Documentation](/docs)** - In-app user guide (accessible at `/docs`)

## Database Schema

### `ai_human_comparison` Table
- `id` - Auto-increment primary key
- `request_subtype` - Category of request
- `prompt_version` - Version identifier (v1, v2, v3, etc.)
- `created_at` - Record timestamp
- `email` - Agent who processed the record
- `changed` - Boolean indicating if human edited AI output

### `support_threads_data` Table
- `thread_id` - Unique thread identifier
- `ticket_id` - Associated ticket ID
- `request_type` - Type of support request
- `status` - Thread status (11 possible values)
- `requires_*` - Boolean flags for various requirements
- `ai_draft_reply` - AI-generated response content
- `prompt_version` - Prompt version used
- `created_at` - Thread creation timestamp

## Contributing

When contributing to this project:

1. Read [CLAUDE.md](CLAUDE.md) for development guidelines
2. Follow the existing code patterns and conventions
3. Add tests for new features
4. Ensure all TypeScript types are properly defined
5. Test in both light and dark modes
6. Test with both English and Russian locales
7. Add performance logging for new queries
8. Update documentation as needed

## License

[Your License Here]

## Support

For questions or issues:
- Check the [User Documentation](/docs)
- Review [CLAUDE.md](CLAUDE.md) for technical details
- Consult [PERFORMANCE.md](PERFORMANCE.md) for performance issues
