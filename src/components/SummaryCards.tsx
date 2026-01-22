'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Package, CheckCircle, AlertTriangle, Layers } from 'lucide-react'
import type { AnalysisOutput } from '@/lib/parsers/types'

interface SummaryCardsProps {
  summary: AnalysisOutput['summary']
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Total Orders',
      value: summary.totalOrders.toLocaleString(),
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Ready to Fulfill',
      value: summary.ordersReadyToFulfill.toLocaleString(),
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Needing Stock',
      value: summary.ordersNeedingStock.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Unique SKUs',
      value: summary.uniqueSkusNeeded.toLocaleString(),
      icon: Layers,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="bg-slate-800/50 border-slate-700"
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-sm text-slate-400">{card.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
