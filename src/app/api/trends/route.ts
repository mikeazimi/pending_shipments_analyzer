import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Get SKU trends over time
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sku = searchParams.get('sku')
    const days = parseInt(searchParams.get('days') || '30', 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let query = supabase
      .from('sku_trends')
      .select('sku, date, orders_impacted')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (sku) {
      query = query.eq('sku', sku)
    } else {
      // Get top SKUs by total impact
      const { data: topSkus } = await supabase
        .from('sku_trends')
        .select('sku')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('orders_impacted', { ascending: false })
        .limit(10)

      if (topSkus && topSkus.length > 0) {
        const skuList = [...new Set(topSkus.map(s => s.sku))]
        query = query.in('sku', skuList)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch trends' },
        { status: 500 }
      )
    }

    // Group by SKU for chart display
    const groupedByDate = data?.reduce((acc, item) => {
      const dateKey = item.date
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey }
      }
      acc[dateKey][item.sku] = item.orders_impacted
      return acc
    }, {} as Record<string, Record<string, string | number>>)

    const chartData = Object.values(groupedByDate || {})

    return NextResponse.json({ trends: data, chartData })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
