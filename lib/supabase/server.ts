import { createClient } from '@supabase/supabase-js'
import {
  createServerClient as createSSRServerClient,
  type CookieOptions,
} from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase environment variables for server client. Please check your .env.local file.'
  )
}

/**
 * Create server-side Supabase client with service role
 * This bypasses Row Level Security (RLS) when using service_role key
 * Use for admin operations and data fetching without user context
 */
export function createServerClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Singleton instance for server-side operations (bypasses RLS)
 */
export const supabaseServer = createServerClient()

/**
 * Create cookie-based Supabase client for Server Components
 * Use for auth operations that need user session context
 */
export async function createAuthClient() {
  const cookieStore = await cookies()

  return createSSRServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}
