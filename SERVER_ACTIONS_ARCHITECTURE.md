# Server Actions Architecture

## Overview

This project uses **Next.js 16 Server Actions** as the primary data fetching layer, following modern best practices for server-client communication.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Client Components (components/*)                            │
│ • 'use client' directive                                    │
│ • UI interactivity, state management                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ calls Server Actions
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Server Actions (lib/actions/dashboard-actions.ts)          │
│ • 'use server' directive                                    │
│ • Type-safe, auto-serialized                               │
│ • Error handling, validation                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ uses pure functions
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Database Queries (lib/supabase/queries.ts)                 │
│ • Pure TypeScript functions                                 │
│ • SQL query logic                                           │
│ • Reusable across Server Actions                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ queries database
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Supabase PostgreSQL Database                                │
│ • ai_human_comparison table                                 │
│ • Real-time subscriptions                                   │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
lib/
├── actions/                          ← Server Actions Layer
│   └── dashboard-actions.ts          # 'use server' - callable from client
│       ├── fetchDashboardData()      # Fetch all dashboard data
│       ├── fetchKPIData()            # Fetch only KPI data
│       ├── fetchQualityTrends()      # Fetch chart data
│       └── ...
│
├── supabase/                         ← Data Access Layer
│   ├── queries.ts                    # Pure SQL functions
│   │   ├── getKPIData()
│   │   ├── getQualityTrends()
│   │   └── ...
│   ├── client.ts                     # Supabase client setup
│   └── types.ts                      # TypeScript types
│
└── hooks/                            ← Client Hooks
    └── use-dashboard-data.ts         # Calls Server Actions
```

## Why Server Actions?

### ✅ Advantages:

1. **Type Safety**: Full TypeScript support, no manual serialization
2. **Less Boilerplate**: No need for API routes, fetch(), JSON parsing
3. **Auto-optimization**: Next.js automatically optimizes Server Actions
4. **Progressive Enhancement**: Works without JavaScript
5. **Built-in Revalidation**: `revalidatePath()`, `revalidateTag()`
6. **Better DX**: Direct function calls instead of HTTP endpoints

### ❌ When NOT to use Server Actions:

- Public APIs for external consumers
- Webhooks from third-party services
- Custom response formats (non-JSON)
- Rate-limited endpoints

## Example Usage

### Server Action (lib/actions/dashboard-actions.ts)

```typescript
'use server'

export async function fetchDashboardData(filters: DashboardFilters) {
  try {
    const [kpi, trends, ...] = await Promise.all([
      getKPIData(filters),      // Pure SQL function
      getQualityTrends(filters), // Pure SQL function
      // ...
    ])

    return {
      success: true,
      data: { kpi, trends, ... },
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}
```

### Client Hook (lib/hooks/use-dashboard-data.ts)

```typescript
'use client'

import { fetchDashboardData } from '@/lib/actions/dashboard-actions'

export function useDashboardData(filters: DashboardFilters) {
  useEffect(() => {
    async function loadData() {
      // Direct call to Server Action - no fetch() needed!
      const result = await fetchDashboardData(filters)

      if (result.success) {
        setData(result.data)
      }
    }
    loadData()
  }, [])

  // ...
}
```

### Client Component (components/dashboard-content.tsx)

```typescript
'use client'

export function DashboardContent() {
  const filters = useMemo(() => getDefaultFilters(), [])
  const { data, isLoading, error } = useDashboardData(filters)

  // Server Action is called automatically inside the hook
  return <KPISection data={data.kpi} />
}
```

## Key Principles

1. **'use server' at file level**: All exports become Server Actions
2. **Always return serializable data**: Plain objects, arrays, primitives (no functions, classes)
3. **Error handling in Server Actions**: Wrap in try/catch, return `{ success, error }` pattern
4. **Separation of concerns**:
   - Server Actions = API layer (error handling, validation)
   - Queries = Data layer (pure SQL logic)
5. **Type safety end-to-end**: TypeScript types flow from DB → Queries → Actions → Hooks → Components

## Performance Tips

### ✅ Do:
- Fetch data in parallel with `Promise.all()`
- Return only necessary data (don't over-fetch)
- Use `revalidatePath()` after mutations

### ❌ Don't:
- Call Server Actions in loops (batch instead)
- Return large objects (optimize queries)
- Use Server Actions for real-time data (use Supabase Realtime)

## Real-time Updates

Server Actions are for **data fetching**, not real-time updates.

For real-time:
```typescript
// In Client Component
useEffect(() => {
  const channel = supabase
    .channel('changes')
    .on('postgres_changes', { ... }, (payload) => {
      router.refresh() // Refresh Server Components
      // Or refetch data manually
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [])
```

## Migration from API Routes

If you have existing API routes, migrate to Server Actions:

### Before (API Route):
```typescript
// app/api/data/route.ts
export async function GET(request: Request) {
  const data = await getData()
  return NextResponse.json(data)
}

// Client
const response = await fetch('/api/data')
const data = await response.json()
```

### After (Server Action):
```typescript
// lib/actions/data-actions.ts
'use server'
export async function fetchData() {
  return await getData()
}

// Client
const data = await fetchData() // Direct call!
```

## Resources

- [Next.js Server Actions Docs](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [NEXTJS_16_DOC.md](./NEXTJS_16_DOC.md) - Complete Next.js 16 best practices
- [PRD.md](./PRD.md) - Product requirements and implementation plan
