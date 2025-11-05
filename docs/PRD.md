# Product Requirements Document: AI Agent Statistics Dashboard

## Executive Summary

### Project Overview

AI Agent Statistics Dashboard is a comprehensive analytics platform for monitoring and analyzing the performance of AI agents compared to human edits. The dashboard provides real-time insights into quality metrics, version comparisons, and category-specific trends.

### Business Objectives

- Track AI agent quality across different request categories
- Monitor version improvements over time
- Identify patterns in human edits vs. AI-generated content
- Provide actionable insights through interactive visualizations

### Target Users

- Product managers monitoring AI performance
- Data analysts reviewing quality metrics
- Development team tracking prompt version improvements

---

## Technical Stack

### Core Technologies

- **Frontend Framework**: Next.js 16 (App Router)
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Tables**: @tanstack/react-table
- **Real-time**: Supabase Realtime subscriptions

### New Dependencies Required

```json
{
	"@supabase/supabase-js": "^2.x",
	"date-fns": "^3.x",
	"recharts": "^2.15.4" // already installed
}
```

---

## Data Architecture

### Primary Table: `ai_human_comparison`

**Fields** (based on SQL queries):

- `id` (bigint, primary key, auto-increment)
- `request_subtype` (text) - Category of the request
- `prompt_version` (text) - Version identifier (v1, v2, v3, etc.)
- `created_at` (timestamp with timezone)
- `email` (text) - Agent email who processed the record
- `changed` (boolean) - Whether human edited AI output

### Qualified Agents Configuration

**Hardcoded in code** (constants/qualified-agents.ts):

```typescript
export const QUALIFIED_AGENTS = [
	'marianna@levhaolam.com',
	'laure@levhaolam.com',
	'matea@levhaolam.com',
	'yakov@levhaolam.com',
]
```

### Calculated Metrics

**Good Percentage Formula**:

```
Good % = (Records NOT changed by qualified agents / Total records by qualified agents) × 100
```

**Quality Score**:

- 0-30% = Poor (Red)
- 31-60% = Medium (Yellow)
- 61-100% = Good (Green)

---

## Feature Requirements

### 1. Database Connection

**Requirements**:

- Install @supabase/supabase-js
- Configure environment variables in .env.local
- Create Supabase client utility
- Generate TypeScript types from database schema

**Environment Variables**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

**Implementation Files**:

- `lib/supabase/client.ts` - Supabase client initialization
- `lib/supabase/types.ts` - Auto-generated types
- `.env.local.example` - Template for env variables

---

### 2. KPI Cards (Top Section)

**Replace existing 4 cards with**:

#### 2.1 Total Records

- **Metric**: Total count of records in selected period
- **Trend**: Comparison with previous period (same duration)
- **Icon**: Database or Counter icon
- **SQL**:

```sql
SELECT COUNT(*) as total
FROM ai_human_comparison
WHERE created_at BETWEEN $startDate AND $endDate
  AND email = ANY($qualifiedAgents)
```

#### 2.2 Average Quality

- **Metric**: Average good percentage across all categories
- **Trend**: Comparison with previous period
- **Icon**: Chart or Star icon
- **Display**: "85.2%" with trend "↑ 12.3%"
- **SQL**:

```sql
SELECT
  ROUND(AVG(good_pct), 1) as avg_quality
FROM (
  SELECT
    request_subtype,
    (COUNT(*) FILTER (WHERE changed = false) * 100.0 /
     NULLIF(COUNT(*), 0)) as good_pct
  FROM ai_human_comparison
  WHERE created_at BETWEEN $startDate AND $endDate
    AND email = ANY($qualifiedAgents)
  GROUP BY request_subtype
) subquery
```

#### 2.3 Best Category

- **Metric**: Category name with highest good percentage
- **Value**: "Category Name (95.5%)"
- **Trend**: Change in percentage for this category
- **Icon**: Trophy or Star icon
- **SQL**:

```sql
SELECT
  request_subtype,
  ROUND((COUNT(*) FILTER (WHERE changed = false) * 100.0 /
         NULLIF(COUNT(*), 0)), 1) as good_pct
FROM ai_human_comparison
WHERE created_at BETWEEN $startDate AND $endDate
  AND email = ANY($qualifiedAgents)
GROUP BY request_subtype
ORDER BY good_pct DESC
LIMIT 1
```

#### 2.4 Records Changed

- **Metric**: Count of records with changed = true
- **Trend**: Comparison with previous period
- **Icon**: Edit or Refresh icon
- **SQL**:

```sql
SELECT COUNT(*) as changed_count
FROM ai_human_comparison
WHERE created_at BETWEEN $startDate AND $endDate
  AND email = ANY($qualifiedAgents)
  AND changed = true
```

**Component Structure**:

```
components/
  kpi/
    kpi-card.tsx         # Reusable card component
    total-records.tsx    # Total Records card
    average-quality.tsx  # Average Quality card
    best-category.tsx    # Best Category card
    records-changed.tsx  # Records Changed card
    kpi-section.tsx      # Container for all 4 cards
```

---

### 3. Main Chart: Quality Trends Over Time

**Chart Type**: Multi-line chart (Recharts LineChart)

**Features**:

- **X-Axis**: Weeks (formatted as "Week of Jan 1")
- **Y-Axis**: Quality percentage (0-100%)
- **Lines**: One per category (different colors)
- **Interactive Legend**: Checkboxes to show/hide categories
- **Tooltip**: Shows all categories' values on hover
- **Period Selector**: Buttons (Last 7 days, Last 30 days, Last 3 months, All time)

**SQL Query**:

```sql
SELECT
  request_subtype as category,
  DATE_TRUNC('week', created_at) as week_start,
  ROUND((COUNT(*) FILTER (WHERE changed = false AND email = ANY($qualifiedAgents)) * 100.0 /
         NULLIF(COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents)), 0)), 1) as good_percentage
FROM ai_human_comparison
WHERE created_at BETWEEN $startDate AND $endDate
GROUP BY request_subtype, DATE_TRUNC('week', created_at)
ORDER BY week_start ASC, request_subtype
```

**Component**: `components/charts/quality-trends-chart.tsx`

**State Management**:

- Selected categories (array of strings)
- Selected time period (enum: '7d' | '30d' | '3m' | 'all')

---

### 4. Additional Charts (Side-by-Side)

#### 4.1 Quality by Category (Pie Chart)

**Chart Type**: Recharts PieChart

**Features**:

- Shows distribution of records by category
- Each slice colored by quality level (red/yellow/green)
- Click on slice → filters entire dashboard by that category
- Tooltip shows: Category name, record count, percentage

**SQL Query**:

```sql
SELECT
  request_subtype as category,
  COUNT(*) as total_records,
  ROUND((COUNT(*) FILTER (WHERE changed = false AND email = ANY($qualifiedAgents)) * 100.0 /
         NULLIF(COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents)), 0)), 1) as good_percentage
FROM ai_human_comparison
WHERE created_at BETWEEN $startDate AND $endDate
GROUP BY request_subtype
ORDER BY total_records DESC
```

**Component**: `components/charts/category-pie-chart.tsx`

#### 4.2 Version Comparison (Bar Chart)

**Chart Type**: Recharts BarChart

**Features**:

- Grouped bars by version (v1, v2, v3, etc.)
- Y-axis: Good percentage (0-100%)
- Bars colored by quality level
- Tooltip shows version and exact percentage

**SQL Query**:

```sql
SELECT
  prompt_version as version,
  ROUND((COUNT(*) FILTER (WHERE changed = false AND email = ANY($qualifiedAgents)) * 100.0 /
         NULLIF(COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents)), 0)), 1) as good_percentage,
  COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents)) as total_records
FROM ai_human_comparison
WHERE created_at BETWEEN $startDate AND $endDate
GROUP BY prompt_version
ORDER BY prompt_version
```

**Component**: `components/charts/version-bar-chart.tsx`

**Layout**:

```tsx
<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
	<CategoryPieChart />
	<VersionBarChart />
</div>
```

---

### 5. Detailed Data Table

**Columns**:

1. **Category** (request_subtype)
2. **Version** (prompt_version)
3. **Dates** (week range: "01.01.2024 — 07.01.2024")
4. **Total Records** (count)
5. **Records Qualified Agents** (count filtered by qualified emails)
6. **Changed Records** (count where changed = true)
7. **Good Percentage** (calculated %, with color coding)

**Features**:

#### 5.1 Sorting

- Click column header to sort ascending/descending
- Multi-column sorting (shift + click)
- Default sort: Category ASC, then Dates DESC

#### 5.2 Search

- Search input above table
- Filters by category name (case-insensitive)
- Debounced (300ms delay)

#### 5.3 Pagination

- 20 records per page
- Show page numbers (1, 2, 3... with ellipsis)
- "Previous" and "Next" buttons
- Display: "Showing 1-20 of 234 results"

#### 5.4 Color Coding (Good Percentage column)

```typescript
function getQualityColor(percentage: number) {
	if (percentage >= 61)
		return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
	if (percentage >= 31)
		return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
	return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}
```

#### 5.5 Export to CSV

- Button: "Export to CSV" with download icon
- Exports current filtered/sorted data
- Filename: `ai_stats_${startDate}_${endDate}.csv`
- Includes all columns

**SQL Query** (from original TZ):

```sql
-- Уровень 1: Статистика по версии промпта
SELECT
    request_subtype as category,
    prompt_version as version,
    NULL as dates,
    1 as sort_order,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents)) as records_qualified_agents,
    COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents) AND changed = true) as changed_records,
    ROUND(
        (COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents) AND changed = false) * 100.0 /
        NULLIF(COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents)), 0)),
        0
    ) as good_percentage
FROM ai_human_comparison
WHERE created_at BETWEEN $startDate AND $endDate
GROUP BY request_subtype, prompt_version

UNION ALL

-- Уровень 2: Статистика по неделям
SELECT
    request_subtype as category,
    prompt_version as version,
    TO_CHAR(DATE_TRUNC('week', created_at), 'DD.MM.YYYY') || ' — ' ||
    TO_CHAR(DATE_TRUNC('week', created_at) + INTERVAL '6 days', 'DD.MM.YYYY') as dates,
    2 as sort_order,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents)) as records_qualified_agents,
    COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents) AND changed = true) as changed_records,
    ROUND(
        (COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents) AND changed = false) * 100.0 /
        NULLIF(COUNT(*) FILTER (WHERE email = ANY($qualifiedAgents)), 0)),
        0
    ) as good_percentage
FROM ai_human_comparison
WHERE created_at BETWEEN $startDate AND $endDate
GROUP BY request_subtype, prompt_version, DATE_TRUNC('week', created_at)

ORDER BY category, sort_order, version, dates;
```

**Component**: `components/tables/detailed-stats-table.tsx`

**Technology**: @tanstack/react-table (already installed)

---

### 6. Filters

**Filter Bar Location**: Top of dashboard, below header, above KPI cards

**Filters**:

#### 6.1 Date Range Picker

- **Type**: Two date inputs (from/to) with calendar popup
- **Quick Buttons**: "Last 7 days", "Last 30 days", "Last 3 months", "All time"
- **Default**: Last 30 days
- **Component**: shadcn/ui Date Picker or custom component

#### 6.2 Version Filter

- **Type**: Multi-select dropdown with checkboxes
- **Options**: Dynamically loaded from database (DISTINCT prompt_version)
- **Behavior**: "All versions" checkbox + individual version checkboxes
- **Component**: shadcn/ui Multi-Select

#### 6.3 Category Filter

- **Type**: Multi-select dropdown with checkboxes
- **Options**: Dynamically loaded from database (DISTINCT request_subtype)
- **Behavior**: "All categories" checkbox + individual category checkboxes
- **Search**: Filter options by name

#### 6.4 Agent Email Filter

- **Type**: Multi-select dropdown with checkboxes
- **Options**: Hardcoded QUALIFIED_AGENTS list
- **Default**: All selected
- **Behavior**: At least one must be selected

#### 6.5 Reset Filters Button

- **Action**: Reset all filters to defaults
- **Icon**: Refresh or X icon
- **Position**: Right side of filter bar

**Filter State Management**:

```typescript
interface DashboardFilters {
	dateRange: {
		from: Date
		to: Date
	}
	versions: string[] // ['v1', 'v2'] or [] for all
	categories: string[] // ['Category1'] or [] for all
	agents: string[] // Must have at least 1
}
```

**URL Sync** (example):

```
/dashboard?from=2024-01-01&to=2024-12-31&versions=v1,v2&categories=Category1,Category2&agents=sofia@levhaolam.com,marianna@levhaolam.com
```

**localStorage Key**: `ai_stats_filters`

**Component Structure**:

```
components/
  filters/
    filter-bar.tsx           # Container
    date-range-filter.tsx    # Date picker
    version-filter.tsx       # Version multi-select
    category-filter.tsx      # Category multi-select
    agent-filter.tsx         # Agent multi-select
    reset-filters-button.tsx # Reset button
```

---

### 7. SQL Queries Summary

All queries collected in: `lib/supabase/queries.ts`

**Functions to create**:

1. `getKPIData(filters)` - Returns all 4 KPI metrics + trends
2. `getQualityTrends(filters)` - Returns time series data for main chart
3. `getCategoryDistribution(filters)` - Returns data for pie chart
4. `getVersionComparison(filters)` - Returns data for bar chart
5. `getDetailedStats(filters, pagination, sorting)` - Returns table data
6. `getFilterOptions()` - Returns available versions and categories

**Utility Functions**:

- `calculateTrend(current, previous)` - Returns trend object {value, percentage, direction}
- `formatDateRange(from, to)` - Returns formatted date string
- `buildWhereClause(filters)` - Builds SQL WHERE clause from filters

---

### 8. Additional Features

#### 8.1 Real-time Updates

- **Technology**: Supabase Realtime subscriptions
- **Subscription**: Listen to `ai_human_comparison` table changes
- **Behavior**:
  - Show notification when new data arrives
  - Auto-refresh KPIs and charts
  - Highlight updated rows in table
- **Implementation**: `lib/supabase/realtime.ts`

#### 8.2 Refresh Data Button

- **Location**: Top right of dashboard (next to filters)
- **Icon**: Refresh icon with spin animation when loading
- **Action**: Manually refetch all data
- **Cooldown**: 2 seconds between refreshes

#### 8.3 Loading States

- **Component**: Skeleton loaders for each section
- **Libraries**: shadcn/ui Skeleton component (already installed)
- **Behavior**: Show skeleton while data is loading
- **Files**:
  - `components/ui/skeleton.tsx` (exists)
  - `components/loading/kpi-skeleton.tsx`
  - `components/loading/chart-skeleton.tsx`
  - `components/loading/table-skeleton.tsx`

#### 8.4 Error States

- **Component**: Error boundary + error display component
- **Scenarios**:
  - Supabase connection error
  - No data for selected filters
  - Query timeout
- **Display**:
  - Error icon
  - Error message
  - "Retry" button
- **Files**:
  - `components/error/error-display.tsx`
  - `components/error/error-boundary.tsx`

#### 8.5 Dark Mode

- **Status**: Already implemented with next-themes
- **Ensure**: All new components support dark mode
- **Colors**: Use Tailwind dark: variants

#### 8.6 Responsive Design

- **Breakpoints**:
  - Mobile: < 768px (single column, stacked charts)
  - Tablet: 768px - 1024px (2 columns for charts)
  - Desktop: > 1024px (full layout)
- **KPI Cards**: 1 column (mobile), 2 columns (tablet), 4 columns (desktop)
- **Charts**: Stacked (mobile), side-by-side (tablet/desktop)
- **Table**: Horizontal scroll on mobile
- **Sidebar**: Collapsible/drawer on mobile

---

### 9. Navigation Structure

**Update Sidebar** (components/app-sidebar.tsx):

Replace `data.navMain` with:

```typescript
navMain: [
	{
		title: 'Dashboard',
		url: '/dashboard',
		icon: IconDashboard,
	},
	{
		title: 'Detailed Stats',
		url: '/detailed-stats',
		icon: IconListDetails,
	},
	{
		title: 'Settings',
		url: '/settings',
		icon: IconSettings,
	},
]
```

**Routes**:

1. `/dashboard` - Main dashboard (all KPIs, charts, and table)
2. `/detailed-stats` - Full-page table view with advanced filters
3. `/settings` - Future: Database connection settings, qualified agents management

**Note**: For MVP, Settings page can be a placeholder with "Coming Soon" message.

---

## Component Architecture

### High-Level Component Tree

```
app/
├── dashboard/
│   └── page.tsx              # Main dashboard page
│       ├── <FilterBar />
│       ├── <KPISection />
│       │   ├── <TotalRecordsCard />
│       │   ├── <AverageQualityCard />
│       │   ├── <BestCategoryCard />
│       │   └── <RecordsChangedCard />
│       ├── <QualityTrendsChart />
│       ├── <div grid>
│       │   ├── <CategoryPieChart />
│       │   └── <VersionBarChart />
│       └── <DetailedStatsTable />
│
├── detailed-stats/
│   └── page.tsx              # Full-page table view
│
└── settings/
    └── page.tsx              # Settings page (placeholder)

components/
├── filters/
│   ├── filter-bar.tsx
│   ├── date-range-filter.tsx
│   ├── version-filter.tsx
│   ├── category-filter.tsx
│   ├── agent-filter.tsx
│   └── reset-filters-button.tsx
│
├── kpi/
│   ├── kpi-card.tsx          # Base card component
│   ├── total-records.tsx
│   ├── average-quality.tsx
│   ├── best-category.tsx
│   ├── records-changed.tsx
│   └── kpi-section.tsx
│
├── charts/
│   ├── quality-trends-chart.tsx
│   ├── category-pie-chart.tsx
│   └── version-bar-chart.tsx
│
├── tables/
│   └── detailed-stats-table.tsx
│
├── loading/
│   ├── kpi-skeleton.tsx
│   ├── chart-skeleton.tsx
│   └── table-skeleton.tsx
│
└── error/
    ├── error-display.tsx
    └── error-boundary.tsx

lib/
├── supabase/
│   ├── client.ts             # Supabase client
│   ├── types.ts              # Generated types
│   ├── queries.ts            # All SQL queries
│   └── realtime.ts           # Realtime subscription setup
│
├── hooks/
│   ├── use-dashboard-data.ts # Main data fetching hook
│   ├── use-filters.ts        # Filter state management
│   └── use-realtime.ts       # Realtime subscription hook
│
└── utils/
    ├── date.ts               # Date formatting utilities
    ├── calculations.ts       # Trend calculations, percentages
    └── export.ts             # CSV export logic

constants/
└── qualified-agents.ts       # Hardcoded agent list
```

---

## Implementation Roadmap

### Phase 0: Setup (Day 1)

**Tasks**:

1. ✅ Create PRD.md
2. ✅ Create .env.local.example
3. ✅ Create constants/qualified-agents.ts
4. ✅ Update CLAUDE.md
5. Install dependencies:
   ```bash
   npm install @supabase/supabase-js date-fns
   ```
6. Set up Supabase client
7. Generate TypeScript types from Supabase schema

**Deliverables**:

- Environment configured
- Supabase connected
- Types generated

---

### Phase 1: KPI Cards (Day 2-3)

**Priority**: HIGH (Requirement #2 from TZ)

**Tasks**:

1. Create `lib/supabase/queries.ts` with KPI queries
2. Create `lib/hooks/use-dashboard-data.ts` hook
3. Create base `kpi-card.tsx` component
4. Create 4 specific KPI card components
5. Create `kpi-section.tsx` container
6. Implement trend calculations
7. Add loading and error states
8. Test with real data

**SQL Queries Needed**:

- Total Records + trend
- Average Quality + trend
- Best Category + trend
- Records Changed + trend

**Acceptance Criteria**:

- All 4 cards display correct data
- Trends show correct direction and percentage
- Responsive layout (1/2/4 columns)
- Dark mode compatible
- Loading skeletons work

---

### Phase 2: Main Chart - Quality Trends (Day 4-5)

**Tasks**:

1. Create quality trends SQL query
2. Create `quality-trends-chart.tsx` component
3. Implement time period selector (7d, 30d, 3m, all)
4. Implement interactive legend with checkboxes
5. Add responsive behavior
6. Add loading skeleton
7. Test with multiple categories

**Acceptance Criteria**:

- Chart displays all categories with different colors
- Legend checkboxes show/hide lines
- Time period buttons work correctly
- Tooltip shows all values on hover
- Mobile responsive (stacked layout)

---

### Phase 3: Additional Charts (Day 6)

**Tasks**:

1. Create pie chart SQL query
2. Create `category-pie-chart.tsx`
3. Implement click-to-filter functionality
4. Create bar chart SQL query
5. Create `version-bar-chart.tsx`
6. Create side-by-side layout
7. Add loading skeletons

**Acceptance Criteria**:

- Pie chart shows category distribution
- Clicking slice filters dashboard
- Bar chart shows version comparison
- Charts are side-by-side on desktop
- Color coding by quality level works

---

### Phase 4: Data Table (Day 7-8)

**Tasks**:

1. Implement detailed stats SQL query (with UNION)
2. Create `detailed-stats-table.tsx` with TanStack Table
3. Implement sorting (single and multi-column)
4. Implement search by category
5. Implement pagination (20 per page)
6. Implement color coding for Good Percentage
7. Implement CSV export
8. Add loading skeleton

**Acceptance Criteria**:

- Table displays hierarchical data (version rows + week rows)
- Sorting works on all columns
- Search filters by category name
- Pagination shows correct page numbers
- Good % column has color backgrounds
- CSV export downloads correct data

---

### Phase 5: Filters (Day 9-10)

**Tasks**:

1. Create filter state management (`use-filters.ts` hook)
2. Create `filter-bar.tsx` container
3. Create date range filter with quick buttons
4. Create version multi-select filter
5. Create category multi-select filter
6. Create agent multi-select filter
7. Implement "Reset Filters" button
8. Implement URL sync (query params)
9. Implement localStorage persistence
10. Connect filters to all components

**Acceptance Criteria**:

- All filters work and update data
- URL updates when filters change
- Filters persist in localStorage
- Reset button clears all filters
- Shareable links work correctly

---

### Phase 6: Real-time & Polish (Day 11-12)

**Tasks**:

1. Implement Supabase Realtime subscription
2. Add auto-refresh on data changes
3. Add manual "Refresh Data" button
4. Implement error boundaries
5. Add error display components
6. Ensure all loading states work
7. Test responsive design on all breakpoints
8. Test dark mode on all components
9. Performance optimization (memoization)
10. Final QA and bug fixes

**Acceptance Criteria**:

- Dashboard updates when database changes
- Refresh button works with cooldown
- Errors display clearly with retry option
- No data state displays properly
- All components responsive
- Dark mode works everywhere
- No performance issues with large datasets

---

### Phase 7: Navigation & Routes (Day 13)

**Tasks**:

1. Update sidebar navigation
2. Create `/detailed-stats` page (full table view)
3. Create `/settings` placeholder page
4. Ensure routing works correctly
5. Update breadcrumbs

**Acceptance Criteria**:

- Sidebar shows new menu items
- All routes work
- Active route highlighted in sidebar

---

## Testing Checklist

### Functional Testing

- [ ] KPI cards show correct values
- [ ] Trends calculate correctly
- [ ] Quality trends chart displays all categories
- [ ] Pie chart click filters dashboard
- [ ] Bar chart shows version comparison
- [ ] Table sorting works
- [ ] Table search works
- [ ] Table pagination works
- [ ] CSV export downloads correct file
- [ ] All filters apply correctly
- [ ] Reset filters works
- [ ] URL sync works
- [ ] localStorage persistence works
- [ ] Real-time updates work
- [ ] Refresh button works

### UI/UX Testing

- [ ] Loading states display
- [ ] Error states display
- [ ] No data states display
- [ ] Dark mode works on all components
- [ ] Responsive layout on mobile (< 768px)
- [ ] Responsive layout on tablet (768-1024px)
- [ ] Responsive layout on desktop (> 1024px)
- [ ] All tooltips work
- [ ] All icons display correctly

### Performance Testing

- [ ] Initial load < 2 seconds
- [ ] Filter changes < 500ms
- [ ] Chart interactions smooth (60fps)
- [ ] Table scrolling smooth
- [ ] No memory leaks
- [ ] Large datasets (10k+ rows) perform well

---

## Success Metrics

### Technical Metrics

- Page load time: < 2 seconds
- Time to interactive: < 3 seconds
- Lighthouse score: > 90
- Zero console errors
- TypeScript strict mode: no errors

### User Metrics

- Dashboard provides clear insights at a glance
- Filters are intuitive and easy to use
- Data is actionable and accurate
- Real-time updates are smooth and non-intrusive

---

## Future Enhancements (Post-MVP)

1. **Settings Page**:

   - Manage qualified agents list (add/remove)
   - Configure email notifications
   - Set quality thresholds

2. **Advanced Analytics**:

   - Agent performance leaderboard
   - Predictive quality trends
   - Anomaly detection

3. **Export Options**:

   - PDF reports
   - Excel export with charts
   - Scheduled email reports

4. **Collaboration Features**:

   - Share dashboard snapshots
   - Add comments to data points
   - Team annotations

5. **Data Quality**:
   - Data validation rules
   - Duplicate detection
   - Missing data alerts

---

## Appendix

### Color Palette

**Quality Colors**:

```css
/* Good (61-100%) */
--quality-good-light: #dcfce7; /* bg-green-100 */
--quality-good-text-light: #166534; /* text-green-800 */
--quality-good-dark: #14532d; /* dark:bg-green-900 */
--quality-good-text-dark: #bbf7d0; /* dark:text-green-200 */

/* Medium (31-60%) */
--quality-medium-light: #fef3c7; /* bg-yellow-100 */
--quality-medium-text-light: #854d0e; /* text-yellow-800 */
--quality-medium-dark: #713f12; /* dark:bg-yellow-900 */
--quality-medium-text-dark: #fef08a; /* dark:text-yellow-200 */

/* Poor (0-30%) */
--quality-poor-light: #fee2e2; /* bg-red-100 */
--quality-poor-text-light: #991b1b; /* text-red-800 */
--quality-poor-dark: #7f1d1d; /* dark:bg-red-900 */
--quality-poor-text-dark: #fecaca; /* dark:text-red-200 */
```

**Chart Colors** (for categories):

```typescript
const CATEGORY_COLORS = [
	'#3b82f6', // blue
	'#10b981', // green
	'#f59e0b', // amber
	'#ef4444', // red
	'#8b5cf6', // violet
	'#ec4899', // pink
	'#06b6d4', // cyan
	'#f97316', // orange
]
```

### Database Query Performance Tips

1. **Index Creation**:

```sql
CREATE INDEX idx_ai_human_created_at ON ai_human_comparison(created_at);
CREATE INDEX idx_ai_human_email ON ai_human_comparison(email);
CREATE INDEX idx_ai_human_category ON ai_human_comparison(request_subtype);
CREATE INDEX idx_ai_human_version ON ai_human_comparison(prompt_version);
```

2. **Query Optimization**:

- Use `EXPLAIN ANALYZE` to check query plans
- Avoid `SELECT *`, specify columns
- Use appropriate date ranges to limit results
- Consider materialized views for complex aggregations

---

## Document Version

- **Version**: 1.0
- **Last Updated**: 2025-01-26
- **Author**: AI Agent Stats Team
- **Status**: Draft - Ready for Implementation
