'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Calendar, TrendingUp } from 'lucide-react'

interface AnalysisRecord {
  id: string
  created_at: string
  filters_applied: {
    selectedStatuses: string[]
    excludeAllocated: boolean
    excludeToted: boolean
  }
  orders_analyzed: number
  orders_unlockable: number
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch('/api/analysis')
        if (!response.ok) {
          throw new Error('Failed to fetch history')
        }
        const data = await response.json()
        setAnalyses(data.analyses || [])
      } catch (err) {
        console.error('Error fetching history:', err)
        setError('Failed to load analysis history. Make sure Supabase is configured.')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Analysis History</h1>
                <p className="text-xs text-slate-400">View past analysis results</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <Card className="bg-slate-800/30 border-slate-700">
            <CardContent className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading history...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-slate-800/30 border-slate-700">
            <CardContent className="py-12 text-center">
              <p className="text-amber-400 mb-4">{error}</p>
              <p className="text-sm text-slate-500">
                Configure your Supabase credentials in the environment variables to enable history tracking.
              </p>
            </CardContent>
          </Card>
        ) : analyses.length === 0 ? (
          <Card className="bg-slate-800/30 border-slate-700">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No History Yet</h2>
              <p className="text-slate-400 max-w-md mx-auto">
                Run your first analysis and save it to start building your history.
              </p>
              <Link href="/">
                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800/30 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                Past Analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Date</TableHead>
                    <TableHead className="text-slate-400">Orders Analyzed</TableHead>
                    <TableHead className="text-slate-400">Ready to Fulfill</TableHead>
                    <TableHead className="text-slate-400">Fulfillment Rate</TableHead>
                    <TableHead className="text-slate-400">Filters</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses.map((analysis) => {
                    const fulfillmentRate = analysis.orders_analyzed > 0
                      ? ((analysis.orders_unlockable / analysis.orders_analyzed) * 100).toFixed(1)
                      : '0'
                    
                    return (
                      <TableRow
                        key={analysis.id}
                        className="border-slate-700/50 hover:bg-slate-700/30"
                      >
                        <TableCell className="text-slate-300">
                          {formatDate(analysis.created_at)}
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          {analysis.orders_analyzed.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-emerald-400">
                          {analysis.orders_unlockable.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              parseFloat(fulfillmentRate) >= 80
                                ? 'text-emerald-400'
                                : parseFloat(fulfillmentRate) >= 50
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }
                          >
                            {fulfillmentRate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {analysis.filters_applied?.selectedStatuses?.length > 0 ? (
                            <span>
                              {analysis.filters_applied.selectedStatuses.length} status(es)
                            </span>
                          ) : (
                            'All statuses'
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
