'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type { SkuAnalysisResult } from '@/lib/parsers/types'

interface SkuBarChartProps {
  results: SkuAnalysisResult[]
  maxItems?: number
}

export function SkuBarChart({ results, maxItems = 10 }: SkuBarChartProps) {
  const data = results.slice(0, maxItems).map(r => ({
    sku: r.sku.length > 20 ? r.sku.slice(0, 17) + '...' : r.sku,
    orders: r.ordersImpacted,
    fullSku: r.sku,
  }))

  if (data.length === 0) {
    return null
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-lg">Top SKUs by Order Impact</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#64748b" fontSize={12} />
            <YAxis
              type="category"
              dataKey="sku"
              stroke="#64748b"
              fontSize={11}
              width={140}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value) => [`${value} orders`, '']}
            />
            <Bar dataKey="orders" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface TierPieChartProps {
  results: SkuAnalysisResult[]
}

const TIER_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#64748b',
}

export function TierPieChart({ results }: TierPieChartProps) {
  const tierCounts = results.reduce(
    (acc, r) => {
      acc[r.tier] = (acc[r.tier] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const data = Object.entries(tierCounts).map(([tier, count]) => ({
    name: tier.charAt(0).toUpperCase() + tier.slice(1),
    value: count,
    tier,
  }))

  if (data.length === 0) {
    return null
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white text-lg">Priority Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
              labelLine={{ stroke: '#64748b' }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={TIER_COLORS[entry.tier as keyof typeof TIER_COLORS]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
