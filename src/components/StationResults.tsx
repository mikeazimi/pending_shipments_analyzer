'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { MultiStationOutput, StationResult, StationSkuResult } from '@/lib/analysis/station-optimizer'
import type { SourceLocation } from '@/lib/parsers/types'
import { Boxes, TrendingUp, CheckCircle2, Eye, Search, Copy, Check, Layers, AlertCircle, MapPin } from 'lucide-react'

function SourceLocationsCell({ locations }: { locations?: SourceLocation[] }) {
  if (!locations || locations.length === 0) {
    return <span className="text-[#c0ccdb]">—</span>
  }
  
  return (
    <div className="space-y-1">
      {locations.map((loc, idx) => (
        <div key={idx} className="flex items-center gap-1 text-xs">
          <MapPin className="w-3 h-3 text-[#3281fd] flex-shrink-0" />
          <span className="font-mono text-[#263444]">{loc.location}</span>
          <span className="text-[#6b7a8c]">
            ({loc.unitsToTake}{loc.unitsToTake !== loc.units && ` of ${loc.units}`})
          </span>
        </div>
      ))}
    </div>
  )
}

interface StationResultsProps {
  results: MultiStationOutput
}

function OrdersDialog({ 
  orders, 
  title, 
  trigger 
}: { 
  orders: string[]
  title: string
  trigger: React.ReactNode 
}) {
  const [copied, setCopied] = useState(false)
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(orders.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto bg-white border-[#e2e8f0]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-[#000000]">{title}</DialogTitle>
              <DialogDescription className="text-[#6b7a8c]">
                {orders.length} order{orders.length !== 1 ? 's' : ''}
              </DialogDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyToClipboard}
              className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa]"
            >
              {copied ? <Check className="w-4 h-4 mr-1 text-[#6de5a2]" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy All'}
            </Button>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {orders.map((order) => (
            <div
              key={order}
              className="px-3 py-2 bg-[#f4f7fa] rounded text-sm text-[#263444] font-mono"
            >
              {order}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StationCard({ station, stationIndex }: { station: StationResult; stationIndex: number }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedSku, setCopiedSku] = useState(false)
  
  const filteredSkus = useMemo(() => {
    if (!searchTerm) return station.skus
    const term = searchTerm.toLowerCase()
    return station.skus.filter(sku => 
      sku.sku.toLowerCase().includes(term) || 
      sku.productName.toLowerCase().includes(term)
    )
  }, [station.skus, searchTerm])
  
  const copySkuList = () => {
    const skuList = station.skus.map(s => s.sku).join('\n')
    navigator.clipboard.writeText(skuList)
    setCopiedSku(true)
    setTimeout(() => setCopiedSku(false), 2000)
  }
  
  // Colors for different stations
  const stationColors = [
    { bg: 'bg-[#3281fd]/10', border: 'border-[#3281fd]/30', text: 'text-[#3281fd]' },
    { bg: 'bg-[#6de5a2]/10', border: 'border-[#6de5a2]/30', text: 'text-[#4db87a]' },
    { bg: 'bg-[#ffce75]/10', border: 'border-[#ffce75]/30', text: 'text-[#b38f52]' },
    { bg: 'bg-[#ef5252]/10', border: 'border-[#ef5252]/30', text: 'text-[#ef5252]' },
    { bg: 'bg-[#c0ccdb]/10', border: 'border-[#c0ccdb]/30', text: 'text-[#6b7a8c]' },
  ]
  const color = stationColors[stationIndex % stationColors.length]
  
  return (
    <Card className="bg-white border-[#e2e8f0] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-[#000000] text-base flex items-center gap-2">
              <div className={`w-8 h-8 ${color.bg} ${color.border} border rounded-lg flex items-center justify-center`}>
                <span className={`font-bold ${color.text}`}>{stationIndex + 1}</span>
              </div>
              {station.stationName}
            </CardTitle>
            <CardDescription className="text-[#6b7a8c] text-sm">
              {station.skus.length} / {station.skuSlots} slots used • {station.orderCount} orders fulfillable
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <OrdersDialog
              orders={station.ordersFulfilled}
              title={`Orders for ${station.stationName}`}
              trigger={
                <Button variant="outline" size="sm" className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa]">
                  <Eye className="w-4 h-4 mr-1" />
                  {station.orderCount} Orders
                </Button>
              }
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copySkuList}
              className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa]"
            >
              {copiedSku ? <Check className="w-4 h-4 mr-1 text-[#6de5a2]" /> : <Copy className="w-4 h-4 mr-1" />}
              {copiedSku ? 'Copied!' : 'Copy SKUs'}
            </Button>
          </div>
        </div>
        
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c0ccdb]" />
          <Input
            placeholder="Search SKU or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-[#e2e8f0] text-[#000000] placeholder:text-[#c0ccdb] focus:border-[#3281fd]"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto border border-[#e2e8f0] rounded-lg max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-[#f4f7fa]">
              <TableRow className="border-b border-[#e2e8f0] hover:bg-[#f4f7fa]">
                <TableHead className="text-[#6b7a8c] text-xs font-medium uppercase tracking-wider w-12">#</TableHead>
                <TableHead className="text-[#6b7a8c] text-xs font-medium uppercase tracking-wider">SKU</TableHead>
                <TableHead className="text-[#6b7a8c] text-xs font-medium uppercase tracking-wider">Product Name</TableHead>
                <TableHead className="text-[#6b7a8c] text-xs font-medium uppercase tracking-wider text-right">Units</TableHead>
                <TableHead className="text-[#6b7a8c] text-xs font-medium uppercase tracking-wider">Source Location(s)</TableHead>
                <TableHead className="text-[#6b7a8c] text-xs font-medium uppercase tracking-wider text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSkus.map((sku, index) => (
                <TableRow key={sku.sku} className="border-b border-[#e2e8f0] hover:bg-[#f4f7fa]">
                  <TableCell className="text-[#c0ccdb] font-mono text-sm">{index + 1}</TableCell>
                  <TableCell className="font-mono text-[#000000] text-sm">{sku.sku}</TableCell>
                  <TableCell className="text-[#263444] text-sm max-w-[200px] truncate" title={sku.productName}>
                    {sku.productName}
                  </TableCell>
                  <TableCell className="text-right text-[#263444] text-sm">{sku.unitsNeeded}</TableCell>
                  <TableCell className="text-sm">
                    <SourceLocationsCell locations={sku.sourceLocations} />
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <span className="text-[#6de5a2] font-medium">{sku.currentInventory}</span>
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

export function StationResults({ results }: StationResultsProps) {
  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#e2e8f0] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3281fd]/10 rounded-lg">
                <Layers className="w-5 h-5 text-[#3281fd]" />
              </div>
              <div>
                <p className="text-xs text-[#6b7a8c] uppercase tracking-wider font-medium">Stations</p>
                <p className="text-2xl font-bold text-[#000000]">{results.stations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e2e8f0] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#6de5a2]/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-[#6de5a2]" />
              </div>
              <div>
                <p className="text-xs text-[#6b7a8c] uppercase tracking-wider font-medium">Total Orders Fulfilled</p>
                <p className="text-2xl font-bold text-[#000000]">{results.totalOrdersFulfilled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e2e8f0] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3281fd]/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-[#3281fd]" />
              </div>
              <div>
                <p className="text-xs text-[#6b7a8c] uppercase tracking-wider font-medium">Fulfillment Rate</p>
                <p className="text-2xl font-bold text-[#000000]">{results.fulfillmentRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e2e8f0] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#ffce75]/10 rounded-lg">
                <Boxes className="w-5 h-5 text-[#ffce75]" />
              </div>
              <div>
                <p className="text-xs text-[#6b7a8c] uppercase tracking-wider font-medium">Shared SKUs</p>
                <p className="text-2xl font-bold text-[#000000]">{results.skusAcrossMultipleStations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Distribution */}
      <Card className="bg-white border-[#e2e8f0] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#000000] text-base">Order Distribution by Station</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {results.stations.map((station, index) => {
              const percentage = results.totalOrdersAnalyzed > 0 
                ? (station.orderCount / results.totalOrdersAnalyzed * 100).toFixed(1)
                : '0'
              return (
                <div key={station.stationId} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-[#3281fd]' : 
                    index === 1 ? 'bg-[#6de5a2]' : 
                    index === 2 ? 'bg-[#ffce75]' : 
                    index === 3 ? 'bg-[#ef5252]' : 'bg-[#c0ccdb]'
                  }`} />
                  <span className="text-sm text-[#263444]">
                    {station.stationName}: <strong>{station.orderCount}</strong> ({percentage}%)
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* SKUs at Multiple Stations */}
      {results.skusAcrossMultipleStations.length > 0 && (
        <Accordion type="single" collapsible className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm">
          <AccordionItem value="shared-skus" className="border-none">
            <AccordionTrigger className="px-4 py-3 hover:bg-[#f4f7fa] text-[#000000]">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#ffce75]" />
                SKUs Stocked at Multiple Stations ({results.skusAcrossMultipleStations.length})
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {results.skusAcrossMultipleStations.map(sku => (
                  <Badge key={sku} variant="outline" className="border-[#ffce75]/50 text-[#b38f52] bg-[#ffce75]/10 font-mono">
                    {sku}
                  </Badge>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Unfulfilled Orders Warning */}
      {results.unfulfilledOrders.length > 0 && (
        <Card className="bg-[#ef5252]/5 border-[#ef5252]/30 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#ef5252] text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Unfulfilled Orders ({results.unfulfilledOrders.length})
              </CardTitle>
              <OrdersDialog
                orders={results.unfulfilledOrders}
                title="Unfulfilled Orders"
                trigger={
                  <Button variant="outline" size="sm" className="border-[#ef5252]/50 text-[#ef5252] hover:bg-[#ef5252]/10">
                    <Eye className="w-4 h-4 mr-1" />
                    View All
                  </Button>
                }
              />
            </div>
            <CardDescription className="text-[#6b7a8c]">
              These orders cannot be fulfilled by any single station due to missing SKUs or insufficient inventory.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Station Cards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {results.stations.map((station, index) => (
          <StationCard key={station.stationId} station={station} stationIndex={index} />
        ))}
      </div>
    </div>
  )
}
