import type { SkuAnalysisResult, AnalysisOutput, OptimalSkuResult } from '@/lib/parsers/types'

/**
 * Convert analysis results to CSV format
 */
export function resultsToCSV(
  results: SkuAnalysisResult[],
  includeInventory: boolean = false
): string {
  const headers = [
    'Rank',
    'SKU',
    'Product Name',
    'Orders Impacted',
    'Units Needed',
    ...(includeInventory ? ['Current Stock', 'Inventory Gap'] : []),
    'Priority Tier',
  ]

  const rows = results.map((result, index) => [
    index + 1,
    `"${result.sku}"`,
    `"${result.productName.replace(/"/g, '""')}"`,
    result.ordersImpacted,
    result.totalUnitsNeeded,
    ...(includeInventory ? [result.currentInventory, result.inventoryGap] : []),
    result.tier,
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

/**
 * Convert optimal SKU results to CSV format
 */
export function optimalSkusToCSV(results: OptimalSkuResult[]): string {
  const headers = [
    'Rank',
    'SKU',
    'Product Name',
    'Orders Impacted',
    'Incremental Orders Unlocked',
    'Units Needed',
    'Current Inventory',
    'Orders Fulfilled',
  ]

  const rows = results.map((result, index) => [
    index + 1,
    `"${result.sku}"`,
    `"${result.productName.replace(/"/g, '""')}"`,
    result.ordersImpacted,
    result.incrementalOrdersUnlocked,
    result.totalUnitsNeeded,
    result.currentInventory,
    `"${result.ordersFulfilled.join(', ')}"`,
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

/**
 * Generate full analysis report CSV
 */
export function generateFullReport(output: AnalysisOutput): string {
  const summarySection = [
    '# Analysis Summary',
    `Total Orders,${output.summary.totalOrders}`,
    `Orders Analyzed,${output.summary.totalOrdersAnalyzed}`,
    `Ready to Fulfill,${output.summary.ordersReadyToFulfill}`,
    `Needing Stock,${output.summary.ordersNeedingStock}`,
    `Unique SKUs,${output.summary.uniqueSkusNeeded}`,
    `Top Missing SKU,${output.summary.topMissingSku || 'N/A'}`,
    '',
  ]

  const unconstrainedSection = [
    '# Unconstrained SKU Demand',
    resultsToCSV(output.unconstrainedResults, false),
    '',
  ]

  const constrainedSection =
    output.inventoryConstrainedResults.length > 0
      ? [
          '# Inventory-Constrained Analysis',
          resultsToCSV(output.inventoryConstrainedResults, true),
          '',
        ]
      : []

  // SKU Slots optimization results
  const skuSlotsSection = output.skuSlotsResults
    ? [
        '# SKU Slots Optimization',
        `SKU Slots Available,${output.skuSlotsResults.skuSlotCount}`,
        `Total Orders Fulfilled,${output.skuSlotsResults.totalOrdersFulfilled}`,
        `Fulfillment Rate,${output.skuSlotsResults.fulfillmentRate.toFixed(1)}%`,
        `SKUs to Stock,${output.skuSlotsResults.skusToStock.length}`,
        `SKUs Awaiting Inventory,${output.skuSlotsResults.skusToPrioritizeReceiving.length}`,
        '',
        '## SKUs to Stock in Pick Area',
        optimalSkusToCSV(output.skuSlotsResults.skusToStock),
        '',
        '## High-Impact SKUs Awaiting Inventory',
        optimalSkusToCSV(output.skuSlotsResults.skusToPrioritizeReceiving),
        '',
        '## Orders Fulfillable with Optimal SKU Set',
        `"${output.skuSlotsResults.ordersFulfilled.join('", "')}"`,
      ]
    : []

  return [...summarySection, ...unconstrainedSection, ...constrainedSection, ...skuSlotsSection].join('\n')
}

/**
 * Trigger CSV download in browser
 */
export function downloadCSV(content: string, filename: string): void {
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

/**
 * Generate timestamp string for filenames
 */
export function getTimestampString(): string {
  const now = new Date()
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
}
