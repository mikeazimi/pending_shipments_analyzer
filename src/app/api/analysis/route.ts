import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Save analysis results
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      pendingReportId,
      inventoryReportId,
      filtersApplied,
      resultsJson,
      ordersAnalyzed,
      ordersUnlockable,
    } = body

    if (!pendingReportId || !resultsJson) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('analysis_results')
      .insert({
        pending_report_id: pendingReportId,
        inventory_report_id: inventoryReportId || null,
        filters_applied: filtersApplied,
        results_json: resultsJson,
        orders_analyzed: ordersAnalyzed,
        orders_unlockable: ordersUnlockable,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 }
      )
    }

    // Save SKU trends for historical tracking
    if (resultsJson.inventoryConstrainedResults) {
      const trends = resultsJson.inventoryConstrainedResults.slice(0, 20).map(
        (result: { sku: string; ordersImpacted: number }) => ({
          sku: result.sku,
          orders_impacted: result.ordersImpacted,
          analysis_id: data.id,
        })
      )

      if (trends.length > 0) {
        const { error: trendsError } = await supabase
          .from('sku_trends')
          .insert(trends)

        if (trendsError) {
          console.error('Failed to save trends:', trendsError)
        }
      }
    }

    return NextResponse.json({ analysis: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get analysis history
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('analysis_results')
      .select(`
        id,
        created_at,
        filters_applied,
        orders_analyzed,
        orders_unlockable,
        pending_report_id,
        inventory_report_id
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analysis history' },
        { status: 500 }
      )
    }

    return NextResponse.json({ analyses: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
