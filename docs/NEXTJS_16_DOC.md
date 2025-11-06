# Next.js Documentation Reference

Next.js is a React framework for building full-stack web applications with server-side rendering, static site generation, and hybrid rendering capabilities. It provides a file-system based router built on Server Components, automatic code splitting, optimized asset loading, and comprehensive data fetching solutions. The framework abstracts complex tooling configurations while enabling developers to build production-ready applications with features like API routes, middleware, image optimization, and incremental static regeneration.

This documentation repository contains comprehensive guides for multiple Next.js versions including v13, v14, and the latest features. It covers both the modern App Router (using React Server Components) and the legacy Pages Router, providing API references, building guides, configuration options, and community resources. The documentation includes detailed explanations of routing patterns, data fetching strategies, rendering methods, optimization techniques, and integration patterns for creating performant, scalable web applications.

## File-System Based Routing

Next.js uses a file-system router where folders define routes and special files create UI elements. Routes are automatically accessible via their file path.

```tsx
// app/page.tsx - Home route (/)
export default function HomePage() {
	return <h1>Welcome Home</h1>
}

// app/dashboard/page.tsx - /dashboard route
export default function DashboardPage() {
	return <h1>Dashboard</h1>
}

// app/blog/[slug]/page.tsx - Dynamic route /blog/:slug
export default function BlogPost({ params }: { params: { slug: string } }) {
	return <h1>Post: {params.slug}</h1>
}

// app/shop/[...slug]/page.tsx - Catch-all route /shop/*
export default function ShopPage({ params }: { params: { slug: string[] } }) {
	return <div>Category: {params.slug.join('/')}</div>
}

// app/(marketing)/about/page.tsx - Route groups (URL: /about, not /marketing/about)
export default function AboutPage() {
	return <h1>About Us</h1>
}
```

## Layout Components

Layouts define shared UI that wraps pages and persist state across navigation without re-rendering.

```tsx
// app/layout.tsx - Root layout (required)
export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang='en'>
			<body>
				<header>Site Header</header>
				{children}
				<footer>Site Footer</footer>
			</body>
		</html>
	)
}

// app/dashboard/layout.tsx - Nested layout
export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<section>
			<nav>
				<Link href='/dashboard'>Overview</a>
				<Link href='/dashboard/settings'>Settings</a>
			</nav>
			<main>{children}</main>
		</section>
	)
}

// app/dashboard/@analytics/page.tsx - Parallel routes with slots
export default function AnalyticsSlot() {
	return <div>Analytics Dashboard</div>
}

// app/dashboard/layout.tsx - Using parallel routes
export default function Layout({
	children,
	analytics,
}: {
	children: React.ReactNode
	analytics: React.ReactNode
}) {
	return (
		<div>
			{children}
			{analytics}
		</div>
	)
}
```

## Link Component

Client-side navigation between routes with automatic prefetching for optimized performance.

```tsx
import Link from 'next/link'

export default function Navigation() {
	return (
		<nav>
			{/* Basic link */}
			<Link href='/dashboard'>Dashboard</Link>

			{/* Dynamic link */}
			<Link href={`/blog/${postId}`}>Read Post</Link>

			{/* Link with query parameters */}
			<Link href={{ pathname: '/search', query: { q: 'nextjs' } }}>Search</Link>

			{/* Disable prefetching */}
			<Link href='/heavy-page' prefetch={false}>
				Heavy Page
			</Link>

			{/* Link with custom className */}
			<Link href='/about' className='text-blue-500 hover:underline'>
				About
			</Link>

			{/* Replace history instead of push */}
			<Link href='/login' replace>
				Login
			</Link>

			{/* External link (uses <a> tag) */}
			<Link href='https://github.com' target='_blank' rel='noopener'>
				GitHub
			</Link>
		</nav>
	)
}
```

## Image Component

Optimized image component with automatic optimization, lazy loading, and responsive images.

```tsx
import Image from 'next/image'

export default function ImageExamples() {
	return (
		<div>
			{/* Local image with priority loading */}
			<Image
				src='/hero.jpg'
				alt='Hero image'
				width={1200}
				height={600}
				priority
				quality={90}
			/>

			{/* Remote image */}
			<Image
				src='https://example.com/photo.jpg'
				alt='Remote photo'
				width={800}
				height={400}
				placeholder='blur'
				blurDataURL='data:image/jpeg;base64,...'
			/>

			{/* Responsive fill container */}
			<div style={{ position: 'relative', width: '100%', height: '400px' }}>
				<Image
					src='/banner.jpg'
					alt='Banner'
					fill
					style={{ objectFit: 'cover' }}
					sizes='100vw'
				/>
			</div>

			{/* Image with multiple sizes for responsive loading */}
			<Image
				src='/profile.jpg'
				alt='Profile'
				width={400}
				height={400}
				sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
			/>

			{/* Lazy loaded image (default) */}
			<Image
				src='/lazy.jpg'
				alt='Lazy loaded'
				width={600}
				height={400}
				loading='lazy'
			/>
		</div>
	)
}

// next.config.js - Configure remote image domains
module.exports = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'example.com',
				pathname: '/images/**',
			},
		],
	},
}
```

## Font Optimization

Automatic font optimization with zero layout shift using next/font.

```tsx
// app/layout.tsx
import { Inter, Roboto_Mono, Playfair_Display } from 'next/font/google'
import localFont from 'next/font/local'

// Google Fonts
const inter = Inter({
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-inter',
})

const robotoMono = Roboto_Mono({
	subsets: ['latin'],
	weight: ['400', '700'],
	variable: '--font-roboto-mono',
})

const playfair = Playfair_Display({
	subsets: ['latin'],
	weight: '400',
})

// Local custom font
const myFont = localFont({
	src: './fonts/my-font.woff2',
	display: 'swap',
	variable: '--font-custom',
})

export default function RootLayout({ children }) {
	return (
		<html lang='en' className={`${inter.variable} ${robotoMono.variable}`}>
			<body className={inter.className}>{children}</body>
		</html>
	)
}

// Using font variables in CSS
// app/globals.css
// h1 {
//   font-family: var(--font-inter);
// }
// code {
//   font-family: var(--font-roboto-mono);
// }
```

## Script Component

Script optimization with loading strategies for third-party scripts.

```tsx
import Script from 'next/script'

export default function Page() {
	return (
		<>
			{/* beforeInteractive - loads before page is interactive */}
			<Script
				src='https://polyfill.io/v3/polyfill.min.js'
				strategy='beforeInteractive'
			/>

			{/* afterInteractive - loads after page becomes interactive (default) */}
			<Script
				src='https://www.google-analytics.com/analytics.js'
				strategy='afterInteractive'
				onLoad={() => {
					console.log('GA loaded')
				}}
			/>

			{/* lazyOnload - loads during idle time */}
			<Script
				src='https://connect.facebook.net/en_US/sdk.js'
				strategy='lazyOnload'
			/>

			{/* Inline script */}
			<Script id='init-theme' strategy='beforeInteractive'>
				{`
          const theme = localStorage.getItem('theme') || 'light';
          document.documentElement.setAttribute('data-theme', theme);
        `}
			</Script>

			{/* Script with error handling */}
			<Script
				src='https://example.com/script.js'
				onError={e => {
					console.error('Script failed to load', e)
				}}
			/>
		</>
	)
}
```

## Server Components and Data Fetching

React Server Components render on the server and can fetch data directly using async/await.

```tsx
// app/products/page.tsx - Server Component (default)
export default async function ProductsPage() {
	// Direct data fetching - cached by default
	const products = await fetch('https://api.example.com/products').then(res =>
		res.json()
	)

	return (
		<div>
			<h1>Products</h1>
			<ul>
				{products.map(product => (
					<li key={product.id}>{product.name}</li>
				))}
			</ul>
		</div>
	)
}

// app/posts/page.tsx - Multiple parallel requests
export default async function PostsPage() {
	const [posts, categories, users] = await Promise.all([
		fetch('https://api.example.com/posts').then(res => res.json()),
		fetch('https://api.example.com/categories').then(res => res.json()),
		fetch('https://api.example.com/users').then(res => res.json()),
	])

	return (
		<div>
			<h1>Posts: {posts.length}</h1>
			<h2>Categories: {categories.length}</h2>
			<h2>Users: {users.length}</h2>
		</div>
	)
}

// app/lib/api.ts - Reusable data fetching functions
export async function getProduct(id: string) {
	const res = await fetch(`https://api.example.com/products/${id}`, {
		cache: 'force-cache', // Static (default)
	})
	if (!res.ok) throw new Error('Failed to fetch product')
	return res.json()
}

export async function getUser(id: string) {
	const res = await fetch(`https://api.example.com/users/${id}`, {
		cache: 'no-store', // Dynamic - always fresh
	})
	return res.json()
}

export async function getPosts() {
	const res = await fetch('https://api.example.com/posts', {
		next: { revalidate: 3600 }, // ISR - revalidate every hour
	})
	return res.json()
}

export async function getTaggedData() {
	const res = await fetch('https://api.example.com/data', {
		next: { tags: ['products'] }, // Tag-based revalidation
	})
	return res.json()
}
```

## Client Components

Interactive components that use React hooks and browser APIs, marked with 'use client' directive.

```tsx
// app/components/counter.tsx
'use client'

import { useState } from 'react'

export default function Counter() {
	const [count, setCount] = useState(0)

	return (
		<div>
			<p>Count: {count}</p>
			<button onClick={() => setCount(count + 1)}>Increment</button>
		</div>
	)
}

// app/components/search.tsx
;('use client')

import { useState, useEffect } from 'react'

export default function SearchBox() {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState([])

	useEffect(() => {
		if (query.length > 2) {
			fetch(`/api/search?q=${query}`)
				.then(res => res.json())
				.then(data => setResults(data))
		}
	}, [query])

	return (
		<div>
			<input
				type='text'
				value={query}
				onChange={e => setQuery(e.target.value)}
				placeholder='Search...'
			/>
			<ul>
				{results.map(result => (
					<li key={result.id}>{result.title}</li>
				))}
			</ul>
		</div>
	)
}

// app/components/theme-toggle.tsx
;('use client')

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
	const [theme, setTheme] = useState('light')

	useEffect(() => {
		// Access browser APIs
		const saved = localStorage.getItem('theme')
		if (saved) setTheme(saved)
	}, [])

	const toggleTheme = () => {
		const newTheme = theme === 'light' ? 'dark' : 'light'
		setTheme(newTheme)
		localStorage.setItem('theme', newTheme)
		document.documentElement.setAttribute('data-theme', newTheme)
	}

	return (
		<button onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
	)
}
```

## Enhanced fetch() with Caching

Next.js extends the native fetch API with automatic request memoization and caching.

```tsx
// Cached by default (force-cache) - Static
const data1 = await fetch('https://api.example.com/data')

// No caching (no-store) - Dynamic
const data2 = await fetch('https://api.example.com/live-data', {
	cache: 'no-store',
})

// Time-based revalidation (ISR) - Incremental Static Regeneration
const data3 = await fetch('https://api.example.com/products', {
	next: { revalidate: 60 }, // Revalidate every 60 seconds
})

// Tag-based revalidation
const data4 = await fetch('https://api.example.com/posts', {
	next: { tags: ['posts', 'collection'] },
})

// Combining options
const data5 = await fetch('https://api.example.com/articles', {
	next: {
		revalidate: 3600, // 1 hour
		tags: ['articles'],
	},
	headers: {
		Authorization: `Bearer ${token}`,
	},
})

// Request deduplication - Multiple identical requests in same render
// Only one actual fetch is made
async function getData() {
	const data = await fetch('https://api.example.com/shared')
	return data.json()
}

export default async function Page() {
	// These three calls only result in one network request
	const data1 = await getData()
	const data2 = await getData()
	const data3 = await getData()

	return <div>{data1.title}</div>
}
```

## revalidatePath() - On-Demand Revalidation

Purge cached data for a specific path on-demand.

```tsx
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function updatePost(id: string, data: any) {
	await fetch(`https://api.example.com/posts/${id}`, {
		method: 'PUT',
		body: JSON.stringify(data),
	})

	// Revalidate specific page
	revalidatePath(`/blog/${id}`)

	// Revalidate all blog pages
	revalidatePath('/blog', 'page')

	// Revalidate layout and all nested pages
	revalidatePath('/dashboard', 'layout')
}

// Route handler example
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
	const secret = request.nextUrl.searchParams.get('secret')
	const path = request.nextUrl.searchParams.get('path')

	if (secret !== process.env.REVALIDATE_SECRET) {
		return Response.json({ message: 'Invalid secret' }, { status: 401 })
	}

	if (path) {
		revalidatePath(path)
		return Response.json({ revalidated: true, path })
	}

	return Response.json({ message: 'Missing path' }, { status: 400 })
}

// Usage: POST /api/revalidate?secret=TOKEN&path=/blog/post-1
```

## revalidateTag() - Tag-Based Revalidation

Purge cached data by cache tags across multiple requests.

```tsx
// app/lib/data.ts
export async function getProducts() {
	const res = await fetch('https://api.example.com/products', {
		next: { tags: ['products'] },
	})
	return res.json()
}

export async function getProductById(id: string) {
	const res = await fetch(`https://api.example.com/products/${id}`, {
		next: { tags: ['products', `product-${id}`] },
	})
	return res.json()
}

// app/actions.ts
;('use server')

import { revalidateTag } from 'next/cache'

export async function createProduct(formData: FormData) {
	const product = {
		name: formData.get('name'),
		price: formData.get('price'),
	}

	await fetch('https://api.example.com/products', {
		method: 'POST',
		body: JSON.stringify(product),
	})

	// Revalidate all requests tagged with 'products'
	revalidateTag('products')
}

export async function updateProduct(id: string, data: any) {
	await fetch(`https://api.example.com/products/${id}`, {
		method: 'PUT',
		body: JSON.stringify(data),
	})

	// Revalidate specific product and all products list
	revalidateTag(`product-${id}`)
	revalidateTag('products')
}

// app/api/webhook/route.ts
import { revalidateTag } from 'next/cache'

export async function POST(request: Request) {
	const body = await request.json()

	if (body.event === 'product.updated') {
		revalidateTag('products')
		return Response.json({ revalidated: true })
	}

	return Response.json({ revalidated: false })
}
```

## generateMetadata() - Dynamic SEO Metadata

Generate dynamic metadata for SEO optimization based on route data.

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata({
	params,
}: {
	params: { slug: string }
}): Promise<Metadata> {
	const post = await fetch(`https://api.example.com/posts/${params.slug}`).then(
		res => res.json()
	)

	return {
		title: post.title,
		description: post.excerpt,
		keywords: post.tags,
		authors: [{ name: post.author.name }],
		openGraph: {
			title: post.title,
			description: post.excerpt,
			images: [post.coverImage],
			type: 'article',
			publishedTime: post.publishedAt,
			authors: [post.author.name],
		},
		twitter: {
			card: 'summary_large_image',
			title: post.title,
			description: post.excerpt,
			images: [post.coverImage],
		},
		alternates: {
			canonical: `https://example.com/blog/${params.slug}`,
		},
	}
}

export default async function BlogPost({
	params,
}: {
	params: { slug: string }
}) {
	const post = await fetch(`https://api.example.com/posts/${params.slug}`).then(
		res => res.json()
	)

	return (
		<article>
			<h1>{post.title}</h1>
			<p>{post.content}</p>
		</article>
	)
}

// Static metadata
// app/about/page.tsx
export const metadata: Metadata = {
	title: 'About Us',
	description: 'Learn more about our company',
	robots: {
		index: true,
		follow: true,
	},
}
```

## generateStaticParams() - Static Route Generation

Generate static routes at build time for dynamic segments.

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
	const posts = await fetch('https://api.example.com/posts').then(res =>
		res.json()
	)

	return posts.map((post: any) => ({
		slug: post.slug,
	}))
}

export default async function BlogPost({
	params,
}: {
	params: { slug: string }
}) {
	const post = await fetch(`https://api.example.com/posts/${params.slug}`).then(
		res => res.json()
	)

	return <article>{post.title}</article>
}

// app/products/[category]/[id]/page.tsx - Nested dynamic segments
export async function generateStaticParams() {
	const categories = await fetch('https://api.example.com/categories').then(
		res => res.json()
	)

	const paths = []
	for (const category of categories) {
		const products = await fetch(
			`https://api.example.com/products?category=${category.id}`
		).then(res => res.json())

		products.forEach((product: any) => {
			paths.push({
				category: category.slug,
				id: product.id,
			})
		})
	}

	return paths
}

export default async function ProductPage({
	params,
}: {
	params: { category: string; id: string }
}) {
	const product = await fetch(
		`https://api.example.com/products/${params.id}`
	).then(res => res.json())

	return <div>{product.name}</div>
}
```

## Route Handlers - API Routes

Create custom API endpoints using Web Request/Response APIs.

```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams
	const page = searchParams.get('page') || '1'

	const users = await fetch(`https://api.example.com/users?page=${page}`).then(
		res => res.json()
	)

	return NextResponse.json(users, { status: 200 })
}

export async function POST(request: NextRequest) {
	const body = await request.json()

	const newUser = await fetch('https://api.example.com/users', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}).then(res => res.json())

	return NextResponse.json(newUser, { status: 201 })
}

// app/api/users/[id]/route.ts - Dynamic route handlers
export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	const user = await fetch(`https://api.example.com/users/${params.id}`).then(
		res => res.json()
	)

	return NextResponse.json(user)
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	const updates = await request.json()

	const user = await fetch(`https://api.example.com/users/${params.id}`, {
		method: 'PATCH',
		body: JSON.stringify(updates),
	}).then(res => res.json())

	return NextResponse.json(user)
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	await fetch(`https://api.example.com/users/${params.id}`, {
		method: 'DELETE',
	})

	return NextResponse.json({ success: true }, { status: 204 })
}

// app/api/auth/route.ts - Headers, cookies, and redirects
import { cookies, headers } from 'next/headers'

export async function POST(request: NextRequest) {
	const body = await request.json()

	// Get headers
	const headersList = headers()
	const authorization = headersList.get('authorization')

	// Authenticate
	const session = await authenticate(body.email, body.password)

	if (!session) {
		return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
	}

	// Set cookie
	cookies().set('session', session.token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7, // 1 week
		path: '/',
	})

	return NextResponse.json({ success: true })
}
```

## Server Actions

Server-side mutations and form handling with progressive enhancement.

```tsx
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
	const title = formData.get('title') as string
	const content = formData.get('content') as string

	const post = await fetch('https://api.example.com/posts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title, content }),
	}).then(res => res.json())

	revalidatePath('/blog')
	redirect(`/blog/${post.slug}`)
}

export async function deletePost(id: string) {
	await fetch(`https://api.example.com/posts/${id}`, {
		method: 'DELETE',
	})

	revalidatePath('/blog')
}

export async function updatePost(id: string, formData: FormData) {
	const title = formData.get('title') as string
	const content = formData.get('content') as string

	await fetch(`https://api.example.com/posts/${id}`, {
		method: 'PUT',
		body: JSON.stringify({ title, content }),
	})

	revalidatePath(`/blog/${id}`)
}

// app/blog/new/page.tsx - Using Server Actions in forms
import { createPost } from '@/app/actions'

export default function NewPostPage() {
	return (
		<form action={createPost}>
			<input type='text' name='title' placeholder='Title' required />
			<textarea name='content' placeholder='Content' required />
			<button type='submit'>Create Post</button>
		</form>
	)
}

// app/components/delete-button.tsx - Client Component using Server Actions
;('use client')

import { deletePost } from '@/app/actions'
import { useTransition } from 'react'

export function DeleteButton({ postId }: { postId: string }) {
	const [isPending, startTransition] = useTransition()

	const handleDelete = () => {
		if (confirm('Are you sure?')) {
			startTransition(() => deletePost(postId))
		}
	}

	return (
		<button onClick={handleDelete} disabled={isPending}>
			{isPending ? 'Deleting...' : 'Delete'}
		</button>
	)
}

// app/actions.ts - Error handling in Server Actions
export async function createUser(formData: FormData) {
	try {
		const email = formData.get('email') as string

		const user = await fetch('https://api.example.com/users', {
			method: 'POST',
			body: JSON.stringify({ email }),
		})

		if (!user.ok) {
			return { error: 'Failed to create user' }
		}

		revalidatePath('/users')
		return { success: true }
	} catch (error) {
		return { error: 'An error occurred' }
	}
}
```

## useRouter() - Programmatic Navigation

Client-side router hook for programmatic navigation in Client Components.

```tsx
'use client'

import { useRouter } from 'next/navigation'

export default function NavigationExample() {
	const router = useRouter()

	const handleNavigate = () => {
		// Push new route
		router.push('/dashboard')

		// Replace current route (no history entry)
		router.replace('/login')

		// Navigate back
		router.back()

		// Navigate forward
		router.forward()

		// Refresh current route (re-fetch Server Components)
		router.refresh()

		// Prefetch route
		router.prefetch('/dashboard')
	}

	return (
		<div>
			<button onClick={() => router.push('/dashboard')}>Go to Dashboard</button>

			<button onClick={() => router.push('/search?q=nextjs')}>
				Search Next.js
			</button>

			<button
				onClick={() => {
					// Programmatic navigation after async operation
					fetch('/api/submit', { method: 'POST' })
						.then(() => router.push('/success'))
						.catch(() => router.push('/error'))
				}}
			>
				Submit
			</button>
		</div>
	)
}

// Conditional navigation
export function AuthenticatedButton() {
	const router = useRouter()

	const handleClick = async () => {
		const isAuthenticated = await checkAuth()

		if (isAuthenticated) {
			router.push('/dashboard')
		} else {
			router.push('/login')
		}
	}

	return <button onClick={handleClick}>Continue</button>
}
```

## usePathname() and useSearchParams()

Hooks for reading current URL pathname and search parameters in Client Components.

```tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationInfo() {
	const pathname = usePathname()
	const searchParams = useSearchParams()

	// Get query parameters
	const search = searchParams.get('search')
	const page = searchParams.get('page')
	const category = searchParams.get('category')

	return (
		<div>
			<p>Current path: {pathname}</p>
			<p>Search: {search}</p>
			<p>Page: {page || '1'}</p>
			<p>Category: {category || 'all'}</p>
		</div>
	)
}

// Active link highlighting
export function NavLink({
	href,
	children,
}: {
	href: string
	children: React.ReactNode
}) {
	const pathname = usePathname()
	const isActive = pathname === href

	return (
		<a
			href={href}
			className={isActive ? 'active' : ''}
			style={{ fontWeight: isActive ? 'bold' : 'normal' }}
		>
			{children}
		</a>
	)
}

// Search functionality with URL sync
export function SearchBox() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [query, setQuery] = useState(searchParams.get('q') || '')

	const handleSearch = (e: FormEvent) => {
		e.preventDefault()

		// Update URL with new search query
		const params = new URLSearchParams(searchParams.toString())
		if (query) {
			params.set('q', query)
		} else {
			params.delete('q')
		}

		router.push(`/search?${params.toString()}`)
	}

	return (
		<form onSubmit={handleSearch}>
			<input
				value={query}
				onChange={e => setQuery(e.target.value)}
				placeholder='Search...'
			/>
			<button type='submit'>Search</button>
		</form>
	)
}
```

## useParams() - Dynamic Route Parameters

Access dynamic route parameters in Client Components.

```tsx
'use client'

import { useParams } from 'next/navigation'

// app/blog/[slug]/page.tsx
export function BlogPostClient() {
	const params = useParams<{ slug: string }>()

	return <div>Viewing post: {params.slug}</div>
}

// app/shop/[category]/[productId]/page.tsx
export function ProductDetails() {
	const params = useParams<{ category: string; productId: string }>()

	return (
		<div>
			<p>Category: {params.category}</p>
			<p>Product ID: {params.productId}</p>
		</div>
	)
}

// app/[locale]/products/[id]/page.tsx
export function InternationalizedProduct() {
	const params = useParams<{ locale: string; id: string }>()

	const locale = params.locale // 'en', 'fr', etc.
	const productId = params.id

	return (
		<div>
			<p>Locale: {locale}</p>
			<p>Product: {productId}</p>
		</div>
	)
}

// Catch-all routes
// app/docs/[...slug]/page.tsx
export function DocsPage() {
	const params = useParams<{ slug: string[] }>()

	// URL: /docs/getting-started/installation
	// params.slug = ['getting-started', 'installation']
	const path = params.slug.join('/')

	return <div>Docs path: {path}</div>
}
```

## cookies() - Cookie Management

Read and write HTTP cookies in Server Components, Route Handlers, and Server Actions.

```tsx
// app/page.tsx - Server Component
import { cookies } from 'next/headers'

export default async function HomePage() {
	const cookieStore = cookies()

	// Get a cookie
	const theme = cookieStore.get('theme')
	console.log('Theme:', theme?.value)

	// Get all cookies
	const allCookies = cookieStore.getAll()

	// Check if cookie exists
	const hasSession = cookieStore.has('session')

	return (
		<div data-theme={theme?.value}>
			<h1>Welcome</h1>
			<p>Cookies: {allCookies.length}</p>
		</div>
	)
}

// app/api/auth/login/route.ts - Setting cookies
import { cookies } from 'next/headers'

export async function POST(request: Request) {
	const { email, password } = await request.json()

	const session = await authenticate(email, password)

	cookies().set('session', session.token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7, // 1 week in seconds
		path: '/',
	})

	cookies().set('user-id', session.userId, {
		maxAge: 60 * 60 * 24 * 30, // 30 days
	})

	return Response.json({ success: true })
}

// app/api/auth/logout/route.ts - Deleting cookies
import { cookies } from 'next/headers'

export async function POST() {
	cookies().delete('session')
	cookies().delete('user-id')

	return Response.json({ success: true })
}

// app/actions.ts - Server Actions with cookies
;('use server')

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function savePreferences(formData: FormData) {
	const theme = formData.get('theme') as string
	const language = formData.get('language') as string

	cookies().set('theme', theme, { maxAge: 60 * 60 * 24 * 365 })
	cookies().set('language', language, { maxAge: 60 * 60 * 24 * 365 })

	redirect('/settings')
}
```

## headers() - Request Headers

Read HTTP request headers in Server Components and Route Handlers.

```tsx
// app/page.tsx - Server Component
import { headers } from 'next/headers'

export default async function HomePage() {
	const headersList = headers()

	// Get specific header
	const userAgent = headersList.get('user-agent')
	const referer = headersList.get('referer')
	const authorization = headersList.get('authorization')

	// Get all headers as entries
	const allHeaders = Array.from(headersList.entries())

	return (
		<div>
			<p>User Agent: {userAgent}</p>
			<p>Referer: {referer || 'Direct visit'}</p>
		</div>
	)
}

// app/api/protected/route.ts - API authentication
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
	const headersList = headers()
	const authorization = headersList.get('authorization')

	if (!authorization || !authorization.startsWith('Bearer ')) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const token = authorization.split(' ')[1]
	const isValid = await verifyToken(token)

	if (!isValid) {
		return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
	}

	const data = await fetchProtectedData()
	return NextResponse.json(data)
}

// app/api/geo/route.ts - Geolocation from headers
import { headers } from 'next/headers'

export async function GET() {
	const headersList = headers()

	// Headers from CDN/proxy (e.g., Vercel)
	const country = headersList.get('x-vercel-ip-country')
	const city = headersList.get('x-vercel-ip-city')
	const region = headersList.get('x-vercel-ip-country-region')

	return Response.json({
		country,
		city,
		region,
	})
}
```

## redirect() and permanentRedirect()

Server-side redirects from Server Components, Route Handlers, and Server Actions.

```tsx
// app/dashboard/page.tsx - Redirect from Server Component
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function DashboardPage() {
	const session = cookies().get('session')

	if (!session) {
		redirect('/login')
	}

	return <div>Dashboard</div>
}

// app/actions.ts - Redirect from Server Action
;('use server')

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
	const post = await savePost(formData)

	revalidatePath('/blog')
	redirect(`/blog/${post.slug}`)
}

// app/api/auth/callback/route.ts - Redirect from Route Handler
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url)
	const code = searchParams.get('code')

	if (!code) {
		redirect('/login?error=missing_code')
	}

	const session = await exchangeCodeForSession(code)

	if (!session) {
		redirect('/login?error=invalid_code')
	}

	// Set session cookie...
	redirect('/dashboard')
}

// Permanent redirect (308)
import { permanentRedirect } from 'next/navigation'

export default async function OldPage() {
	// Use for permanent URL changes (affects SEO)
	permanentRedirect('/new-page')
}

// Conditional redirects
export default async function ProfilePage({
	params,
}: {
	params: { id: string }
}) {
	const user = await getUser(params.id)

	if (!user) {
		redirect('/404')
	}

	if (user.suspended) {
		redirect('/suspended')
	}

	return <Profile user={user} />
}
```

## notFound() - 404 Error Handling

Trigger the not-found.js UI for missing resources.

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation'

export default async function BlogPost({
	params,
}: {
	params: { slug: string }
}) {
	const post = await fetch(`https://api.example.com/posts/${params.slug}`).then(
		res => (res.ok ? res.json() : null)
	)

	if (!post) {
		notFound() // Triggers app/blog/not-found.tsx
	}

	return (
		<article>
			<h1>{post.title}</h1>
			<p>{post.content}</p>
		</article>
	)
}

// app/blog/not-found.tsx
export default function BlogNotFound() {
	return (
		<div>
			<h2>Blog Post Not Found</h2>
			<p>The blog post you're looking for doesn't exist.</p>
			<Link href='/blog'>← Back to Blog</a>
		</div>
	)
}

// app/not-found.tsx - Global not-found page
export default function NotFound() {
	return (
		<div>
			<h1>404 - Page Not Found</h1>
			<p>Sorry, we couldn't find what you're looking for.</p>
			<Link href='/'>Go Home</a>
		</div>
	)
}

// app/products/[id]/page.tsx
import { notFound } from 'next/navigation'

export default async function ProductPage({
	params,
}: {
	params: { id: string }
}) {
	const product = await getProduct(params.id)

	if (!product) {
		notFound()
	}

	if (!product.published) {
		notFound() // Can be used for unpublished content
	}

	return <ProductDetails product={product} />
}
```

## Loading UI and Streaming

Create instant loading states with React Suspense and streaming.

```tsx
// app/dashboard/loading.tsx - Route segment loading UI
export default function Loading() {
	return (
		<div className='loading-skeleton'>
			<div className='skeleton-header' />
			<div className='skeleton-content' />
		</div>
	)
}

// app/dashboard/page.tsx - Automatic streaming
export default async function DashboardPage() {
	const data = await fetchDashboardData() // Automatically shows loading.tsx

	return <Dashboard data={data} />
}

// Manual Suspense boundaries
import { Suspense } from 'react'

export default function Page() {
	return (
		<div>
			{/* This renders immediately */}
			<h1>Dashboard</h1>

			{/* This shows fallback while loading */}
			<Suspense fallback={<Skeleton />}>
				<SlowComponent />
			</Suspense>

			{/* Multiple independent suspense boundaries */}
			<div className='grid'>
				<Suspense fallback={<CardSkeleton />}>
					<StatsCard />
				</Suspense>

				<Suspense fallback={<CardSkeleton />}>
					<RecentActivity />
				</Suspense>

				<Suspense fallback={<ChartSkeleton />}>
					<AnalyticsChart />
				</Suspense>
			</div>
		</div>
	)
}

// Components that trigger Suspense
async function SlowComponent() {
	const data = await fetch('https://slow-api.example.com/data').then(res =>
		res.json()
	)

	return <div>{data.title}</div>
}

async function StatsCard() {
	await new Promise(resolve => setTimeout(resolve, 1000))
	const stats = await fetchStats()

	return (
		<div>
			<h3>Total Users</h3>
			<p>{stats.users}</p>
		</div>
	)
}

// Nested suspense for granular loading
export default function ComplexPage() {
	return (
		<Suspense fallback={<PageSkeleton />}>
			<Header />

			<Suspense fallback={<SidebarSkeleton />}>
				<Sidebar />
			</Suspense>

			<main>
				<Suspense fallback={<ContentSkeleton />}>
					<MainContent />

					<Suspense fallback={<CommentsSkeleton />}>
						<Comments />
					</Suspense>
				</Suspense>
			</main>
		</Suspense>
	)
}
```

## Error Handling

Error boundaries for catching and handling errors in route segments.

```tsx
// app/dashboard/error.tsx
'use client' // Error components must be Client Components

import { useEffect } from 'react'

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		// Log error to error reporting service
		console.error('Dashboard error:', error)
	}, [error])

	return (
		<div>
			<h2>Something went wrong!</h2>
			<p>{error.message}</p>
			<button onClick={reset}>Try again</button>
		</div>
	)
}

// app/error.tsx - Global error boundary
;('use client')

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<html>
			<body>
				<h2>Application Error</h2>
				<p>Something went wrong. Please try again later.</p>
				<button onClick={reset}>Retry</button>
			</body>
		</html>
	)
}

// app/global-error.tsx - Root error boundary (catches layout errors)
;('use client')

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<html>
			<body>
				<h2>Critical Error</h2>
				<p>A critical error occurred. Please refresh the page.</p>
				<button onClick={() => window.location.reload()}>Refresh</button>
			</body>
		</html>
	)
}

// Custom error handling in components
// app/products/page.tsx
export default async function ProductsPage() {
	try {
		const products = await fetch('https://api.example.com/products').then(
			res => {
				if (!res.ok) throw new Error('Failed to fetch products')
				return res.json()
			}
		)

		return <ProductList products={products} />
	} catch (error) {
		// This error will be caught by the nearest error.tsx
		throw error
	}
}
```

## Middleware

Request middleware for authentication, redirects, and request modification.

```tsx
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname

	// Authentication check
	const session = request.cookies.get('session')

	if (pathname.startsWith('/dashboard') && !session) {
		return NextResponse.redirect(new URL('/login', request.url))
	}

	// Add custom header
	const response = NextResponse.next()
	response.headers.set('x-custom-header', 'value')

	return response
}

export const config = {
	matcher: ['/dashboard/:path*', '/api/:path*'],
}

// Advanced middleware patterns
export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	// 1. Authentication redirect
	if (pathname.startsWith('/admin')) {
		const token = request.cookies.get('admin-token')
		if (!token) {
			return NextResponse.redirect(new URL('/admin/login', request.url))
		}
	}

	// 2. Geolocation redirect
	const country = request.geo?.country || 'US'
	if (pathname === '/' && country !== 'US') {
		return NextResponse.redirect(
			new URL(`/${country.toLowerCase()}`, request.url)
		)
	}

	// 3. A/B testing
	const bucket = request.cookies.get('bucket')
	if (!bucket) {
		const response = NextResponse.next()
		response.cookies.set('bucket', Math.random() > 0.5 ? 'a' : 'b')
		return response
	}

	// 4. Request rewriting
	if (pathname.startsWith('/blog')) {
		return NextResponse.rewrite(
			new URL(`/articles${pathname.slice(5)}`, request.url)
		)
	}

	// 5. Add custom headers
	const response = NextResponse.next()
	response.headers.set('x-pathname', pathname)
	response.headers.set('x-country', country)

	return response
}

// Matcher configuration
export const config = {
	matcher: [
		// Match all paths except static files and _next
		'/((?!_next/static|_next/image|favicon.ico).*)',

		// Or specific paths
		// '/dashboard/:path*',
		// '/api/:path*',
	],
}

// Multiple middleware logic
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function authMiddleware(request: NextRequest) {
	const session = request.cookies.get('session')
	if (!session) {
		return NextResponse.redirect(new URL('/login', request.url))
	}
	return null
}

async function rateLimitMiddleware(request: NextRequest) {
	const ip = request.ip || 'unknown'
	const isRateLimited = await checkRateLimit(ip)

	if (isRateLimited) {
		return new NextResponse('Too Many Requests', { status: 429 })
	}
	return null
}

export async function middleware(request: NextRequest) {
	// Run auth middleware
	if (request.nextUrl.pathname.startsWith('/dashboard')) {
		const authResult = await authMiddleware(request)
		if (authResult) return authResult
	}

	// Run rate limit middleware
	if (request.nextUrl.pathname.startsWith('/api')) {
		const rateLimitResult = await rateLimitMiddleware(request)
		if (rateLimitResult) return rateLimitResult
	}

	return NextResponse.next()
}
```

## Route Segment Config

Configure route segment behavior with exports.

```tsx
// app/page.tsx - Static rendering configuration
export const dynamic = 'force-static' // 'auto' | 'force-dynamic' | 'error' | 'force-static'
export const revalidate = 60 // Revalidate every 60 seconds
export const fetchCache = 'default-cache' // Force caching for fetch requests
export const runtime = 'nodejs' // 'edge' | 'nodejs'
export const preferredRegion = 'auto' // 'auto' | 'global' | 'home' | ['iad1', 'sfo1']

export default function Page() {
	return <div>Static Page</div>
}

// app/api/route.ts - Dynamic API route
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function GET() {
	return Response.json({ timestamp: Date.now() })
}

// app/blog/page.tsx - ISR configuration
export const revalidate = 3600 // Revalidate every hour

export default async function BlogPage() {
	const posts = await fetch('https://api.example.com/posts').then(res =>
		res.json()
	)

	return <PostList posts={posts} />
}

// app/dashboard/page.tsx - Dynamic rendering
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

export default async function DashboardPage() {
	// Always fetches fresh data
	const data = await fetch('https://api.example.com/dashboard')
	return <Dashboard data={data} />
}

// app/profile/[id]/page.tsx - Mixed configuration
export const dynamicParams = true // Allow dynamic params not in generateStaticParams
export const revalidate = 60

export async function generateStaticParams() {
	return [{ id: '1' }, { id: '2' }]
}

export default async function ProfilePage({
	params,
}: {
	params: { id: string }
}) {
	const user = await fetch(`https://api.example.com/users/${params.id}`)
	return <Profile user={user} />
}

// Edge runtime example
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
	const geo = request.headers.get('x-vercel-ip-country')
	return Response.json({ country: geo })
}
```

## next.config.js Configuration

Configure Next.js application settings.

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
	// React strict mode
	reactStrictMode: true,

	// Image optimization
	images: {
		domains: ['example.com', 'cdn.example.com'],
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**.example.com',
				pathname: '/images/**',
			},
		],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		formats: ['image/webp'],
	},

	// Headers
	async headers() {
		return [
			{
				source: '/api/:path*',
				headers: [
					{ key: 'Access-Control-Allow-Origin', value: '*' },
					{ key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
				],
			},
		]
	},

	// Redirects
	async redirects() {
		return [
			{
				source: '/old-blog/:slug',
				destination: '/blog/:slug',
				permanent: true,
			},
			{
				source: '/docs',
				destination: '/docs/getting-started',
				permanent: false,
			},
		]
	},

	// Rewrites
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: 'https://api.example.com/:path*',
			},
			{
				source: '/blog/:slug',
				destination: '/posts/:slug',
			},
		]
	},

	// Environment variables
	env: {
		CUSTOM_KEY: 'value',
	},

	// Compiler options
	compiler: {
		removeConsole: process.env.NODE_ENV === 'production',
	},

	// Experimental features
	experimental: {
		serverActions: true,
		typedRoutes: true,
	},

	// Webpack customization
	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
			}
		}
		return config
	},
}

module.exports = nextConfig
```

## Metadata Files

Generate metadata files for SEO and app manifests.

```tsx
// app/sitemap.ts - Dynamic sitemap generation
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const posts = await fetch('https://api.example.com/posts').then(res =>
		res.json()
	)

	const postEntries: MetadataRoute.Sitemap = posts.map(post => ({
		url: `https://example.com/blog/${post.slug}`,
		lastModified: post.updatedAt,
		changeFrequency: 'weekly',
		priority: 0.8,
	}))

	return [
		{
			url: 'https://example.com',
			lastModified: new Date(),
			changeFrequency: 'yearly',
			priority: 1,
		},
		{
			url: 'https://example.com/about',
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.8,
		},
		...postEntries,
	]
}

// app/robots.ts - Robots.txt generation
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: ['/admin/', '/api/'],
			},
			{
				userAgent: 'Googlebot',
				allow: '/',
				disallow: '/private/',
			},
		],
		sitemap: 'https://example.com/sitemap.xml',
	}
}

// app/manifest.ts - Web app manifest
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'My Next.js App',
		short_name: 'NextApp',
		description: 'A Next.js application',
		start_url: '/',
		display: 'standalone',
		background_color: '#ffffff',
		theme_color: '#000000',
		icons: [
			{
				src: '/icon-192.png',
				sizes: '192x192',
				type: 'image/png',
			},
			{
				src: '/icon-512.png',
				sizes: '512x512',
				type: 'image/png',
			},
		],
	}
}

// app/opengraph-image.tsx - Dynamic OG image
import { ImageResponse } from 'next/server'

export const runtime = 'edge'
export const alt = 'About page'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
	return new ImageResponse(
		(
			<div
				style={{
					fontSize: 128,
					background: 'white',
					width: '100%',
					height: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				My Next.js App
			</div>
		),
		{
			...size,
		}
	)
}
```

---

## Summary

Next.js is a comprehensive React framework designed for building production-ready full-stack web applications with optimal performance and developer experience. Its core strength lies in the App Router architecture which leverages React Server Components by default, enabling automatic code splitting, server-side rendering, and static site generation without complex configuration. The framework provides a file-system based routing system where folders and special files define routes, layouts, loading states, and error boundaries, making application structure intuitive and maintainable. Built-in optimizations for images, fonts, and scripts ensure excellent Core Web Vitals scores, while the extended fetch API with automatic caching, request memoization, and incremental static regeneration provides flexible data fetching strategies for any use case.

The framework excels in scenarios ranging from static marketing sites to dynamic web applications with real-time data. Server Actions enable form handling and mutations without writing API routes, providing type-safety and progressive enhancement. The middleware system allows request interception for authentication, geolocation redirects, A/B testing, and custom headers. Route Handlers create RESTful APIs using Web standards, while the streaming architecture with React Suspense delivers instant loading states and granular content updates. Integration patterns include external API proxying through rewrites, dynamic metadata generation for SEO, webhook handling for real-time updates, and edge runtime support for globally distributed compute. Whether building e-commerce platforms, content management systems, dashboards, or marketing sites, Next.js provides the tools and patterns needed for scalable, performant web applications with excellent developer ergonomics.
