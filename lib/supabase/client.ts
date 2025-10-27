import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

// Singleton instance to prevent multiple client instances
let supabaseInstance: SupabaseClient<Database> | null = null

/**
 * Get or create Supabase client (singleton pattern)
 *
 * This client is configured with:
 * - Auto-refresh for auth tokens
 * - Real-time subscriptions enabled
 * - TypeScript types from Database schema
 */
function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // No auth needed for this app
      },
      realtime: {
        params: {
          eventsPerSecond: 10, // Limit real-time events for performance
        },
      },
    })
  }
  return supabaseInstance
}

/**
 * Supabase client for browser-side operations
 */
export const supabase = getSupabaseClient()

/**
 * Helper to check Supabase connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('ai_human_comparison').select('id').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase connection error:', error)
    return false
  }
}
