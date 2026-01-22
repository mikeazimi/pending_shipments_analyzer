'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { FileUpload } from '@/components/FileUpload'
import { StatusFilter } from '@/components/StatusFilter'
import { FilterToggles } from '@/components/FilterToggles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  parsePendingShipmentsCSV,
  groupOrdersByOrderNumber,
  filterOrders,
} from '@/lib/parsers/pending-shipments'
import { parseInventoryCSV, aggregateInventoryBySku } from '@/lib/parsers/inventory'
import { findOptimalSkuSet } from '@/lib/analysis/sku-analyzer'
import type { Order, SkuInventory, PendingShipmentRow, InventoryRow, SkuSlotsOutput } from '@/lib/parsers/types'
import { Package, Boxes, Play, LogOut } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkuSlotsResults } from '@/components/SkuSlotsResults'
import { ExportButtons } from '@/components/ExportButtons'

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

  // SKU Slots configuration
  const [skuSlotCount, setSkuSlotCount] = useState<number>(50)

  // Analysis results
  const [analysisResults, setAnalysisResults] = useState<SkuSlotsOutput | null>(null)
  const [totalOrdersAnalyzed, setTotalOrdersAnalyzed] = useState<number>(0)

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
      setAnalysisResults(null)

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
      setAnalysisResults(null)

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

    if (!inventoryMap) {
      toast.error('Please upload an inventory report to run the analysis')
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
        setAnalysisResults(null)
        setIsLoading(false)
        return
      }

      const results = findOptimalSkuSet(filteredOrders, inventoryMap, skuSlotCount)
      setAnalysisResults(results)
      setTotalOrdersAnalyzed(filteredOrders.length)

      toast.success(
        `Found ${results.skusToStock.length} optimal SKUs - ${results.totalOrdersFulfilled} orders fulfillable (${results.fulfillmentRate.toFixed(1)}%)`
      )
    } catch (error) {
      console.error('Analysis failed:', error)
      toast.error('Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }, [allOrders, selectedStatuses, excludeAllocated, excludeToted, inventoryMap, skuSlotCount])

  const clearAll = () => {
    setPendingShipmentsFile(null)
    setInventoryFile(null)
    setPendingRows([])
    setInventoryRows([])
    setAllOrders([])
    setAvailableStatuses([])
    setInventoryMap(null)
    setSelectedStatuses([])
    setAnalysisResults(null)
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ef5252] rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#000000]">Pack to Light Analyzer</h1>
                <p className="text-xs text-[#6b7a8c]">Optimize your pick area</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.href = '/login')}
              className="text-[#6b7a8c] hover:text-[#000000] hover:bg-[#f4f7fa]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar - Configuration */}
          <aside className="space-y-4 print:hidden">
            <Card className="bg-white border-[#e2e8f0] shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#000000] text-base font-semibold">
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* File Uploads */}
                <div className="space-y-3">
                  <FileUpload
                    title="Pending Shipments"
                    description="Upload pending shipments CSV"
                    accept=".csv"
                    onFileSelect={handlePendingShipmentsUpload}
                    isLoading={isLoading}
                    uploadedFileName={pendingShipmentsFile}
                    onClear={() => {
                      setPendingShipmentsFile(null)
                      setPendingRows([])
                      setAllOrders([])
                      setAvailableStatuses([])
                      setAnalysisResults(null)
                    }}
                  />

                  <FileUpload
                    title="Inventory Report"
                    description="Upload item locations CSV"
                    accept=".csv"
                    onFileSelect={handleInventoryUpload}
                    isLoading={isLoading}
                    uploadedFileName={inventoryFile}
                    onClear={() => {
                      setInventoryFile(null)
                      setInventoryRows([])
                      setInventoryMap(null)
                      setAnalysisResults(null)
                    }}
                  />
                </div>

                <Separator className="bg-[#e2e8f0]" />

                {/* Filters */}
                {availableStatuses.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#263444]">
                        Filter by Status
                      </Label>
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

                    <Separator className="bg-[#e2e8f0]" />
                  </>
                )}

                {/* SKU Slots Configuration */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#3281fd]" />
                    <Label className="text-sm font-medium text-[#263444]">
                      SKU Slots in Pick Area
                    </Label>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={skuSlotCount}
                    onChange={(e) => setSkuSlotCount(Math.max(1, parseInt(e.target.value) || 50))}
                    placeholder="50"
                    className="bg-white border-[#e2e8f0] text-[#000000] focus:border-[#3281fd] focus:ring-[#3281fd]"
                  />
                  <p className="text-xs text-[#6b7a8c]">
                    Find the optimal {skuSlotCount} SKUs to stock
                  </p>
                </div>

                <Separator className="bg-[#e2e8f0]" />

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={runAnalysis}
                    disabled={allOrders.length === 0 || !inventoryMap || isLoading}
                    className="w-full bg-[#3281fd] hover:bg-[#2570e8] text-white font-medium"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run Analysis
                  </Button>

                  {(pendingShipmentsFile || inventoryFile) && (
                    <Button
                      variant="outline"
                      onClick={clearAll}
                      className="w-full border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa] hover:text-[#000000]"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                {/* Stats Preview */}
                {allOrders.length > 0 && (
                  <div className="p-3 bg-[#f4f7fa] rounded-lg space-y-2">
                    <p className="text-xs text-[#6b7a8c] uppercase tracking-wider font-medium">Data Loaded</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[#6b7a8c] text-xs">Line Items</p>
                        <p className="text-[#000000] font-medium">{pendingRows.length.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[#6b7a8c] text-xs">Orders</p>
                        <p className="text-[#000000] font-medium">{allOrders.length.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[#6b7a8c] text-xs">Statuses</p>
                        <p className="text-[#000000] font-medium">{availableStatuses.length}</p>
                      </div>
                      <div>
                        <p className="text-[#6b7a8c] text-xs">Inventory SKUs</p>
                        <p className="text-[#000000] font-medium">{inventoryMap?.size.toLocaleString() ?? 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Main Content - Results */}
          <div className="space-y-4">
            {!analysisResults ? (
              <Card className="bg-white border-[#e2e8f0] shadow-sm">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 bg-[#f4f7fa] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Boxes className="w-8 h-8 text-[#c0ccdb]" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#000000] mb-2">
                    Ready to Analyze
                  </h2>
                  <p className="text-[#6b7a8c] max-w-md mx-auto text-sm">
                    Upload your pending shipments and inventory reports, set your SKU slot count,
                    then click &quot;Run Analysis&quot; to find the optimal SKUs for your pick area.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center print:hidden">
                  <h2 className="text-base font-semibold text-[#000000]">
                    Optimal {analysisResults.skuSlotCount} SKUs
                    <span className="text-[#6b7a8c] font-normal ml-2">
                      ({totalOrdersAnalyzed.toLocaleString()} orders analyzed)
                    </span>
                  </h2>
                  <ExportButtons analysisResults={analysisResults} />
                </div>

                <SkuSlotsResults results={analysisResults} />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
