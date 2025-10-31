# Google OAuth Authentication Setup Guide

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Step 1: Install Dependencies](#step-1-install-dependencies)
- [Step 2: Google Cloud Console Setup](#step-2-google-cloud-console-setup)
- [Step 3: Supabase Dashboard Configuration](#step-3-supabase-dashboard-configuration)
- [Step 4: Database Security Setup](#step-4-database-security-setup)
- [Step 5: Environment Variables](#step-5-environment-variables)
- [Step 6: Code Implementation](#step-6-code-implementation)
- [Step 7: Testing](#step-7-testing)
- [Troubleshooting](#troubleshooting)
- [Implementation Checklist](#implementation-checklist)

---

## Overview

This guide implements **Google OAuth authentication** with **email domain restriction** (`@levhaolam.com` only) for the AI Agent Statistics Dashboard.

**Key Features:**
- ✅ Google OAuth sign-in (PKCE flow - most secure)
- ✅ Email domain restriction (only @levhaolam.com)
- ✅ Server-side session management with httpOnly cookies
- ✅ Automatic token refresh
- ✅ Protected routes via middleware
- ✅ User profile display with avatar
- ✅ Localized (English & Russian)

---

## Architecture

### Authentication Flow (PKCE)

```
1. User visits /dashboard
   ↓
2. Middleware checks session → No session found
   ↓
3. Redirect to /login
   ↓
4. User clicks "Sign in with Google"
   ↓
5. Redirect to Google OAuth (with hd=levhaolam.com hint)
   ↓
6. User authenticates on Google
   ↓
7. Google redirects to /auth/callback?code=XXX
   ↓
8. Server exchanges code for session (PKCE)
   ↓
9. Server checks email domain (@levhaolam.com)
   ↓
10a. ✅ Valid domain → Save session → Redirect to /dashboard
10b. ❌ Invalid domain → Sign out → Redirect to /login?error=unauthorized_domain
   ↓
11. User on /dashboard, session stored in httpOnly cookies
   ↓
12. Middleware validates session on every protected route request
```

### Triple Layer Security

1. **Google OAuth Hint** (UX level): `hd=levhaolam.com` parameter shows only company accounts
2. **Application Check** (Backend): `/auth/callback` validates email domain
3. **Database Trigger** (Database): Postgres trigger blocks non-@levhaolam.com emails

---

## Prerequisites

Before starting, ensure you have:

- ✅ Supabase project with admin access
- ✅ Google Cloud Console access (or ability to create OAuth credentials)
- ✅ Production domain: `https://ai-agents-stats.vercel.app`
- ✅ Node.js 18+ and npm installed
- ✅ Access to `.env.local` file

---

## Step 1: Install Dependencies

Check if `@supabase/ssr` is installed:

```bash
npm list @supabase/ssr
```

If not installed, add it:

```bash
npm install @supabase/ssr
```

**Current dependencies (from package.json):**
- `@supabase/supabase-js: ^2.76.1` ✅ (already installed)
- `@supabase/ssr` - **NEEDS TO BE ADDED**

---

## Step 2: Google Cloud Console Setup

### 2.1 Create OAuth 2.0 Credentials

1. **Go to Google Cloud Console**:
   - Navigate to: https://console.cloud.google.com/
   - Select your project or create a new one

2. **Enable Google+ API** (if not already enabled):
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

3. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - User Type: **Internal** (if you have Google Workspace) or **External**
   - App name: `AI Agent Statistics Dashboard`
   - User support email: your email
   - Authorized domains: `levhaolam.com`, `vercel.app`
   - Developer contact: your email
   - Scopes: Add the following:
     - `openid`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Save and Continue

4. **Create OAuth Client ID**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `AI Agent Stats - Production`

   **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://ai-agents-stats.vercel.app
   https://[your-supabase-project-ref].supabase.co
   ```

   **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/callback
   https://ai-agents-stats.vercel.app/auth/callback
   https://[your-supabase-project-ref].supabase.co/auth/v1/callback
   ```

   - Click "Create"
   - **Save the Client ID and Client Secret** (you'll need them for Supabase)

### 2.2 Important Notes

- Replace `[your-supabase-project-ref]` with your actual Supabase project reference (found in Supabase Dashboard → Settings → API)
- For Google Workspace (internal apps), you can restrict the OAuth consent screen to only @levhaolam.com users
- Keep Client Secret secure - never commit to git

---

## Step 3: Supabase Dashboard Configuration

⚠️ **YOU NEED ADMIN ACCESS FOR THIS STEP**

### 3.1 Enable Google Provider

1. **Open Supabase Dashboard**:
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Go to Authentication → Providers**:
   - Find "Google" in the list
   - Click to expand

3. **Configure Google Provider**:
   - **Enabled**: Toggle ON ✅
   - **Client ID**: Paste from Google Cloud Console (Step 2.1)
   - **Client Secret**: Paste from Google Cloud Console (Step 2.1)
   - **Redirect URL**: This is auto-generated by Supabase
     - Copy this URL: `https://[your-project-ref].supabase.co/auth/v1/callback`
     - **Make sure this matches the redirect URI in Google Cloud Console!**
   - Click "Save"

### 3.2 Configure Site URL and Redirect URLs

1. **Go to Authentication → URL Configuration**:

   **Site URL**:
   ```
   https://ai-agents-stats.vercel.app
   ```

   **Redirect URLs** (Add these):
   ```
   http://localhost:3000/auth/callback
   https://ai-agents-stats.vercel.app/auth/callback
   https://ai-agents-stats.vercel.app/*
   ```

2. **Additional Configuration** (recommended):
   - **Email Confirmation**: Disable (not needed for Google OAuth)
   - **Enable Email Confirmations**: OFF
   - **Secure email change**: ON (optional)
   - **Mailer autoconfirm**: ON (for Google OAuth users)

### 3.3 Get Supabase Credentials

You'll need these for `.env.local`:

1. **Project URL**:
   - Settings → API → Project URL
   - Example: `https://abcdefghijk.supabase.co`

2. **Anon Key**:
   - Settings → API → Project API keys → `anon` `public`
   - This is safe to expose on client

3. **Service Role Key** (optional, if using RLS):
   - Settings → API → Project API keys → `service_role` `secret`
   - ⚠️ NEVER expose this on client!

---

## Step 4: Database Security Setup

### 4.1 Create Email Domain Validation Trigger

This trigger ensures only @levhaolam.com emails can authenticate, even if someone bypasses the application logic.

**Execute this SQL in Supabase Dashboard → SQL Editor:**

```sql
-- Function to check email domain on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  allowed_domain TEXT := 'levhaolam.com';
BEGIN
  -- Check if email ends with allowed domain
  IF NEW.email NOT LIKE '%@' || allowed_domain THEN
    RAISE EXCEPTION 'Authentication failed: Only % email addresses are allowed', '@' || allowed_domain;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger that fires before inserting into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
```

### 4.2 Verify Trigger

Test the trigger:

```sql
-- This should FAIL (different domain)
INSERT INTO auth.users (email, raw_user_meta_data)
VALUES ('test@gmail.com', '{}');

-- This should SUCCEED
INSERT INTO auth.users (email, raw_user_meta_data)
VALUES ('test@levhaolam.com', '{}');

-- Clean up test
DELETE FROM auth.users WHERE email = 'test@levhaolam.com';
```

---

## Step 5: Environment Variables

### 5.1 Update `.env.local`

Add this variable to your `.env.local` file:

```bash
# Existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Service Role Key (if using RLS bypass)
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NEW: Allowed email domain for authentication
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=levhaolam.com
```

### 5.2 Update `.env.local.example`

Update the example file for other developers:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Service Role Key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication: Allowed email domain (e.g., levhaolam.com)
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=levhaolam.com
```

### 5.3 Vercel Environment Variables

**For production deployment**, add these to Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` = `levhaolam.com`
   - `SUPABASE_SERVICE_ROLE_KEY` (if needed)

---

## Step 6: Code Implementation

### 6.1 File Structure

Here's what needs to be created/updated:

```
ai_agent_stats/
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # UPDATE: Add auth support
│   │   ├── server.ts              # UPDATE: Add cookies support
│   │   └── middleware.ts          # NEW: Helper for middleware
│   └── auth/
│       └── check-domain.ts        # NEW: Domain validation utility
├── constants/
│   └── allowed-domains.ts         # NEW: Allowed email domains
├── app/
│   └── [locale]/
│       ├── login/
│       │   └── page.tsx           # NEW: Login page
│       ├── auth/
│       │   ├── callback/
│       │   │   └── route.ts       # NEW: OAuth callback handler
│       │   └── signout/
│       │       └── route.ts       # NEW: Sign out handler
│       └── (analytics)/
│           └── layout.tsx         # UPDATE: Optional - check auth
├── components/
│   └── app-sidebar.tsx            # UPDATE: Add user menu
├── messages/
│   ├── en.json                    # UPDATE: Add auth translations
│   └── ru.json                    # UPDATE: Add auth translations
├── middleware.ts                  # UPDATE: Add auth check
├── .env.local.example             # UPDATE: Add new variable
└── package.json                   # UPDATE: Add @supabase/ssr
```

### 6.2 Constants - Allowed Domains

**File**: `constants/allowed-domains.ts` (NEW)

```typescript
/**
 * Allowed email domains for authentication
 * Only users with these email domains can access the application
 */

// Get from environment variable or use default
const envDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN

export const ALLOWED_DOMAINS = envDomain ? [envDomain] : ['levhaolam.com']

/**
 * Check if an email is from an allowed domain
 */
export function isAllowedDomain(email: string): boolean {
  if (!email) return false

  const emailLower = email.toLowerCase()
  return ALLOWED_DOMAINS.some(domain =>
    emailLower.endsWith(`@${domain.toLowerCase()}`)
  )
}

/**
 * Get display string for allowed domains
 */
export function getAllowedDomainsDisplay(): string {
  return ALLOWED_DOMAINS.map(d => `@${d}`).join(', ')
}
```

### 6.3 Auth Utility - Domain Check

**File**: `lib/auth/check-domain.ts` (NEW)

```typescript
import { ALLOWED_DOMAINS, isAllowedDomain } from '@/constants/allowed-domains'
import type { User } from '@supabase/supabase-js'

/**
 * Validate user's email domain
 * @throws Error if domain is not allowed
 */
export function validateUserDomain(user: User | null): void {
  if (!user) {
    throw new Error('No user provided for domain validation')
  }

  if (!user.email) {
    throw new Error('User email is missing')
  }

  if (!isAllowedDomain(user.email)) {
    throw new Error(
      `Email domain not allowed. Only ${ALLOWED_DOMAINS.map(d => `@${d}`).join(', ')} addresses are permitted.`
    )
  }
}

/**
 * Check if user has valid domain (returns boolean)
 */
export function hasValidDomain(user: User | null): boolean {
  if (!user?.email) return false
  return isAllowedDomain(user.email)
}
```

### 6.4 Supabase Client - Browser (UPDATE)

**File**: `lib/supabase/client.ts`

Replace the entire file with:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

/**
 * Create Supabase client for browser (Client Components)
 *
 * Features:
 * - Authentication with session persistence
 * - Auto-refresh tokens
 * - Real-time subscriptions
 * - TypeScript types from Database schema
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

/**
 * Helper to check Supabase connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('ai_human_comparison').select('id').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase connection error:', error)
    return false
  }
}
```

### 6.5 Supabase Server Client (UPDATE)

**File**: `lib/supabase/server.ts`

Replace the entire file with:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

/**
 * Create Supabase client for server (Server Components, Server Actions, Route Handlers)
 *
 * Features:
 * - Session from cookies
 * - Supports authentication
 * - Cookie-based session management
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
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

/**
 * Create Supabase client with service role key (bypasses RLS)
 * ⚠️ USE WITH CAUTION - Only for server-side operations that need full access
 */
export async function createServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. This is required for service client.'
    )
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Can be ignored
          }
        },
      },
    }
  )
}
```

### 6.6 Supabase Middleware Helper (NEW)

**File**: `lib/supabase/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'
import { hasValidDomain } from '@/lib/auth/check-domain'

/**
 * Update session in middleware
 * - Refreshes auth tokens if needed
 * - Validates user email domain
 * - Returns response with updated cookies and user
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  // Validate email domain if user exists
  if (user && !hasValidDomain(user)) {
    // Sign out user with invalid domain
    await supabase.auth.signOut()

    // Redirect to login with error
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'unauthorized_domain')

    return {
      response: NextResponse.redirect(url),
      user: null,
    }
  }

  return {
    response: supabaseResponse,
    user,
  }
}
```

### 6.7 Root Middleware (UPDATE)

**File**: `middleware.ts`

Replace the entire file with:

```typescript
import { updateSession } from '@/lib/supabase/middleware'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { type NextRequest } from 'next/server'

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Public paths that don't require authentication
 */
const PUBLIC_PATHS = ['/', '/login', '/docs', '/auth/callback', '/auth/signout']

/**
 * Check if path is public (doesn't require auth)
 */
function isPublicPath(pathname: string): boolean {
  // Remove locale prefix (e.g., /en/login -> /login)
  const pathWithoutLocale = pathname.replace(/^\/(ru|en)/, '') || '/'

  return PUBLIC_PATHS.some(path =>
    pathWithoutLocale === path || pathWithoutLocale.startsWith(path + '/')
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Step 1: Update session (refresh tokens if needed, validate domain)
  const { response, user } = await updateSession(request)

  // Step 2: Check if path requires authentication
  const isPublic = isPublicPath(pathname)

  // Step 3: Handle authentication logic
  if (!isPublic && !user) {
    // Protected path but no user - redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return intlMiddleware(request)
  }

  if (pathname.includes('/login') && user) {
    // Already logged in, redirect to dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return intlMiddleware(request)
  }

  // Step 4: Apply intl middleware for localization
  return intlMiddleware(request)
}

export const config = {
  // Match all pathnames except static files
  matcher: [
    '/',
    '/(ru|en)/:path*',
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
}
```

### 6.8 Login Page (NEW)

**File**: `app/[locale]/login/page.tsx`

```typescript
'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getAllowedDomainsDisplay } from '@/constants/allowed-domains'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { IconBrandGoogle, IconAlertCircle } from '@tabler/icons-react'

export default function LoginPage() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const redirect = searchParams.get('redirect') || '/dashboard'
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          queryParams: {
            hd: process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'levhaolam.com',
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error('Login error:', error)
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setIsLoading(false)
    }
  }

  const getErrorMessage = () => {
    switch (error) {
      case 'unauthorized_domain':
        return t('errors.unauthorizedDomain', { domain: getAllowedDomainsDisplay() })
      case 'no_code':
        return t('errors.noCode')
      default:
        return error ? t('errors.generic') : null
    }
  }

  const errorMessage = getErrorMessage()

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-3'>
          <CardTitle className='text-2xl font-bold'>{t('title')}</CardTitle>
          <CardDescription className='text-base'>
            {t('description', { domain: getAllowedDomainsDisplay() })}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {errorMessage && (
            <div className='flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-950 p-4 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'>
              <IconAlertCircle className='h-5 w-5 flex-shrink-0 mt-0.5' />
              <p className='text-sm'>{errorMessage}</p>
            </div>
          )}

          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className='w-full'
            size='lg'
          >
            <IconBrandGoogle className='mr-2 h-5 w-5' />
            {isLoading ? t('signingIn') : t('signInWithGoogle')}
          </Button>

          <p className='text-xs text-center text-muted-foreground'>
            {t('disclaimer')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 6.9 Auth Callback Route (NEW)

**File**: `app/[locale]/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { hasValidDomain } from '@/lib/auth/check-domain'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/dashboard'

  if (code) {
    const supabase = await createClient()

    // Exchange code for session (PKCE flow)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    // Validate email domain
    if (!hasValidDomain(data.user)) {
      // Sign out user with invalid domain
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=unauthorized_domain`)
    }

    // Success - redirect to intended destination
    const redirectUrl = redirect.startsWith('/') ? redirect : '/dashboard'
    return NextResponse.redirect(`${origin}${redirectUrl}`)
  }

  // No code provided - something went wrong
  console.error('Auth callback: No code provided')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
```

### 6.10 Sign Out Route (NEW)

**File**: `app/[locale]/auth/signout/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Sign out user
  await supabase.auth.signOut()

  // Redirect to login page
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/login`)
}

export async function GET(request: NextRequest) {
  // Support GET requests for simpler logout links
  return POST(request)
}
```

### 6.11 User Menu in Sidebar (UPDATE)

**File**: `components/app-sidebar.tsx`

Add this to your existing sidebar, in the `<Sidebar>` component, after the main content but before `</Sidebar>`:

```typescript
// Add these imports at the top
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconChevronUp, IconLogout } from '@tabler/icons-react'

// Then modify the component to be async and fetch user
export async function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('nav')
  const tAuth = useTranslations('auth')

  // Fetch current user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ... existing sidebar content ...

  return (
    <Sidebar collapsible='icon' {...props}>
      {/* ... existing content ... */}

      {/* Add this at the end, before </Sidebar> */}
      {user && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size='lg'
                    className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                  >
                    <Avatar className='h-8 w-8 rounded-lg'>
                      <AvatarImage
                        src={user.user_metadata?.avatar_url}
                        alt={user.user_metadata?.full_name || user.email || 'User'}
                      />
                      <AvatarFallback className='rounded-lg'>
                        {(user.email?.[0] || 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className='grid flex-1 text-left text-sm leading-tight'>
                      <span className='truncate font-semibold'>
                        {user.user_metadata?.full_name || user.email?.split('@')[0]}
                      </span>
                      <span className='truncate text-xs text-muted-foreground'>
                        {user.email}
                      </span>
                    </div>
                    <IconChevronUp className='ml-auto size-4' />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
                  side='bottom'
                  align='end'
                  sideOffset={4}
                >
                  <DropdownMenuLabel className='p-0 font-normal'>
                    <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                      <Avatar className='h-8 w-8 rounded-lg'>
                        <AvatarImage
                          src={user.user_metadata?.avatar_url}
                          alt={user.user_metadata?.full_name || user.email || 'User'}
                        />
                        <AvatarFallback className='rounded-lg'>
                          {(user.email?.[0] || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className='grid flex-1 text-left text-sm leading-tight'>
                        <span className='truncate font-semibold'>
                          {user.user_metadata?.full_name || user.email?.split('@')[0]}
                        </span>
                        <span className='truncate text-xs text-muted-foreground'>
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action='/auth/signout' method='post' className='w-full'>
                      <button
                        type='submit'
                        className='flex w-full items-center gap-2 text-left'
                      >
                        <IconLogout className='h-4 w-4' />
                        {tAuth('signOut')}
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
```

**Important**: Change the component from:
```typescript
export function AppSidebar({ ... }) {
```

To:
```typescript
export async function AppSidebar({ ... }) {
```

This makes it a Server Component that can fetch the user session.

### 6.12 Translations - English (UPDATE)

**File**: `messages/en.json`

Add this to the existing JSON (merge with existing content):

```json
{
  "auth": {
    "title": "Sign In",
    "description": "Sign in with your {domain} account to access the AI Agent Statistics Dashboard",
    "signInWithGoogle": "Sign in with Google",
    "signingIn": "Signing in...",
    "signOut": "Sign Out",
    "disclaimer": "By signing in, you agree to our terms of service and privacy policy.",
    "errors": {
      "unauthorizedDomain": "Access denied. Only {domain} email addresses are allowed.",
      "noCode": "Authentication failed. Please try again.",
      "generic": "An error occurred during authentication. Please try again."
    }
  }
}
```

### 6.13 Translations - Russian (UPDATE)

**File**: `messages/ru.json`

Add this to the existing JSON (merge with existing content):

```json
{
  "auth": {
    "title": "Вход в систему",
    "description": "Войдите с вашей учетной записью {domain} для доступа к панели статистики AI-агентов",
    "signInWithGoogle": "Войти через Google",
    "signingIn": "Выполняется вход...",
    "signOut": "Выйти",
    "disclaimer": "Входя в систему, вы соглашаетесь с нашими условиями использования и политикой конфиденциальности.",
    "errors": {
      "unauthorizedDomain": "Доступ запрещен. Разрешены только адреса электронной почты {domain}.",
      "noCode": "Ошибка аутентификации. Пожалуйста, попробуйте снова.",
      "generic": "Произошла ошибка при аутентификации. Пожалуйста, попробуйте снова."
    }
  }
}
```

---

## Step 7: Testing

### 7.1 Local Testing

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Test authentication flow**:
   - Navigate to http://localhost:3000/dashboard
   - Should redirect to /login
   - Click "Sign in with Google"
   - Authenticate with @levhaolam.com account
   - Should redirect back to /dashboard
   - Check user menu in sidebar (bottom left)

3. **Test domain restriction**:
   - Try signing in with non-@levhaolam.com account (if you have one)
   - Should redirect back to login with error message

4. **Test protected routes**:
   - Visit /dashboard, /detailed-stats, /support-overview
   - All should require authentication

5. **Test public routes**:
   - Visit /, /docs
   - Should work without authentication

6. **Test sign out**:
   - Click user menu in sidebar
   - Click "Sign Out"
   - Should redirect to /login
   - Verify session is cleared (try accessing /dashboard)

### 7.2 Production Testing

After deploying to Vercel:

1. **Verify environment variables** in Vercel Dashboard
2. **Test OAuth flow** with production URLs
3. **Check redirect URLs** are correct
4. **Verify database trigger** is working (check Supabase logs)

### 7.3 Edge Cases to Test

- [ ] User tries to access protected route without auth
- [ ] User with wrong domain tries to sign in
- [ ] User signs out and tries to access protected route
- [ ] Session expires (wait 1 hour) - should auto-refresh
- [ ] User switches language (en/ru) while authenticated
- [ ] User bookmarks /dashboard and visits later (session should persist)
- [ ] Multiple tabs open - sign out in one tab should sign out in all

---

## Troubleshooting

### Common Issues

#### 1. "Auth callback: No code provided"

**Cause**: Google OAuth redirect URI mismatch

**Solution**:
- Check that redirect URI in Google Cloud Console matches exactly:
  - `http://localhost:3000/auth/callback` (for dev)
  - `https://ai-agents-stats.vercel.app/auth/callback` (for prod)
- Make sure URLs don't have trailing slashes

#### 2. "unauthorized_domain" error for valid @levhaolam.com email

**Cause**: Environment variable not set correctly

**Solution**:
- Check `.env.local` has `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=levhaolam.com`
- Restart development server after changing .env
- For production, check Vercel environment variables

#### 3. Infinite redirect loop

**Cause**: Middleware misconfiguration

**Solution**:
- Ensure `/login` and `/auth/callback` are in `PUBLIC_PATHS`
- Check middleware logs in console
- Clear browser cookies and try again

#### 4. "Missing Supabase environment variables"

**Cause**: .env.local not configured

**Solution**:
- Copy `.env.local.example` to `.env.local`
- Fill in Supabase URL and keys from dashboard
- Restart development server

#### 5. Google OAuth shows "Access blocked"

**Cause**: OAuth consent screen not properly configured

**Solution**:
- Go to Google Cloud Console → OAuth consent screen
- Add your email to test users (if app is in testing mode)
- Or publish the app (if ready for production)

#### 6. Database trigger not working

**Cause**: Trigger permissions or syntax error

**Solution**:
- Re-run the SQL script in Step 4.1
- Check Supabase logs for errors
- Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user';`

#### 7. Session not persisting

**Cause**: Cookie configuration issue

**Solution**:
- Check browser allows cookies
- Verify middleware is running (check console logs)
- Clear all cookies and try again
- Check `createServerClient` cookie configuration in `lib/supabase/server.ts`

#### 8. Avatar not showing

**Cause**: Google didn't provide avatar URL

**Solution**:
- Check `user.user_metadata.avatar_url` in browser console
- Avatar should fallback to first letter of email
- Ensure Avatar component is imported from `@/components/ui/avatar`

---

## Implementation Checklist

Use this checklist to track your progress:

### Setup Phase
- [ ] Install `@supabase/ssr` package (`npm install @supabase/ssr`)
- [ ] Get Google Cloud Console access
- [ ] Get Supabase Dashboard admin access

### Google Cloud Console
- [ ] Create/select Google Cloud project
- [ ] Enable Google+ API
- [ ] Configure OAuth consent screen
- [ ] Create OAuth Client ID
- [ ] Save Client ID and Client Secret
- [ ] Add authorized JavaScript origins
- [ ] Add authorized redirect URIs

### Supabase Dashboard
- [ ] Enable Google provider in Authentication → Providers
- [ ] Paste Client ID and Client Secret
- [ ] Configure Site URL
- [ ] Add Redirect URLs
- [ ] Disable Email Confirmation (optional)
- [ ] Execute database trigger SQL (Step 4.1)
- [ ] Test database trigger (Step 4.2)

### Environment Variables
- [ ] Update `.env.local` with `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`
- [ ] Update `.env.local.example` with new variable
- [ ] Add environment variables to Vercel (for production)

### Code Implementation
- [ ] Create `constants/allowed-domains.ts`
- [ ] Create `lib/auth/check-domain.ts`
- [ ] Update `lib/supabase/client.ts`
- [ ] Update `lib/supabase/server.ts`
- [ ] Create `lib/supabase/middleware.ts`
- [ ] Update `middleware.ts`
- [ ] Create `app/[locale]/login/page.tsx`
- [ ] Create `app/[locale]/auth/callback/route.ts`
- [ ] Create `app/[locale]/auth/signout/route.ts`
- [ ] Update `components/app-sidebar.tsx` (add user menu)
- [ ] Update `messages/en.json` (add auth translations)
- [ ] Update `messages/ru.json` (add auth translations)

### Testing
- [ ] Test login flow (local)
- [ ] Test domain restriction (local)
- [ ] Test protected routes (local)
- [ ] Test public routes (local)
- [ ] Test sign out (local)
- [ ] Test all edge cases (see Step 7.3)
- [ ] Deploy to Vercel
- [ ] Test production deployment
- [ ] Verify environment variables in Vercel
- [ ] Test with multiple users

### Documentation
- [ ] Update README.md with auth instructions
- [ ] Document allowed domains for team
- [ ] Share setup guide with team members

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [@supabase/ssr Package](https://github.com/supabase/ssr)

---

## Support

If you encounter issues not covered in this guide:

1. Check Supabase Dashboard → Logs for errors
2. Check browser console for client-side errors
3. Check Vercel deployment logs for server-side errors
4. Review this guide's Troubleshooting section
5. Contact the development team

---

**Last Updated**: 2025-10-31
**Version**: 1.0
**Maintainer**: Development Team
