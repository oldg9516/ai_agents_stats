import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { fetchFilterOptions } from '@/lib/actions/dashboard-actions'

/**
 * Test Connection API Route
 *
 * Simple endpoint to verify Supabase connection
 * Uses Server Actions for data fetching
 */
export async function GET() {
  try {
    // Test basic connection
    const { data, error, count } = await supabase
      .from('ai_human_comparison')
      .select('*', { count: 'exact' })
      .limit(5)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      )
    }

    // Get filter options using Server Action
    const filterOptions = await fetchFilterOptions()

    return NextResponse.json({
      success: true,
      message: 'Connected to Supabase successfully',
      stats: {
        totalRecords: count,
        sampleRecords: data?.length || 0,
      },
      filterOptions,
      sampleData: data?.[0] || null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
