import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

// Singleton instance to prevent multiple client instances
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Get or create Supabase browser client (singleton pattern)
 * Used for auth operations only (Google OAuth)
 */
export function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
}

/**
 * Supabase client for browser-side auth operations
 */
export const supabase = createClient()
