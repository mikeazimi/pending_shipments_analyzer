import type { Order, SkuInventory, SkuAnalysisResult, AnalysisOutput } from '@/lib/parsers/types'

interface SkuDemand {
  sku: string
  productName: string
  totalUnitsNeeded: number
  ordersContaining: Set<string>
}

function getTier(ordersImpacted: number): 'critical' | 'high' | 'medium' | 'low' {
  if (ordersImpacted > 10) return 'critical'
  if (ordersImpacted >= 5) return 'high'
  if (ordersImpacted >= 2) return 'medium'
  return 'low'
}

/**
 * Calculate SKU demand across all orders
 * Returns a map of SKU -> demand info
 */
function calculateSkuDemand(orders: Order[]): Map<string, SkuDemand> {
  const demandMap = new Map<string, SkuDemand>()

  for (const order of orders) {
    for (const lineItem of order.lineItems) {
      const existing = demandMap.get(lineItem.sku)

      if (existing) {
        existing.totalUnitsNeeded += lineItem.quantity
        existing.ordersContaining.add(order.orderNumber)
      } else {
        demandMap.set(lineItem.sku, {
          sku: lineItem.sku,
          productName: lineItem.productName,
          totalUnitsNeeded: lineItem.quantity,
          ordersContaining: new Set([order.orderNumber]),
        })
      }
    }
  }

  return demandMap
}

/**
 * Check if an order can be fulfilled with given inventory
 */
function canFulfillOrder(
  order: Order,
  inventoryMap: Map<string, SkuInventory>,
  reservedInventory: Map<string, number>
): boolean {
  for (const lineItem of order.lineItems) {
    const available = inventoryMap.get(lineItem.sku)?.totalSellableUnits ?? 0
    const reserved = reservedInventory.get(lineItem.sku) ?? 0
    const remaining = available - reserved

    if (remaining < lineItem.quantity) {
      return false
    }
  }
  return true
}

/**
 * Get the SKUs that are missing or insufficient for an order
 */
function getMissingSkusForOrder(
  order: Order,
  inventoryMap: Map<string, SkuInventory>,
  reservedInventory: Map<string, number>
): { sku: string; needed: number; available: number; gap: number }[] {
  const missing: { sku: string; needed: number; available: number; gap: number }[] = []

  for (const lineItem of order.lineItems) {
    const available = inventoryMap.get(lineItem.sku)?.totalSellableUnits ?? 0
    const reserved = reservedInventory.get(lineItem.sku) ?? 0
    const remaining = available - reserved

    if (remaining < lineItem.quantity) {
      missing.push({
        sku: lineItem.sku,
        needed: lineItem.quantity,
        available: remaining,
        gap: lineItem.quantity - remaining,
      })
    }
  }

  return missing
}

/**
 * Unconstrained analysis: rank SKUs by how many orders they appear in
 * (ignoring inventory - theoretical impact)
 */
export function analyzeUnconstrainedDemand(orders: Order[]): SkuAnalysisResult[] {
  const demandMap = calculateSkuDemand(orders)

  const results: SkuAnalysisResult[] = []

  for (const [sku, demand] of demandMap) {
    results.push({
      sku,
      productName: demand.productName,
      ordersImpacted: demand.ordersContaining.size,
      totalUnitsNeeded: demand.totalUnitsNeeded,
      currentInventory: 0, // Not applicable for unconstrained
      inventoryGap: demand.totalUnitsNeeded, // All units needed
      tier: getTier(demand.ordersContaining.size),
      ordersCanComplete: Array.from(demand.ordersContaining),
    })
  }

  // Sort by orders impacted (descending)
  results.sort((a, b) => b.ordersImpacted - a.ordersImpacted)

  return results
}

/**
 * Inventory-constrained analysis: identify which SKUs, if restocked,
 * would unlock the most orders for fulfillment
 */
export function analyzeInventoryConstrained(
  orders: Order[],
  inventoryMap: Map<string, SkuInventory>
): SkuAnalysisResult[] {
  // Track how many orders each SKU is blocking
  const skuBlockingOrders = new Map<string, Set<string>>()
  const skuProductNames = new Map<string, string>()
  const skuTotalNeeded = new Map<string, number>()

  // Reserved inventory for orders that CAN be fulfilled
  const reservedInventory = new Map<string, number>()

  // First pass: identify orders that can be fulfilled and reserve inventory
  const fulfillableOrders: Order[] = []
  const blockedOrders: Order[] = []

  for (const order of orders) {
    if (canFulfillOrder(order, inventoryMap, reservedInventory)) {
      fulfillableOrders.push(order)
      // Reserve the inventory
      for (const lineItem of order.lineItems) {
        const current = reservedInventory.get(lineItem.sku) ?? 0
        reservedInventory.set(lineItem.sku, current + lineItem.quantity)
      }
    } else {
      blockedOrders.push(order)
    }
  }

  // Second pass: for blocked orders, identify which SKUs are blocking them
  for (const order of blockedOrders) {
    const missingSkus = getMissingSkusForOrder(order, inventoryMap, reservedInventory)

    for (const missing of missingSkus) {
      // Track which orders this SKU is blocking
      if (!skuBlockingOrders.has(missing.sku)) {
        skuBlockingOrders.set(missing.sku, new Set())
      }
      skuBlockingOrders.get(missing.sku)!.add(order.orderNumber)

      // Track product names
      const lineItem = order.lineItems.find(li => li.sku === missing.sku)
      if (lineItem) {
        skuProductNames.set(missing.sku, lineItem.productName)
      }

      // Track total units needed
      const currentNeeded = skuTotalNeeded.get(missing.sku) ?? 0
      skuTotalNeeded.set(missing.sku, currentNeeded + missing.gap)
    }
  }

  // Build results
  const results: SkuAnalysisResult[] = []

  for (const [sku, orderSet] of skuBlockingOrders) {
    const currentInventory = inventoryMap.get(sku)?.totalSellableUnits ?? 0
    const totalNeeded = skuTotalNeeded.get(sku) ?? 0

    results.push({
      sku,
      productName: skuProductNames.get(sku) || sku,
      ordersImpacted: orderSet.size,
      totalUnitsNeeded: totalNeeded,
      currentInventory,
      inventoryGap: Math.max(0, totalNeeded - currentInventory),
      tier: getTier(orderSet.size),
      ordersCanComplete: Array.from(orderSet),
    })
  }

  // Sort by orders impacted (descending)
  results.sort((a, b) => b.ordersImpacted - a.ordersImpacted)

  return results
}

/**
 * Run full analysis with both views
 */
export function runFullAnalysis(
  orders: Order[],
  inventoryMap: Map<string, SkuInventory> | null
): AnalysisOutput {
  const unconstrainedResults = analyzeUnconstrainedDemand(orders)

  // If no inventory data, only return unconstrained results
  const inventoryConstrainedResults = inventoryMap
    ? analyzeInventoryConstrained(orders, inventoryMap)
    : []

  // Calculate summary stats
  const ordersReadyToFulfill = inventoryMap
    ? orders.filter(o => canFulfillOrder(o, inventoryMap, new Map())).length
    : 0

  const summary = {
    totalOrders: orders.length,
    totalOrdersAnalyzed: orders.length,
    ordersReadyToFulfill,
    ordersNeedingStock: orders.length - ordersReadyToFulfill,
    uniqueSkusNeeded: unconstrainedResults.length,
    topMissingSku: inventoryConstrainedResults[0]?.sku ?? null,
  }

  return {
    unconstrainedResults,
    inventoryConstrainedResults,
    summary,
  }
}

/**
 * Get orders that would be unlocked if a specific SKU was fully stocked
 */
export function getOrdersUnlockedBySku(
  sku: string,
  orders: Order[],
  inventoryMap: Map<string, SkuInventory>
): Order[] {
  // Create a hypothetical inventory where the SKU has unlimited stock
  const hypotheticalInventory = new Map(inventoryMap)
  hypotheticalInventory.set(sku, {
    sku,
    totalSellableUnits: 999999,
    locations: [],
  })

  return orders.filter(order => {
    // Check if this order contains the SKU
    const hasThisSku = order.lineItems.some(li => li.sku === sku)
    if (!hasThisSku) return false

    // Check if the order would be fulfillable with the hypothetical inventory
    return canFulfillOrder(order, hypotheticalInventory, new Map())
  })
}
