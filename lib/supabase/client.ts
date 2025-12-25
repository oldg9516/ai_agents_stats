import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

// Singleton instance to prevent multiple client instances
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null =
  null

/**
 * Get or create Supabase browser client (singleton pattern)
 *
 * This client is configured with:
 * - Cookie-based session persistence via @supabase/ssr
 * - TypeScript types from Database schema
 */
export function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey
    )
  }
  return supabaseInstance
}

/**
 * Supabase client for browser-side operations
 */
export const supabase = createClient()

/**
 * Helper to check Supabase connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_human_comparison')
      .select('id')
      .limit(1)
    return !error
  } catch (error) {
    console.error('Supabase connection error:', error)
    return false
  }
}
