'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { FileUpload } from '@/components/FileUpload'
import { StatusFilter } from '@/components/StatusFilter'
import { FilterToggles } from '@/components/FilterToggles'
import { AnalysisResults } from '@/components/AnalysisResults'
import { SkuBarChart, TierPieChart } from '@/components/SkuChart'
import { SummaryCards } from '@/components/SummaryCards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  parsePendingShipmentsCSV,
  groupOrdersByOrderNumber,
  filterOrders,
} from '@/lib/parsers/pending-shipments'
import { parseInventoryCSV, aggregateInventoryBySku } from '@/lib/parsers/inventory'
import { runFullAnalysis } from '@/lib/analysis/sku-analyzer'
import type { Order, SkuInventory, AnalysisOutput, PendingShipmentRow, InventoryRow } from '@/lib/parsers/types'
import { Package, BarChart3, Settings2, Play, LogOut, History } from 'lucide-react'
import { ExportButtons } from '@/components/ExportButtons'
import Link from 'next/link'

export default function DashboardPage() {
  // File upload state
  const [pendingShipmentsFile, setPendingShipmentsFile] = useState<string | null>(null)
  const [inventoryFile, setInventoryFile] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Parsed data state
  const [pendingRows, setPendingRows] = useState<PendingShipmentRow[]>([])
  const [, setInventoryRows] = useState<InventoryRow[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [inventoryMap, setInventoryMap] = useState<Map<string, SkuInventory> | null>(null)

  // Filter state
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [excludeAllocated, setExcludeAllocated] = useState(true)
  const [excludeToted, setExcludeToted] = useState(true)

  // Analysis results
  const [analysisOutput, setAnalysisOutput] = useState<AnalysisOutput | null>(null)

  const handlePendingShipmentsUpload = useCallback(async (file: File) => {
    setIsLoading(true)
    try {
      const content = await file.text()
      const { rows, statuses, errors } = parsePendingShipmentsCSV(content)

      if (errors.length > 0) {
        console.warn('Parse warnings:', errors)
      }

      const orders = groupOrdersByOrderNumber(rows)

      setPendingRows(rows)
      setAllOrders(orders)
      setAvailableStatuses(statuses)
      setPendingShipmentsFile(file.name)
      setAnalysisOutput(null)

      toast.success(`Loaded ${rows.length} line items from ${orders.length} orders`)
    } catch (error) {
      console.error('Failed to parse pending shipments:', error)
      toast.error('Failed to parse CSV file')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInventoryUpload = useCallback(async (file: File) => {
    setIsLoading(true)
    try {
      const content = await file.text()
      const { rows, errors } = parseInventoryCSV(content)

      if (errors.length > 0) {
        console.warn('Parse warnings:', errors)
      }

      const invMap = aggregateInventoryBySku(rows)

      setInventoryRows(rows)
      setInventoryMap(invMap)
      setInventoryFile(file.name)
      setAnalysisOutput(null)

      toast.success(`Loaded ${rows.length} inventory locations for ${invMap.size} SKUs`)
    } catch (error) {
      console.error('Failed to parse inventory:', error)
      toast.error('Failed to parse CSV file')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const runAnalysis = useCallback(() => {
    if (allOrders.length === 0) {
      toast.error('Please upload a pending shipments report first')
      return
    }

    setIsLoading(true)
    try {
      const filteredOrders = filterOrders(
        allOrders,
        selectedStatuses,
        excludeAllocated,
        excludeToted
      )

      if (filteredOrders.length === 0) {
        toast.warning('No orders match the current filters')
        setAnalysisOutput(null)
        setIsLoading(false)
        return
      }

      const output = runFullAnalysis(filteredOrders, inventoryMap)
      setAnalysisOutput(output)

      toast.success(
        `Analyzed ${output.summary.totalOrders} orders - ${output.summary.ordersReadyToFulfill} ready to fulfill`
      )
    } catch (error) {
      console.error('Analysis failed:', error)
      toast.error('Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }, [allOrders, selectedStatuses, excludeAllocated, excludeToted, inventoryMap])

  const clearAll = () => {
    setPendingShipmentsFile(null)
    setInventoryFile(null)
    setPendingRows([])
    setInventoryRows([])
    setAllOrders([])
    setAvailableStatuses([])
    setInventoryMap(null)
    setSelectedStatuses([])
    setAnalysisOutput(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ShipHero Analyzer</h1>
                <p className="text-xs text-slate-400">SKU Priority Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/history">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  <History className="w-4 h-4 mr-2" />
                  History
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.href = '/login')}
                className="text-slate-400 hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[350px_1fr] gap-8">
          {/* Sidebar - Configuration */}
          <aside className="space-y-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-slate-400" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Uploads */}
                <div className="space-y-4">
                  <FileUpload
                    title="Pending Shipments"
                    description="Upload ShipHero pending shipments report"
                    accept=".csv"
                    onFileSelect={handlePendingShipmentsUpload}
                    isLoading={isLoading}
                    uploadedFileName={pendingShipmentsFile}
                    onClear={() => {
                      setPendingShipmentsFile(null)
                      setPendingRows([])
                      setAllOrders([])
                      setAvailableStatuses([])
                      setAnalysisOutput(null)
                    }}
                  />

                  <FileUpload
                    title="Inventory Report"
                    description="Upload item locations report (optional)"
                    accept=".csv"
                    onFileSelect={handleInventoryUpload}
                    isLoading={isLoading}
                    uploadedFileName={inventoryFile}
                    onClear={() => {
                      setInventoryFile(null)
                      setInventoryRows([])
                      setInventoryMap(null)
                      setAnalysisOutput(null)
                    }}
                  />
                </div>

                <Separator className="bg-slate-700" />

                {/* Filters */}
                {availableStatuses.length > 0 && (
                  <>
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">
                        Filter by Status
                      </label>
                      <StatusFilter
                        statuses={availableStatuses}
                        selectedStatuses={selectedStatuses}
                        onChange={setSelectedStatuses}
                      />
                    </div>

                    <FilterToggles
                      excludeAllocated={excludeAllocated}
                      excludeToted={excludeToted}
                      onExcludeAllocatedChange={setExcludeAllocated}
                      onExcludeTotedChange={setExcludeToted}
                    />

                    <Separator className="bg-slate-700" />
                  </>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={runAnalysis}
                    disabled={allOrders.length === 0 || isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run Analysis
                  </Button>

                  {(pendingShipmentsFile || inventoryFile) && (
                    <Button
                      variant="outline"
                      onClick={clearAll}
                      className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                {/* Stats Preview */}
                {allOrders.length > 0 && (
                  <div className="p-4 bg-slate-900/50 rounded-lg space-y-2">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Data Loaded</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-400">Line Items</p>
                        <p className="text-white font-medium">{pendingRows.length.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Orders</p>
                        <p className="text-white font-medium">{allOrders.length.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Statuses</p>
                        <p className="text-white font-medium">{availableStatuses.length}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Inventory SKUs</p>
                        <p className="text-white font-medium">{inventoryMap?.size.toLocaleString() ?? 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Main Content - Results */}
          <div className="space-y-6">
            {!analysisOutput ? (
              <Card className="bg-slate-800/30 border-slate-700">
                <CardContent className="py-16 text-center">
                  <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Ready to Analyze
                  </h2>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Upload your ShipHero pending shipments report and optionally an inventory report,
                    then click &quot;Run Analysis&quot; to see which SKUs will unlock the most orders.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center" data-print-hidden="true">
                  <h2 className="text-lg font-semibold text-white">Analysis Results</h2>
                  <ExportButtons analysisOutput={analysisOutput} />
                </div>

                <SummaryCards summary={analysisOutput.summary} />

                <div className="grid lg:grid-cols-2 gap-6">
                  <SkuBarChart
                    results={
                      inventoryMap
                        ? analysisOutput.inventoryConstrainedResults
                        : analysisOutput.unconstrainedResults
                    }
                  />
                  <TierPieChart
                    results={
                      inventoryMap
                        ? analysisOutput.inventoryConstrainedResults
                        : analysisOutput.unconstrainedResults
                    }
                  />
                </div>

                <Tabs defaultValue={inventoryMap ? 'constrained' : 'unconstrained'} className="space-y-4">
                  <TabsList className="bg-slate-800/50 border border-slate-700">
                    <TabsTrigger
                      value="unconstrained"
                      className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                    >
                      Unconstrained View
                    </TabsTrigger>
                    {inventoryMap && (
                      <TabsTrigger
                        value="constrained"
                        className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                      >
                        Inventory Constrained
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="unconstrained">
                    <AnalysisResults
                      results={analysisOutput.unconstrainedResults}
                      title="SKU Demand Ranking (All Orders)"
                      description="SKUs ranked by how many orders they appear in - ignoring current inventory levels"
                      showInventoryColumns={false}
                    />
                  </TabsContent>

                  {inventoryMap && (
                    <TabsContent value="constrained">
                      <AnalysisResults
                        results={analysisOutput.inventoryConstrainedResults}
                        title="SKUs Blocking Order Fulfillment"
                        description="SKUs that are preventing orders from being fulfilled due to insufficient inventory"
                        showInventoryColumns={true}
                      />
                    </TabsContent>
                  )}
                </Tabs>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
