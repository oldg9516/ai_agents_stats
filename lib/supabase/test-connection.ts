/**
 * Test Supabase Connection
 *
 * Simple script to verify Supabase connection and data structure
 * Run with: npx tsx lib/supabase/test-connection.ts
 */

import { supabase, checkConnection } from './client'
import type { AIHumanComparisonRow } from './types'

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n')

  // Check basic connection
  const isConnected = await checkConnection()
  if (!isConnected) {
    console.error('❌ Failed to connect to Supabase')
    console.error('Please check your .env.local file and credentials')
    process.exit(1)
  }

  console.log('✅ Connected to Supabase successfully\n')

  // Fetch sample data
  console.log('📊 Fetching sample data...\n')

  const { data, error, count } = await supabase
    .from('ai_human_comparison')
    .select('*', { count: 'exact' })
    .limit(5)

  if (error) {
    console.error('❌ Error fetching data:', error.message)
    process.exit(1)
  }

  console.log(`✅ Total records in database: ${count}\n`)

  if (data && data.length > 0) {
    console.log('📋 Sample record structure:')
    console.log(JSON.stringify(data[0], null, 2))
    console.log('\n')

    // Get unique values for filters
    const { data: allData } = await supabase
      .from('ai_human_comparison')
      .select('prompt_version, request_subtype, email')

    if (allData) {
      const records = allData as unknown as AIHumanComparisonRow[]
      const versions = [...new Set(records.map((r) => r.prompt_version).filter((v): v is string => v !== null))].sort()
      const categories = [...new Set(records.map((r) => r.request_subtype).filter((c): c is string => c !== null))].sort()
      const emails = [...new Set(records.map((r) => r.email).filter((e): e is string => e !== null))].sort()

      console.log('📌 Available Versions:', versions.join(', '))
      console.log('📌 Available Categories:', categories.slice(0, 5).join(', '),
        categories.length > 5 ? `... (${categories.length} total)` : '')
      console.log('📌 Unique Emails:', emails.slice(0, 5).join(', '),
        emails.length > 5 ? `... (${emails.length} total)` : '')
    }
  } else {
    console.log('⚠️  No data found in table')
  }

  console.log('\n✅ Connection test completed successfully!')
}

testConnection().catch(console.error)
