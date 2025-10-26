# Next.js 16 Best Practices Guide for Dashboard Development

## Table of Contents
1. [Server Components vs Client Components](#1-server-components-vs-client-components)
2. [Server Actions](#2-server-actions)
3. [Data Fetching in App Router](#3-data-fetching-in-app-router)
4. [Client-side State Management](#4-client-side-state-management)
5. [Supabase Integration](#5-supabase-integration)
6. [Dashboard Implementation Patterns](#6-dashboard-implementation-patterns)

---

## 1. Server Components vs Client Components

### When to Use Each

**Server Components (Default)** - Use for:
- Data fetching from databases/APIs
- Protecting API keys and secrets
- Reducing JavaScript bundle size
- Backend data processing
- Static content rendering

**Client Components** - Use for:
- Interactive UI elements (onClick, onChange)
- State management (useState, useReducer)
- Lifecycle hooks (useEffect)
- Browser APIs (window, localStorage, geolocation)
- Real-time subscriptions
- Form inputs and validation

### Code Examples

#### Basic Client Component
```typescript
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>{count} likes</p>
      <button onClick={() => setCount(count + 1)}>Like</button>
    </div>
  )
}
```

#### Passing Data from Server to Client
```typescript
// app/page.tsx (Server Component)
import LikeButton from '@/app/ui/like-button'
import { getPost } from '@/lib/data'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)

  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      <LikeButton likes={post.likes} />
    </div>
  )
}

// app/ui/like-button.tsx (Client Component)
'use client'

import { useState } from 'react'

export default function LikeButton({ likes }: { likes: number }) {
  const [count, setCount] = useState(likes)

  return (
    <button onClick={() => setCount(count + 1)}>
      Likes: {count}
    </button>
  )
}
```

#### Composition Pattern: Passing Server Components as Children
```typescript
// app/ui/modal.tsx (Client Component)
'use client'

export default function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="modal">
      {children}
    </div>
  )
}

// app/page.tsx (Server Component)
import Modal from './ui/modal'
import Cart from './ui/cart' // Server Component

export default function Page() {
  return (
    <Modal>
      <Cart /> {/* Remains a Server Component */}
    </Modal>
  )
}
```

#### Context Provider Pattern
```typescript
// app/providers/theme-provider.tsx
'use client'

import { createContext, useContext } from 'react'

const ThemeContext = createContext({ theme: 'dark' })

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

### Security Best Practice

Use the `server-only` package to prevent accidental client imports:

```typescript
// lib/data.ts
import 'server-only'

export async function getData() {
  const res = await fetch('https://api.example.com/data', {
    headers: {
      authorization: process.env.API_KEY // Safe on server only
    }
  })
  return res.json()
}
```

---

## 2. Server Actions

### Creating Server Actions

#### Method 1: File-level directive (Recommended for reuse)
```typescript
// app/actions/posts.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  // Validate data
  if (!title || !content) {
    return { error: 'Title and content are required' }
  }

  // Insert into database
  await db.post.create({
    data: { title, content }
  })

  // Revalidate the posts page cache
  revalidatePath('/posts')

  // Redirect to posts page
  redirect('/posts')
}

export async function deletePost(id: string) {
  await db.post.delete({ where: { id } })
  revalidatePath('/posts')
}
```

#### Method 2: Inline in Server Components
```typescript
// app/page.tsx
export default function Page() {
  async function createPost(formData: FormData) {
    'use server'

    const title = formData.get('title')
    // Process data...
  }

  return (
    <form action={createPost}>
      <input type="text" name="title" />
      <button type="submit">Create</button>
    </form>
  )
}
```

### Using Server Actions in Forms

#### Basic Form Pattern
```typescript
// app/posts/new/page.tsx
import { createPost } from '@/app/actions/posts'

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input type="text" name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit">Create Post</button>
    </form>
  )
}
```

#### Client Component with Server Action
```typescript
// app/ui/create-post-button.tsx
'use client'

import { createPost } from '@/app/actions/posts'

export default function CreatePostButton() {
  return (
    <button formAction={createPost}>
      Create Post
    </button>
  )
}
```

### Advanced Patterns

#### With Pending State
```typescript
'use client'

import { useActionState } from 'react'
import { createPost } from '@/app/actions/posts'
import { LoadingSpinner } from '@/app/ui/loading-spinner'

export default function CreatePostForm() {
  const [state, formAction, pending] = useActionState(createPost, null)

  return (
    <form action={formAction}>
      <input type="text" name="title" />
      <textarea name="content" />
      <button type="submit" disabled={pending}>
        {pending ? <LoadingSpinner /> : 'Create Post'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  )
}
```

#### Event Handler Pattern with Optimistic Updates
```typescript
'use client'

import { useState, useTransition } from 'react'
import { incrementLike } from '@/app/actions/posts'

export default function LikeButton({ postId, initialLikes }: { postId: string, initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)
  const [isPending, startTransition] = useTransition()

  const handleLike = async () => {
    // Optimistic update
    setLikes(likes + 1)

    startTransition(async () => {
      try {
        const updatedLikes = await incrementLike(postId)
        setLikes(updatedLikes)
      } catch (error) {
        // Revert on error
        setLikes(likes)
      }
    })
  }

  return (
    <button onClick={handleLike} disabled={isPending}>
      Likes: {likes}
    </button>
  )
}
```

### Revalidation Patterns

#### Path-based Revalidation
```typescript
'use server'

import { revalidatePath } from 'next/cache'

export async function updatePost(id: string, data: any) {
  await db.post.update({ where: { id }, data })

  // Revalidate specific path
  revalidatePath('/posts')

  // Revalidate with layout
  revalidatePath('/posts', 'layout')

  // Revalidate specific post
  revalidatePath(`/posts/${id}`)
}
```

#### Tag-based Revalidation (Next.js 16)
```typescript
'use server'

import { revalidateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  // Create post...

  // Revalidate all requests tagged with 'posts'
  revalidateTag('posts')
}

// In your data fetching
export async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }
  })
  return res.json()
}
```

#### Read-Your-Writes with updateTag (Next.js 16)
```typescript
'use server'

import { updateTag } from 'next/cache'

export async function likePost(postId: string) {
  await db.post.update({
    where: { id: postId },
    data: { likes: { increment: 1 } }
  })

  // Immediately read fresh data in the same request
  updateTag('posts')

  return await db.post.findUnique({ where: { id: postId } })
}
```

#### Cookie Manipulation
```typescript
'use server'

import { cookies } from 'next/headers'

export async function savePreference(theme: string) {
  const cookieStore = await cookies()

  // Set cookie
  cookieStore.set('theme', theme, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  })

  // Get cookie
  const currentTheme = cookieStore.get('theme')?.value

  // Delete cookie
  cookieStore.delete('theme')
}
```

---

## 3. Data Fetching in App Router

### Next.js 16 Caching Changes

**Major Change**: Next.js 16 makes caching **opt-in by default**. All dynamic code executes at request time unless explicitly cached.

### The New Caching Model: `use cache`

```typescript
// app/posts/page.tsx
'use cache'

export default async function PostsPage() {
  const posts = await fetch('https://api.example.com/posts').then(r => r.json())

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  )
}
```

### Fetch with Caching Options

#### Dynamic (No Cache) - Default in Next.js 16
```typescript
export async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    cache: 'no-store' // Always fetch fresh data
  })
  return res.json()
}
```

#### Force Cache
```typescript
export async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    cache: 'force-cache' // Cache indefinitely
  })
  return res.json()
}
```

#### Time-based Revalidation
```typescript
export async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 } // Revalidate every hour
  })
  return res.json()
}
```

#### Tag-based Caching
```typescript
export async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: {
      tags: ['posts'],
      revalidate: 3600
    }
  })
  return res.json()
}
```

### Streaming and Suspense

#### Basic Suspense Pattern
```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'
import { StatsCards } from './stats-cards'
import { RecentActivity } from './recent-activity'

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Fast component loads immediately */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Slow component streams in later */}
      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  )
}
```

#### Nested Suspense for Granular Loading
```typescript
export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Suspense fallback={<CardSkeleton />}>
        <RevenueCard />
      </Suspense>

      <Suspense fallback={<CardSkeleton />}>
        <UsersCard />
      </Suspense>

      <Suspense fallback={<CardSkeleton />}>
        <OrdersCard />
      </Suspense>

      <Suspense fallback={<CardSkeleton />}>
        <ConversionCard />
      </Suspense>
    </div>
  )
}
```

### Loading States with loading.tsx

```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  )
}
```

### Error Handling with error.tsx

```typescript
// app/dashboard/error.tsx
'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Try again
      </button>
    </div>
  )
}
```

### Parallel Data Fetching

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  // Fetch in parallel
  const [revenue, users, orders] = await Promise.all([
    fetchRevenue(),
    fetchUsers(),
    fetchOrders()
  ])

  return (
    <div>
      <RevenueCard data={revenue} />
      <UsersCard data={users} />
      <OrdersCard data={orders} />
    </div>
  )
}
```

---

## 4. Client-side State Management

### useSearchParams for URL State

#### Basic Implementation with Suspense
```typescript
// app/dashboard/search-bar.tsx
'use client'

import { useSearchParams } from 'next/navigation'

export default function SearchBar() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search')
  const category = searchParams.get('category')

  return (
    <div>
      <p>Search: {search}</p>
      <p>Category: {category}</p>
    </div>
  )
}

// app/dashboard/page.tsx
import { Suspense } from 'react'
import SearchBar from './search-bar'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchBar />
    </Suspense>
  )
}
```

#### Filter Component with URL State
```typescript
'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function DashboardFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

  const handleFilterChange = (filterName: string, value: string) => {
    router.push(pathname + '?' + createQueryString(filterName, value), {
      scroll: false // Maintain scroll position
    })
  }

  return (
    <div className="flex gap-4">
      <select
        value={searchParams.get('timeRange') || 'week'}
        onChange={(e) => handleFilterChange('timeRange', e.target.value)}
      >
        <option value="day">Last 24 Hours</option>
        <option value="week">Last Week</option>
        <option value="month">Last Month</option>
        <option value="year">Last Year</option>
      </select>

      <select
        value={searchParams.get('metric') || 'revenue'}
        onChange={(e) => handleFilterChange('metric', e.target.value)}
      >
        <option value="revenue">Revenue</option>
        <option value="users">Users</option>
        <option value="orders">Orders</option>
      </select>
    </div>
  )
}
```

#### Multiple Filters Pattern
```typescript
'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function AdvancedFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      router.push(pathname + '?' + params.toString(), { scroll: false })
    },
    [searchParams, pathname, router]
  )

  const clearFilters = () => {
    router.push(pathname, { scroll: false })
  }

  return (
    <div>
      <button onClick={() => updateFilters({ status: 'active', sort: 'desc' })}>
        Apply Filters
      </button>
      <button onClick={clearFilters}>
        Clear All
      </button>
    </div>
  )
}
```

### useRouter for Navigation

```typescript
'use client'

import { useRouter } from 'next/navigation'

export default function NavigationExample() {
  const router = useRouter()

  return (
    <div>
      <button onClick={() => router.push('/dashboard')}>
        Go to Dashboard
      </button>

      <button onClick={() => router.back()}>
        Go Back
      </button>

      <button onClick={() => router.refresh()}>
        Refresh Data
      </button>
    </div>
  )
}
```

### Hybrid State Pattern (Instant Updates + URL Sync)

For instant UI updates without waiting for router changes:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function InstantFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Local state for instant updates
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'all'
  })

  // Debounced URL sync
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.category !== 'all') params.set('category', filters.category)

      router.replace(pathname + '?' + params.toString(), { scroll: false })
    }, 300)

    return () => clearTimeout(timer)
  }, [filters, pathname, router])

  return (
    <div>
      <input
        type="text"
        value={filters.search}
        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
        placeholder="Search..."
      />

      <select
        value={filters.category}
        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
      >
        <option value="all">All Categories</option>
        <option value="tech">Technology</option>
        <option value="business">Business</option>
      </select>
    </div>
  )
}
```

---

## 5. Supabase Integration

### Setup

#### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Client Setup

#### Browser Client (Client Components)
```typescript
// utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

#### Server Client (Server Components & Actions)
```typescript
// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

### Middleware for Auth Token Refresh

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    // No user, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: Return the supabaseResponse to pass the refreshed Auth token
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Authentication Patterns

#### Protected Server Component
```typescript
// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // IMPORTANT: Always use getUser(), not getSession()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
    </div>
  )
}
```

#### Server Action with Auth
```typescript
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const title = formData.get('title') as string

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title,
      user_id: user.id
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/posts')
  return { success: true }
}
```

### Data Fetching Patterns

#### Server Component Data Fetching
```typescript
// app/posts/page.tsx
import { createClient } from '@/utils/supabase/server'

export default async function PostsPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      {posts?.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  )
}
```

#### With Caching (Next.js 16)
```typescript
'use cache'

import { createClient } from '@/utils/supabase/server'

export default async function PostsPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      {posts?.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </div>
  )
}
```

### Real-time Subscriptions

#### Basic Real-time Component
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Post {
  id: string
  title: string
  content: string
  created_at: string
}

export default function RealtimePosts({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          setPosts((current) => [payload.new as Post, ...current])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          setPosts((current) =>
            current.map((post) =>
              post.id === payload.new.id ? (payload.new as Post) : post
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          setPosts((current) =>
            current.filter((post) => post.id !== payload.old.id)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  )
}
```

#### Real-time with Router Refresh (Recommended Pattern)
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function RealtimeSubscription() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'posts'
        },
        () => {
          // Refresh Server Components to get new data
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  return null // This component doesn't render anything
}

// Usage in layout or page
export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <RealtimeSubscription />
      {children}
    </div>
  )
}
```

#### Dashboard with Real-time KPI Updates
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface KPIData {
  revenue: number
  users: number
  orders: number
}

export default function RealtimeKPIs({ initial }: { initial: KPIData }) {
  const [kpis, setKpis] = useState<KPIData>(initial)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('kpi-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async () => {
          // Refetch KPIs when orders change
          const { data } = await supabase.rpc('get_kpi_data')
          if (data) setKpis(data)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="card">
        <h3>Revenue</h3>
        <p className="text-3xl font-bold">${kpis.revenue.toLocaleString()}</p>
      </div>
      <div className="card">
        <h3>Users</h3>
        <p className="text-3xl font-bold">{kpis.users.toLocaleString()}</p>
      </div>
      <div className="card">
        <h3>Orders</h3>
        <p className="text-3xl font-bold">{kpis.orders.toLocaleString()}</p>
      </div>
    </div>
  )
}
```

#### Enable Replication (Required)
Before subscribing to real-time changes, enable replication in Supabase:
1. Go to Database > Replication
2. Enable replication for your table
3. Select which events to broadcast (INSERT, UPDATE, DELETE)

---

## 6. Dashboard Implementation Patterns

### Complete Dashboard Example

#### File Structure
```
app/
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   ├── components/
│   │   ├── kpi-card.tsx
│   │   ├── chart.tsx
│   │   ├── filters.tsx
│   │   └── realtime-wrapper.tsx
│   └── actions.ts
```

#### Dashboard Layout
```typescript
// app/dashboard/layout.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import RealtimeSubscription from './components/realtime-wrapper'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <RealtimeSubscription />
        {children}
      </main>
    </div>
  )
}
```

#### Dashboard Page with Filters
```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import KPICards from './components/kpi-cards'
import Chart from './components/chart'
import Filters from './components/filters'
import { KPICardsSkeleton, ChartSkeleton } from './components/skeletons'

interface PageProps {
  searchParams: Promise<{
    timeRange?: string
    metric?: string
  }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const timeRange = params.timeRange || 'week'
  const metric = params.metric || 'revenue'

  return (
    <div className="space-y-6">
      {/* Filters load immediately */}
      <Suspense>
        <Filters />
      </Suspense>

      {/* KPI cards stream in */}
      <Suspense fallback={<KPICardsSkeleton />}>
        <KPICards timeRange={timeRange} />
      </Suspense>

      {/* Chart streams in */}
      <Suspense fallback={<ChartSkeleton />}>
        <Chart timeRange={timeRange} metric={metric} />
      </Suspense>
    </div>
  )
}
```

#### KPI Cards Component
```typescript
// app/dashboard/components/kpi-cards.tsx
import { createClient } from '@/utils/supabase/server'

interface KPICardsProps {
  timeRange: string
}

export default async function KPICards({ timeRange }: KPICardsProps) {
  const supabase = await createClient()

  // Fetch KPI data based on time range
  const { data: kpis } = await supabase.rpc('get_kpis', {
    time_range: timeRange
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Total Revenue"
        value={`$${kpis.revenue.toLocaleString()}`}
        change={kpis.revenueChange}
        trend={kpis.revenueTrend}
      />
      <KPICard
        title="New Users"
        value={kpis.users.toLocaleString()}
        change={kpis.usersChange}
        trend={kpis.usersTrend}
      />
      <KPICard
        title="Orders"
        value={kpis.orders.toLocaleString()}
        change={kpis.ordersChange}
        trend={kpis.ordersTrend}
      />
      <KPICard
        title="Conversion Rate"
        value={`${kpis.conversionRate}%`}
        change={kpis.conversionChange}
        trend={kpis.conversionTrend}
      />
    </div>
  )
}

function KPICard({
  title,
  value,
  change,
  trend
}: {
  title: string
  value: string
  change: number
  trend: 'up' | 'down'
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2 flex items-baseline">
        <p className="text-3xl font-semibold text-gray-900">{value}</p>
        <span className={`ml-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? '↑' : '↓'} {Math.abs(change)}%
        </span>
      </div>
    </div>
  )
}
```

#### Filters Component
```typescript
// app/dashboard/components/filters.tsx
'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(key, value)
      router.push(pathname + '?' + params.toString(), { scroll: false })
    },
    [searchParams, pathname, router]
  )

  return (
    <div className="bg-white rounded-lg shadow p-4 flex gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Time Range</label>
        <select
          value={searchParams.get('timeRange') || 'week'}
          onChange={(e) => updateFilter('timeRange', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="day">Last 24 Hours</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Metric</label>
        <select
          value={searchParams.get('metric') || 'revenue'}
          onChange={(e) => updateFilter('metric', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="revenue">Revenue</option>
          <option value="users">Users</option>
          <option value="orders">Orders</option>
          <option value="conversion">Conversion Rate</option>
        </select>
      </div>
    </div>
  )
}
```

#### Chart Component
```typescript
// app/dashboard/components/chart.tsx
import { createClient } from '@/utils/supabase/server'

interface ChartProps {
  timeRange: string
  metric: string
}

export default async function Chart({ timeRange, metric }: ChartProps) {
  const supabase = await createClient()

  const { data: chartData } = await supabase.rpc('get_chart_data', {
    time_range: timeRange,
    metric
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">
        {metric.charAt(0).toUpperCase() + metric.slice(1)} Trend
      </h2>
      {/* Your chart library component here */}
      <div className="h-64">
        {/* Example: <LineChart data={chartData} /> */}
        <pre>{JSON.stringify(chartData, null, 2)}</pre>
      </div>
    </div>
  )
}
```

#### Real-time Wrapper
```typescript
// app/dashboard/components/realtime-wrapper.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function RealtimeSubscription() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          // Refresh Server Components when data changes
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  return null
}
```

#### Loading Skeletons
```typescript
// app/dashboard/components/skeletons.tsx
export function KPICardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  )
}
```

### Best Practices Summary

1. **Component Architecture**
   - Keep Server Components as the default
   - Only add 'use client' when needed for interactivity
   - Pass Server Components as children to Client Components

2. **Data Fetching**
   - Use Server Components for initial data fetching
   - Implement Suspense boundaries for progressive loading
   - Leverage parallel data fetching with Promise.all

3. **State Management**
   - Use URL search params for filters and shareable state
   - Implement real-time updates with Supabase in Client Components
   - Use router.refresh() to update Server Components

4. **Caching Strategy (Next.js 16)**
   - Use 'use cache' directive for static content
   - Keep dynamic data uncached by default
   - Use revalidateTag for targeted cache invalidation

5. **Performance**
   - Stream content with Suspense
   - Minimize client-side JavaScript
   - Implement optimistic updates for better UX

6. **Security**
   - Always use getUser() for auth checks in server code
   - Never trust getSession() in Server Components
   - Use middleware for auth token refresh

7. **Real-time Updates**
   - Use Client Components for Supabase real-time subscriptions
   - Call router.refresh() to update Server Components
   - Enable replication in Supabase for tables that need real-time

This guide provides a solid foundation for building modern, performant dashboards with Next.js 16 and Supabase!
