import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Server-side Supabase client
 *
 * Use this for:
 * - Server Components
 * - Server Actions
 * - API Routes
 *
 * DO NOT use in Client Components (use client.ts instead)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase environment variables for server client. Please check your .env.local file.'
  )
}

/**
 * Create server-side Supabase client
 * This bypasses Row Level Security (RLS) when using service_role key
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
 * Singleton instance for server-side operations
 */
export const supabaseServer = createServerClient()
