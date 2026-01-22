'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { FileUpload } from '@/components/FileUpload'
import { StatusFilter } from '@/components/StatusFilter'
import { FilterToggles } from '@/components/FilterToggles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  parsePendingShipmentsCSV,
  groupOrdersByOrderNumber,
  filterOrders,
} from '@/lib/parsers/pending-shipments'
import { parseInventoryCSV, aggregateInventoryBySku } from '@/lib/parsers/inventory'
import { optimizeMultipleStations, type StationConfig, type MultiStationOutput } from '@/lib/analysis/station-optimizer'
import type { Order, SkuInventory, PendingShipmentRow, InventoryRow, SourceLocationOptions } from '@/lib/parsers/types'
import { Package, Layers, Play, LogOut, Plus, Trash2, ArrowLeft, MapPin } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { StationResults } from '@/components/StationResults'
import { StationExportButtons } from '@/components/StationExportButtons'
import Link from 'next/link'

export default function StationsPage() {
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

  // Station configuration
  const [stations, setStations] = useState<StationConfig[]>([
    { id: 1, name: 'Station 1', skuSlots: 50 },
    { id: 2, name: 'Station 2', skuSlots: 50 },
  ])

  // Source location options
  const [sourceLocationOptions, setSourceLocationOptions] = useState<SourceLocationOptions>({
    prioritizeOverstock: true,
    useSingleLocation: false,
  })

  // Analysis results
  const [analysisResults, setAnalysisResults] = useState<MultiStationOutput | null>(null)
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

  const addStation = () => {
    const newId = Math.max(...stations.map(s => s.id), 0) + 1
    setStations([...stations, { id: newId, name: `Station ${newId}`, skuSlots: 50 }])
  }

  const removeStation = (id: number) => {
    if (stations.length <= 1) {
      toast.error('You need at least one station')
      return
    }
    setStations(stations.filter(s => s.id !== id))
  }

  const updateStation = (id: number, field: 'name' | 'skuSlots', value: string | number) => {
    setStations(stations.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  const runAnalysis = useCallback(() => {
    if (allOrders.length === 0) {
      toast.error('Please upload a pending shipments report first')
      return
    }

    if (!inventoryMap) {
      toast.error('Please upload an inventory report to run the analysis')
      return
    }

    if (stations.length === 0) {
      toast.error('Please add at least one station')
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

      const results = optimizeMultipleStations(stations, filteredOrders, inventoryMap, sourceLocationOptions)
      setAnalysisResults(results)
      setTotalOrdersAnalyzed(filteredOrders.length)

      toast.success(
        `Optimized ${stations.length} stations - ${results.totalOrdersFulfilled} orders fulfillable (${results.fulfillmentRate.toFixed(1)}%)`
      )
    } catch (error) {
      console.error('Analysis failed:', error)
      toast.error('Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }, [allOrders, selectedStatuses, excludeAllocated, excludeToted, inventoryMap, stations, sourceLocationOptions])

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
              <div className="w-10 h-10 bg-[#3281fd] rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#000000]">Multi-Station Optimizer</h1>
                <p className="text-xs text-[#6b7a8c]">Distribute SKUs across stations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Single Station
                </Button>
              </Link>
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

                {/* Station Configuration */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#3281fd]" />
                      <Label className="text-sm font-medium text-[#263444]">
                        Stations
                      </Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addStation}
                      className="h-7 px-2 border-[#e2e8f0] text-[#3281fd] hover:bg-[#3281fd]/10"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {stations.map((station, index) => (
                      <div key={station.id} className="flex items-center gap-2 p-2 bg-[#f4f7fa] rounded-lg">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-[#3281fd]/20 text-[#3281fd]' : 
                          index === 1 ? 'bg-[#6de5a2]/20 text-[#4db87a]' : 
                          index === 2 ? 'bg-[#ffce75]/20 text-[#b38f52]' : 
                          'bg-[#c0ccdb]/20 text-[#6b7a8c]'
                        }`}>
                          {index + 1}
                        </div>
                        <Input
                          value={station.name}
                          onChange={(e) => updateStation(station.id, 'name', e.target.value)}
                          className="h-7 text-sm bg-white border-[#e2e8f0] flex-1"
                          placeholder="Station name"
                        />
                        <Input
                          type="number"
                          min={1}
                          max={500}
                          value={station.skuSlots}
                          onChange={(e) => updateStation(station.id, 'skuSlots', parseInt(e.target.value) || 50)}
                          className="h-7 w-16 text-sm bg-white border-[#e2e8f0] text-center"
                        />
                        <span className="text-xs text-[#6b7a8c]">slots</span>
                        {stations.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStation(station.id)}
                            className="h-7 w-7 p-0 text-[#c0ccdb] hover:text-[#ef5252] hover:bg-[#ef5252]/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-[#6b7a8c]">
                    Total: {stations.reduce((sum, s) => sum + s.skuSlots, 0)} SKU slots across {stations.length} station{stations.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <Separator className="bg-[#e2e8f0]" />

                {/* Source Location Options */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#6de5a2]" />
                    <Label className="text-sm font-medium text-[#263444]">
                      Source Location Options
                    </Label>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="prioritizeOverstock"
                        checked={sourceLocationOptions.prioritizeOverstock}
                        onCheckedChange={(checked) => 
                          setSourceLocationOptions(prev => ({ ...prev, prioritizeOverstock: checked === true }))
                        }
                        className="border-[#c0ccdb] data-[state=checked]:bg-[#6de5a2] data-[state=checked]:border-[#6de5a2]"
                      />
                      <Label htmlFor="prioritizeOverstock" className="text-sm text-[#263444] cursor-pointer">
                        Prioritize overstock locations
                      </Label>
                    </div>
                    <p className="text-xs text-[#6b7a8c] pl-6">
                      Pull from non-pickable (overstock) before pickable locations
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useSingleLocation"
                        checked={sourceLocationOptions.useSingleLocation}
                        onCheckedChange={(checked) => 
                          setSourceLocationOptions(prev => ({ ...prev, useSingleLocation: checked === true }))
                        }
                        className="border-[#c0ccdb] data-[state=checked]:bg-[#3281fd] data-[state=checked]:border-[#3281fd]"
                      />
                      <Label htmlFor="useSingleLocation" className="text-sm text-[#263444] cursor-pointer">
                        Single location only
                      </Label>
                    </div>
                    <p className="text-xs text-[#6b7a8c] pl-6">
                      Show first location with enough units (don&apos;t combine)
                    </p>
                  </div>
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
                    Optimize Stations
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
                    <Layers className="w-8 h-8 text-[#c0ccdb]" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#000000] mb-2">
                    Multi-Station Optimizer
                  </h2>
                  <p className="text-[#6b7a8c] max-w-md mx-auto text-sm">
                    Configure your stations on the left, upload your reports, then click 
                    &quot;Optimize Stations&quot; to find the best SKU distribution across all stations.
                  </p>
                  <div className="mt-6 p-4 bg-[#f4f7fa] rounded-lg max-w-md mx-auto text-left">
                    <p className="text-xs text-[#6b7a8c] uppercase tracking-wider font-medium mb-2">How it works</p>
                    <ul className="text-sm text-[#263444] space-y-1">
                      <li>• Each station must have ALL SKUs to fulfill an order</li>
                      <li>• SKUs can overlap between stations if beneficial</li>
                      <li>• Algorithm balances load across stations</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center print:hidden">
                  <h2 className="text-base font-semibold text-[#000000]">
                    Station Optimization Results
                    <span className="text-[#6b7a8c] font-normal ml-2">
                      ({totalOrdersAnalyzed.toLocaleString()} orders analyzed)
                    </span>
                  </h2>
                  <StationExportButtons analysisResults={analysisResults} />
                </div>

                <StationResults results={analysisResults} />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
