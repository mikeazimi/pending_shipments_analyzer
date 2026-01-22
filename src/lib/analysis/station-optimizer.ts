import type { Order, SkuInventory } from '@/lib/parsers/types'

export interface StationConfig {
  id: number
  name: string
  skuSlots: number
}

export interface StationResult {
  stationId: number
  stationName: string
  skuSlots: number
  skus: StationSkuResult[]
  ordersFulfilled: string[]
  orderCount: number
}

export interface StationSkuResult {
  sku: string
  productName: string
  unitsNeeded: number
  currentInventory: number
  ordersAtStation: number // How many orders at this station need this SKU
}

export interface MultiStationOutput {
  stations: StationResult[]
  totalOrdersFulfilled: number
  totalOrdersAnalyzed: number
  fulfillmentRate: number
  skusAcrossMultipleStations: string[] // SKUs that appear at 2+ stations
  unfulfilledOrders: string[]
}

/**
 * Get all unique SKUs needed for an order
 */
function getOrderSkus(order: Order): Set<string> {
  return new Set(order.lineItems.map(li => li.sku))
}

/**
 * Check if a station can fulfill an order (has all required SKUs with sufficient inventory)
 */
function canStationFulfillOrder(
  order: Order,
  stationSkus: Set<string>,
  inventoryMap: Map<string, SkuInventory>
): boolean {
  for (const lineItem of order.lineItems) {
    if (!stationSkus.has(lineItem.sku)) {
      return false
    }
    const inventory = inventoryMap.get(lineItem.sku)?.totalSellableUnits ?? 0
    if (inventory < lineItem.quantity) {
      return false
    }
  }
  return true
}

/**
 * Calculate SKU demand across orders
 */
function calculateSkuDemand(orders: Order[]): Map<string, { 
  sku: string
  productName: string
  totalUnitsNeeded: number
  orderCount: number
  orders: Set<string>
}> {
  const demandMap = new Map<string, {
    sku: string
    productName: string
    totalUnitsNeeded: number
    orderCount: number
    orders: Set<string>
  }>()

  for (const order of orders) {
    for (const lineItem of order.lineItems) {
      const existing = demandMap.get(lineItem.sku)
      if (existing) {
        existing.totalUnitsNeeded += lineItem.quantity
        existing.orders.add(order.orderNumber)
        existing.orderCount = existing.orders.size
      } else {
        demandMap.set(lineItem.sku, {
          sku: lineItem.sku,
          productName: lineItem.productName,
          totalUnitsNeeded: lineItem.quantity,
          orderCount: 1,
          orders: new Set([order.orderNumber]),
        })
      }
    }
  }

  return demandMap
}

/**
 * Calculate how many NEW orders would be fulfillable if we add a SKU to a station
 */
function calculateIncrementalOrdersForStation(
  candidateSku: string,
  currentStationSkus: Set<string>,
  availableOrders: Order[],
  inventoryMap: Map<string, SkuInventory>,
  alreadyFulfilledGlobally: Set<string>
): { incrementalOrders: number; ordersFulfilled: string[] } {
  const testSkus = new Set(currentStationSkus)
  testSkus.add(candidateSku)
  
  const ordersFulfilled: string[] = []
  
  for (const order of availableOrders) {
    if (alreadyFulfilledGlobally.has(order.orderNumber)) continue
    
    if (canStationFulfillOrder(order, testSkus, inventoryMap)) {
      ordersFulfilled.push(order.orderNumber)
    }
  }
  
  return { incrementalOrders: ordersFulfilled.length, ordersFulfilled }
}

/**
 * Greedy algorithm to assign SKUs to a single station
 */
function optimizeStation(
  stationConfig: StationConfig,
  orders: Order[],
  inventoryMap: Map<string, SkuInventory>,
  globallyFulfilledOrders: Set<string>,
  skuDemand: Map<string, { sku: string; productName: string; totalUnitsNeeded: number; orders: Set<string> }>
): StationResult {
  const stationSkus = new Set<string>()
  const skuResults: StationSkuResult[] = []
  const stationOrders = new Set<string>()
  
  // Get SKUs that have inventory
  const availableSkus = Array.from(skuDemand.keys()).filter(sku => {
    const inventory = inventoryMap.get(sku)?.totalSellableUnits ?? 0
    return inventory > 0
  })
  
  // Filter orders to those not yet fulfilled globally
  const availableOrders = orders.filter(o => !globallyFulfilledOrders.has(o.orderNumber))
  
  while (stationSkus.size < stationConfig.skuSlots && availableSkus.length > 0) {
    let bestSku: string | null = null
    let bestIncrementalOrders = -1
    let bestOrdersFulfilled: string[] = []
    
    // Find SKU that unlocks the most new orders for THIS station
    for (const sku of availableSkus) {
      if (stationSkus.has(sku)) continue
      
      const { incrementalOrders, ordersFulfilled } = calculateIncrementalOrdersForStation(
        sku,
        stationSkus,
        availableOrders,
        inventoryMap,
        globallyFulfilledOrders
      )
      
      if (incrementalOrders > bestIncrementalOrders) {
        bestIncrementalOrders = incrementalOrders
        bestSku = sku
        bestOrdersFulfilled = ordersFulfilled
      }
    }
    
    // If no SKU unlocks new orders, try adding SKUs that are part of unfulfilled orders
    if (bestSku === null || bestIncrementalOrders === 0) {
      // Find a SKU that's needed by orders we haven't fulfilled yet
      for (const order of availableOrders) {
        if (stationOrders.has(order.orderNumber)) continue
        if (globallyFulfilledOrders.has(order.orderNumber)) continue
        
        for (const lineItem of order.lineItems) {
          if (!stationSkus.has(lineItem.sku) && availableSkus.includes(lineItem.sku)) {
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
    
    // Add the SKU to the station
    stationSkus.add(bestSku)
    const demand = skuDemand.get(bestSku)!
    
    // Mark orders as fulfilled by this station
    for (const orderNum of bestOrdersFulfilled) {
      stationOrders.add(orderNum)
      globallyFulfilledOrders.add(orderNum)
    }
    
    // Calculate orders at this station that need this SKU
    const ordersAtStation = Array.from(stationOrders).filter(orderNum => {
      const order = orders.find(o => o.orderNumber === orderNum)
      return order?.lineItems.some(li => li.sku === bestSku)
    }).length
    
    skuResults.push({
      sku: bestSku,
      productName: demand.productName,
      unitsNeeded: demand.totalUnitsNeeded,
      currentInventory: inventoryMap.get(bestSku)?.totalSellableUnits ?? 0,
      ordersAtStation,
    })
    
    // Remove from available
    const idx = availableSkus.indexOf(bestSku)
    if (idx > -1) availableSkus.splice(idx, 1)
  }
  
  // Recalculate final orders this station can fulfill
  const finalOrders: string[] = []
  for (const order of orders) {
    if (canStationFulfillOrder(order, stationSkus, inventoryMap)) {
      finalOrders.push(order.orderNumber)
    }
  }
  
  return {
    stationId: stationConfig.id,
    stationName: stationConfig.name,
    skuSlots: stationConfig.skuSlots,
    skus: skuResults,
    ordersFulfilled: finalOrders,
    orderCount: finalOrders.length,
  }
}

/**
 * Multi-station optimization with balancing
 * Uses a round-robin approach with greedy selection to balance load
 */
export function optimizeMultipleStations(
  stationConfigs: StationConfig[],
  orders: Order[],
  inventoryMap: Map<string, SkuInventory>
): MultiStationOutput {
  const skuDemand = calculateSkuDemand(orders)
  const globallyFulfilledOrders = new Set<string>()
  const stationResults: StationResult[] = []
  
  // Sort stations by slot count (larger first for better initial coverage)
  const sortedConfigs = [...stationConfigs].sort((a, b) => b.skuSlots - a.skuSlots)
  
  // Initialize station data
  const stationData: {
    config: StationConfig
    skus: Set<string>
    orders: Set<string>
    skuResults: StationSkuResult[]
  }[] = sortedConfigs.map(config => ({
    config,
    skus: new Set<string>(),
    orders: new Set<string>(),
    skuResults: [],
  }))
  
  // Get all SKUs with inventory
  const allAvailableSkus = Array.from(skuDemand.keys()).filter(sku => {
    const inventory = inventoryMap.get(sku)?.totalSellableUnits ?? 0
    return inventory > 0
  })
  
  // Round-robin assignment with greedy selection
  let totalSlotsUsed = 0
  const totalSlots = sortedConfigs.reduce((sum, c) => sum + c.skuSlots, 0)
  let roundRobinIndex = 0
  
  while (totalSlotsUsed < totalSlots) {
    const station = stationData[roundRobinIndex]
    
    // Skip if station is full
    if (station.skus.size >= station.config.skuSlots) {
      roundRobinIndex = (roundRobinIndex + 1) % stationData.length
      
      // Check if all stations are full
      const allFull = stationData.every(s => s.skus.size >= s.config.skuSlots)
      if (allFull) break
      continue
    }
    
    // Find best SKU for this station
    let bestSku: string | null = null
    let bestScore = -1
    let bestOrdersFulfilled: string[] = []
    
    for (const sku of allAvailableSkus) {
      // Calculate benefit for this station
      const testSkus = new Set(station.skus)
      testSkus.add(sku)
      
      const newOrdersFulfilled: string[] = []
      for (const order of orders) {
        if (globallyFulfilledOrders.has(order.orderNumber)) continue
        if (station.orders.has(order.orderNumber)) continue
        
        if (canStationFulfillOrder(order, testSkus, inventoryMap)) {
          newOrdersFulfilled.push(order.orderNumber)
        }
      }
      
      // Score = new orders unlocked (prioritize stations with fewer orders for balance)
      const balancePenalty = station.orders.size / (orders.length + 1)
      const score = newOrdersFulfilled.length * (1 - balancePenalty * 0.1)
      
      if (score > bestScore) {
        bestScore = score
        bestSku = sku
        bestOrdersFulfilled = newOrdersFulfilled
      }
    }
    
    if (!bestSku) {
      // Try to add any SKU that's part of unfulfilled orders for this station
      for (const order of orders) {
        if (globallyFulfilledOrders.has(order.orderNumber)) continue
        
        for (const lineItem of order.lineItems) {
          if (!station.skus.has(lineItem.sku) && allAvailableSkus.includes(lineItem.sku)) {
            bestSku = lineItem.sku
            break
          }
        }
        if (bestSku) break
      }
    }
    
    if (!bestSku) {
      roundRobinIndex = (roundRobinIndex + 1) % stationData.length
      continue
    }
    
    // Add SKU to station
    station.skus.add(bestSku)
    totalSlotsUsed++
    
    const demand = skuDemand.get(bestSku)!
    
    // Mark new orders as fulfilled
    for (const orderNum of bestOrdersFulfilled) {
      station.orders.add(orderNum)
      globallyFulfilledOrders.add(orderNum)
    }
    
    station.skuResults.push({
      sku: bestSku,
      productName: demand.productName,
      unitsNeeded: demand.totalUnitsNeeded,
      currentInventory: inventoryMap.get(bestSku)?.totalSellableUnits ?? 0,
      ordersAtStation: bestOrdersFulfilled.length,
    })
    
    // Move to next station (round-robin)
    roundRobinIndex = (roundRobinIndex + 1) % stationData.length
  }
  
  // Build final results
  for (const station of stationData) {
    // Recalculate final orders each station can fulfill
    const finalOrders: string[] = []
    for (const order of orders) {
      if (canStationFulfillOrder(order, station.skus, inventoryMap)) {
        finalOrders.push(order.orderNumber)
      }
    }
    
    // Update order counts for each SKU
    for (const skuResult of station.skuResults) {
      skuResult.ordersAtStation = finalOrders.filter(orderNum => {
        const order = orders.find(o => o.orderNumber === orderNum)
        return order?.lineItems.some(li => li.sku === skuResult.sku)
      }).length
    }
    
    // Sort SKUs by orders at station (descending)
    station.skuResults.sort((a, b) => b.ordersAtStation - a.ordersAtStation)
    
    stationResults.push({
      stationId: station.config.id,
      stationName: station.config.name,
      skuSlots: station.config.skuSlots,
      skus: station.skuResults,
      ordersFulfilled: finalOrders,
      orderCount: finalOrders.length,
    })
  }
  
  // Sort by original station ID order
  stationResults.sort((a, b) => a.stationId - b.stationId)
  
  // Find SKUs that appear at multiple stations
  const skuStationCount = new Map<string, number>()
  for (const station of stationResults) {
    for (const sku of station.skus) {
      skuStationCount.set(sku.sku, (skuStationCount.get(sku.sku) ?? 0) + 1)
    }
  }
  const skusAcrossMultipleStations = Array.from(skuStationCount.entries())
    .filter(([, count]) => count > 1)
    .map(([sku]) => sku)
  
  // Calculate unique fulfilled orders (avoid double counting)
  const uniqueFulfilledOrders = new Set<string>()
  for (const station of stationResults) {
    for (const order of station.ordersFulfilled) {
      uniqueFulfilledOrders.add(order)
    }
  }
  
  // Find unfulfilled orders
  const unfulfilledOrders = orders
    .filter(o => !uniqueFulfilledOrders.has(o.orderNumber))
    .map(o => o.orderNumber)
  
  return {
    stations: stationResults,
    totalOrdersFulfilled: uniqueFulfilledOrders.size,
    totalOrdersAnalyzed: orders.length,
    fulfillmentRate: orders.length > 0 ? (uniqueFulfilledOrders.size / orders.length) * 100 : 0,
    skusAcrossMultipleStations,
    unfulfilledOrders,
  }
}
