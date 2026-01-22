import type { Order, SkuInventory, SkuAnalysisResult, AnalysisOutput, SkuSlotsOutput, OptimalSkuResult, SourceLocation } from '@/lib/parsers/types'
import { findSourceLocations } from '@/lib/parsers/inventory'

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

/**
 * Check if an order can be fulfilled with a given set of selected SKUs
 * (assuming unlimited inventory for selected SKUs)
 */
function canFulfillOrderWithSkuSet(
  order: Order,
  selectedSkus: Set<string>,
  inventoryMap: Map<string, SkuInventory>
): boolean {
  for (const lineItem of order.lineItems) {
    // If SKU is in our selected set, check if we have enough inventory
    if (selectedSkus.has(lineItem.sku)) {
      const available = inventoryMap.get(lineItem.sku)?.totalSellableUnits ?? 0
      if (available < lineItem.quantity) {
        return false
      }
    } else {
      // SKU not in our selected set - order can't be fulfilled
      return false
    }
  }
  return true
}

/**
 * Get all unique SKUs needed for an order
 */
function getSkusForOrder(order: Order): Set<string> {
  return new Set(order.lineItems.map(li => li.sku))
}

/**
 * Calculate total units needed for a SKU across fulfilled orders
 */
function calculateUnitsNeededForOrders(
  sku: string,
  orders: Order[],
  alreadyFulfilledOrders: Set<string>,
  newlyFulfilledOrders: string[]
): number {
  let totalUnits = 0
  const relevantOrders = new Set([...alreadyFulfilledOrders, ...newlyFulfilledOrders])
  
  for (const order of orders) {
    if (relevantOrders.has(order.orderNumber)) {
      for (const lineItem of order.lineItems) {
        if (lineItem.sku === sku) {
          totalUnits += lineItem.quantity
        }
      }
    }
  }
  
  return totalUnits
}

/**
 * Calculate how many new orders would be fulfilled by adding a SKU to the selected set
 */
function calculateIncrementalOrders(
  candidateSku: string,
  currentSelectedSkus: Set<string>,
  orders: Order[],
  inventoryMap: Map<string, SkuInventory>,
  alreadyFulfilledOrders: Set<string>
): { incrementalOrders: number; ordersFulfilled: string[] } {
  const testSet = new Set(currentSelectedSkus)
  testSet.add(candidateSku)
  
  const ordersFulfilled: string[] = []
  
  for (const order of orders) {
    // Skip already fulfilled orders
    if (alreadyFulfilledOrders.has(order.orderNumber)) continue
    
    // Check if all SKUs for this order are in our test set AND have sufficient inventory
    const orderSkus = getSkusForOrder(order)
    let canFulfill = true
    
    for (const sku of orderSkus) {
      if (!testSet.has(sku)) {
        canFulfill = false
        break
      }
      // Check inventory for this SKU
      const needed = order.lineItems.find(li => li.sku === sku)?.quantity ?? 0
      const available = inventoryMap.get(sku)?.totalSellableUnits ?? 0
      if (available < needed) {
        canFulfill = false
        break
      }
    }
    
    if (canFulfill) {
      ordersFulfilled.push(order.orderNumber)
    }
  }
  
  return { incrementalOrders: ordersFulfilled.length, ordersFulfilled }
}

/**
 * Greedy algorithm to find optimal SKU set for maximum order fulfillment
 * Only considers SKUs that have sellable inventory
 */
export function findOptimalSkuSet(
  orders: Order[],
  inventoryMap: Map<string, SkuInventory>,
  maxSkuSlots: number
): SkuSlotsOutput {
  const demandMap = calculateSkuDemand(orders)
  
  // Separate SKUs into those with inventory and those without
  const skusWithInventory: string[] = []
  const skusWithoutInventory: string[] = []
  
  for (const [sku] of demandMap) {
    const inventory = inventoryMap.get(sku)?.totalSellableUnits ?? 0
    if (inventory > 0) {
      skusWithInventory.push(sku)
    } else {
      skusWithoutInventory.push(sku)
    }
  }
  
  // Greedy selection for SKUs WITH inventory
  const selectedSkus = new Set<string>()
  const skusToStock: OptimalSkuResult[] = []
  const fulfilledOrders = new Set<string>()
  
  while (selectedSkus.size < maxSkuSlots && skusWithInventory.length > 0) {
    let bestSku: string | null = null
    let bestIncrementalOrders = -1
    let bestOrdersFulfilled: string[] = []
    
    // Find the SKU that would unlock the most additional orders
    for (const sku of skusWithInventory) {
      if (selectedSkus.has(sku)) continue
      
      const { incrementalOrders, ordersFulfilled } = calculateIncrementalOrders(
        sku,
        selectedSkus,
        orders,
        inventoryMap,
        fulfilledOrders
      )
      
      if (incrementalOrders > bestIncrementalOrders) {
        bestIncrementalOrders = incrementalOrders
        bestSku = sku
        bestOrdersFulfilled = ordersFulfilled
      }
    }
    
    // If no SKU can unlock new orders, try to add SKUs that are part of unfulfilled orders
    if (bestSku === null || bestIncrementalOrders === 0) {
      // Find SKUs that appear in orders we haven't fulfilled yet
      for (const order of orders) {
        if (fulfilledOrders.has(order.orderNumber)) continue
        
        for (const lineItem of order.lineItems) {
          if (!selectedSkus.has(lineItem.sku) && skusWithInventory.includes(lineItem.sku)) {
            const inventory = inventoryMap.get(lineItem.sku)?.totalSellableUnits ?? 0
            if (inventory >= lineItem.quantity) {
              bestSku = lineItem.sku
              break
            }
          }
        }
        if (bestSku) break
      }
    }
    
    if (!bestSku) break
    
    // Add the best SKU to our selection
    selectedSkus.add(bestSku)
    const demand = demandMap.get(bestSku)!
    
    // Mark orders as fulfilled
    for (const orderNum of bestOrdersFulfilled) {
      fulfilledOrders.add(orderNum)
    }
    
    // Calculate units needed for the orders this SKU helps fulfill
    const unitsNeededForStation = calculateUnitsNeededForOrders(bestSku, orders, fulfilledOrders, bestOrdersFulfilled)
    
    skusToStock.push({
      sku: bestSku,
      productName: demand.productName,
      ordersImpacted: demand.ordersContaining.size,
      ordersFulfilled: bestOrdersFulfilled,
      totalUnitsNeeded: demand.totalUnitsNeeded,
      currentInventory: inventoryMap.get(bestSku)?.totalSellableUnits ?? 0,
      incrementalOrdersUnlocked: bestIncrementalOrders,
      sourceLocations: findSourceLocations(inventoryMap, bestSku, unitsNeededForStation),
    })
    
    // Remove from candidates
    const idx = skusWithInventory.indexOf(bestSku)
    if (idx > -1) skusWithInventory.splice(idx, 1)
  }
  
  // Build list of SKUs to prioritize receiving (no inventory but high impact)
  const skusToPrioritizeReceiving: OptimalSkuResult[] = []
  
  for (const sku of skusWithoutInventory) {
    const demand = demandMap.get(sku)!
    
    // Calculate how many orders this SKU appears in that we couldn't fulfill
    const ordersBlocked = Array.from(demand.ordersContaining).filter(
      orderNum => !fulfilledOrders.has(orderNum)
    )
    
    if (ordersBlocked.length > 0) {
      skusToPrioritizeReceiving.push({
        sku,
        productName: demand.productName,
        ordersImpacted: demand.ordersContaining.size,
        ordersFulfilled: [], // Can't fulfill any since no inventory
        totalUnitsNeeded: demand.totalUnitsNeeded,
        currentInventory: 0,
        incrementalOrdersUnlocked: ordersBlocked.length,
      })
    }
  }
  
  // Sort by impact (orders blocked)
  skusToPrioritizeReceiving.sort((a, b) => b.incrementalOrdersUnlocked - a.incrementalOrdersUnlocked)
  
  // Calculate final fulfilled orders count
  const finalFulfilledOrders = new Set<string>()
  for (const order of orders) {
    if (canFulfillOrderWithSkuSet(order, selectedSkus, inventoryMap)) {
      finalFulfilledOrders.add(order.orderNumber)
    }
  }
  
  return {
    skuSlotCount: maxSkuSlots,
    skusToStock,
    skusToPrioritizeReceiving,
    ordersFulfilled: Array.from(finalFulfilledOrders),
    totalOrdersFulfilled: finalFulfilledOrders.size,
    totalOrdersPartiallyFulfilled: orders.length - finalFulfilledOrders.size,
    fulfillmentRate: orders.length > 0 
      ? (finalFulfilledOrders.size / orders.length) * 100 
      : 0,
  }
}
