'use client'

import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'
import type { MultiStationOutput } from '@/lib/analysis/station-optimizer'
import { toast } from 'sonner'

interface StationExportButtonsProps {
  analysisResults: MultiStationOutput
}

function generateStationsCSV(results: MultiStationOutput): string {
  const lines: string[] = []
  
  // Summary Section
  lines.push('MULTI-STATION OPTIMIZATION SUMMARY')
  lines.push('')
  lines.push('Metric,Value')
  lines.push(`Total Stations,${results.stations.length}`)
  lines.push(`Total Orders Fulfilled,${results.totalOrdersFulfilled}`)
  lines.push(`Total Orders Analyzed,${results.totalOrdersAnalyzed}`)
  lines.push(`Fulfillment Rate,${results.fulfillmentRate.toFixed(1)}%`)
  lines.push(`SKUs at Multiple Stations,${results.skusAcrossMultipleStations.length}`)
  lines.push(`Unfulfilled Orders,${results.unfulfilledOrders.length}`)
  lines.push('')
  lines.push('')
  
  // Station Breakdown
  lines.push('STATION BREAKDOWN')
  lines.push('')
  lines.push('Station,SKU Slots,SKUs Used,Orders Fulfillable')
  for (const station of results.stations) {
    lines.push(`${station.stationName},${station.skuSlots},${station.skus.length},${station.orderCount}`)
  }
  lines.push('')
  lines.push('')
  
  // SKUs per Station
  for (const station of results.stations) {
    lines.push(`${station.stationName.toUpperCase()} - SKU LIST`)
    lines.push('')
    lines.push('#,SKU,Product Name,Orders at Station,Current Inventory')
    station.skus.forEach((sku, index) => {
      // Escape product name for CSV
      const productName = sku.productName.includes(',') 
        ? `"${sku.productName.replace(/"/g, '""')}"` 
        : sku.productName
      lines.push(`${index + 1},${sku.sku},${productName},${sku.ordersAtStation},${sku.currentInventory}`)
    })
    lines.push('')
    lines.push('')
  }
  
  // Shared SKUs
  if (results.skusAcrossMultipleStations.length > 0) {
    lines.push('SKUS AT MULTIPLE STATIONS')
    lines.push('')
    lines.push('SKU')
    for (const sku of results.skusAcrossMultipleStations) {
      lines.push(sku)
    }
    lines.push('')
    lines.push('')
  }
  
  // Orders per Station
  for (const station of results.stations) {
    lines.push(`${station.stationName.toUpperCase()} - FULFILLABLE ORDERS (${station.orderCount})`)
    lines.push('')
    lines.push('Order Number')
    for (const order of station.ordersFulfilled) {
      lines.push(order)
    }
    lines.push('')
    lines.push('')
  }
  
  // Unfulfilled Orders
  if (results.unfulfilledOrders.length > 0) {
    lines.push('UNFULFILLED ORDERS')
    lines.push('')
    lines.push('Order Number')
    for (const order of results.unfulfilledOrders) {
      lines.push(order)
    }
  }
  
  return lines.join('\n')
}

function getTimestampString(): string {
  const now = new Date()
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

export function StationExportButtons({ analysisResults }: StationExportButtonsProps) {
  const handleExportCSV = () => {
    const csv = generateStationsCSV(analysisResults)
    const stationCount = analysisResults.stations.length
    const filename = `station-optimization-${stationCount}-stations-${getTimestampString()}.csv`
    downloadCSV(csv, filename)
    toast.success('CSV exported successfully')
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCSV}
        className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa]"
      >
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa]"
      >
        <Printer className="w-4 h-4 mr-2" />
        Print
      </Button>
    </div>
  )
}
