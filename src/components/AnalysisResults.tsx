'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SkuAnalysisResult } from '@/lib/parsers/types'

interface AnalysisResultsProps {
  results: SkuAnalysisResult[]
  title: string
  description?: string
  showInventoryColumns?: boolean
}

function getTierColor(tier: string) {
  switch (tier) {
    case 'critical':
      return 'bg-red-900/50 text-red-300 border-red-800'
    case 'high':
      return 'bg-orange-900/50 text-orange-300 border-orange-800'
    case 'medium':
      return 'bg-yellow-900/50 text-yellow-300 border-yellow-800'
    case 'low':
      return 'bg-slate-700/50 text-slate-300 border-slate-600'
    default:
      return 'bg-slate-700/50 text-slate-300 border-slate-600'
  }
}

export function AnalysisResults({
  results,
  title,
  description,
  showInventoryColumns = false,
}: AnalysisResultsProps) {
  if (results.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-8 text-center">
          <p className="text-slate-400">No results to display</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        {description && (
          <p className="text-sm text-slate-400">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400">Rank</TableHead>
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400">Product Name</TableHead>
                <TableHead className="text-slate-400 text-right">Orders Impacted</TableHead>
                <TableHead className="text-slate-400 text-right">Units Needed</TableHead>
                {showInventoryColumns && (
                  <>
                    <TableHead className="text-slate-400 text-right">Current Stock</TableHead>
                    <TableHead className="text-slate-400 text-right">Gap</TableHead>
                  </>
                )}
                <TableHead className="text-slate-400">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) => (
                <TableRow
                  key={result.sku}
                  className="border-slate-700/50 hover:bg-slate-700/30"
                >
                  <TableCell className="font-mono text-slate-500">
                    #{index + 1}
                  </TableCell>
                  <TableCell className="font-mono text-emerald-400 text-sm">
                    {result.sku}
                  </TableCell>
                  <TableCell className="text-slate-300 max-w-[200px] truncate">
                    {result.productName}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">
                    {result.ordersImpacted.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {result.totalUnitsNeeded.toLocaleString()}
                  </TableCell>
                  {showInventoryColumns && (
                    <>
                      <TableCell className="text-right text-slate-300">
                        {result.currentInventory.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            result.inventoryGap > 0
                              ? 'text-red-400 font-medium'
                              : 'text-emerald-400'
                          }
                        >
                          {result.inventoryGap > 0
                            ? `-${result.inventoryGap.toLocaleString()}`
                            : '✓'}
                        </span>
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Badge className={getTierColor(result.tier)}>
                      {result.tier.charAt(0).toUpperCase() + result.tier.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
