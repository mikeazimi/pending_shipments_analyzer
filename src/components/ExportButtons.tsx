'use client'

import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'
import type { SkuSlotsOutput } from '@/lib/parsers/types'

interface ExportButtonsProps {
  analysisResults: SkuSlotsOutput
}

function generateSkuSlotsCSV(results: SkuSlotsOutput): string {
  const lines: string[] = []
  
  // Summary
  lines.push('# SKU Slots Analysis Summary')
  lines.push(`SKU Slots,${results.skuSlotCount}`)
  lines.push(`Orders Fulfilled,${results.totalOrdersFulfilled}`)
  lines.push(`Fulfillment Rate,${results.fulfillmentRate.toFixed(1)}%`)
  lines.push(`SKUs to Stock,${results.skusToStock.length}`)
  lines.push(`SKUs Needing Receiving,${results.skusToPrioritizeReceiving.length}`)
  lines.push('')
  
  // SKUs to Stock
  lines.push('# SKUs to Stock in Pick Area')
  lines.push('Rank,SKU,Product Name,Units Needed,Source Locations,Current Inventory,Orders Impacted,Incremental Orders')
  results.skusToStock.forEach((sku, index) => {
    // Format source locations as "LOC1 (qty) [overstock], LOC2 (qty) [pick]"
    const sourceLocationsStr = sku.sourceLocations && sku.sourceLocations.length > 0
      ? sku.sourceLocations.map(loc => 
          `${loc.location} (${loc.unitsToTake})${loc.isOverstock ? '' : ' [PICK]'}`
        ).join('; ')
      : 'N/A'
    lines.push([
      index + 1,
      `"${sku.sku}"`,
      `"${sku.productName.replace(/"/g, '""')}"`,
      sku.totalUnitsNeeded,
      `"${sourceLocationsStr}"`,
      sku.currentInventory,
      sku.ordersImpacted,
      sku.incrementalOrdersUnlocked,
    ].join(','))
  })
  lines.push('')
  
  // SKUs Needing Receiving
  if (results.skusToPrioritizeReceiving.length > 0) {
    lines.push('# High-Impact SKUs Awaiting Inventory (Prioritize Receiving)')
    lines.push('Rank,SKU,Product Name,Orders Blocked,Units Needed')
    results.skusToPrioritizeReceiving.forEach((sku, index) => {
      lines.push([
        index + 1,
        `"${sku.sku}"`,
        `"${sku.productName.replace(/"/g, '""')}"`,
        sku.incrementalOrdersUnlocked,
        sku.totalUnitsNeeded,
      ].join(','))
    })
    lines.push('')
  }
  
  // Orders that can be fulfilled
  lines.push('# Orders That Can Be Completely Fulfilled')
  lines.push('Order Number')
  results.ordersFulfilled.forEach(order => {
    lines.push(`"${order}"`)
  })
  
  return lines.join('\n')
}

function getTimestampString(): string {
  const now = new Date()
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function ExportButtons({ analysisResults }: ExportButtonsProps) {
  const handleExportCSV = () => {
    const csv = generateSkuSlotsCSV(analysisResults)
    const filename = `optimal-skus-${analysisResults.skuSlotCount}-slots-${getTimestampString()}.csv`
    downloadCSV(csv, filename)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCSV}
        className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa] hover:text-[#3281fd] hover:border-[#3281fd]"
      >
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa] hover:text-[#3281fd] hover:border-[#3281fd]"
      >
        <Printer className="w-4 h-4 mr-2" />
        Print
      </Button>
    </div>
  )
}
