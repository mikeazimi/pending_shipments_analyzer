import { describe, it, expect } from 'vitest'
import {
  analyzeUnconstrainedDemand,
  analyzeInventoryConstrained,
  runFullAnalysis,
  getOrdersUnlockedBySku,
} from '@/lib/analysis/sku-analyzer'
import type { Order, SkuInventory } from '@/lib/parsers/types'

// Helper to create test orders
function createOrder(
  orderNumber: string,
  lineItems: { sku: string; productName: string; quantity: number }[]
): Order {
  return {
    orderNumber,
    createdAt: '2026-01-22',
    orderDate: '2026-01-22',
    store: 'test-store',
    status: 'Test',
    readyToShip: true,
    hasTote: false,
    hasAllocatedLocations: false,
    lineItems,
  }
}

// Helper to create inventory map
function createInventoryMap(
  items: { sku: string; units: number }[]
): Map<string, SkuInventory> {
  const map = new Map<string, SkuInventory>()
  for (const item of items) {
    map.set(item.sku, {
      sku: item.sku,
      totalSellableUnits: item.units,
      locations: [{ location: 'TEST-LOC', units: item.units, pickable: true }],
    })
  }
  return map
}

describe('analyzeUnconstrainedDemand', () => {
  it('should rank SKUs by number of orders they appear in', () => {
    const orders = [
      createOrder('ORDER-1', [
        { sku: 'sku-a', productName: 'Product A', quantity: 2 },
        { sku: 'sku-b', productName: 'Product B', quantity: 1 },
      ]),
      createOrder('ORDER-2', [
        { sku: 'sku-a', productName: 'Product A', quantity: 1 },
        { sku: 'sku-c', productName: 'Product C', quantity: 3 },
      ]),
      createOrder('ORDER-3', [
        { sku: 'sku-a', productName: 'Product A', quantity: 1 },
      ]),
    ]

    const results = analyzeUnconstrainedDemand(orders)

    // sku-a appears in all 3 orders
    expect(results[0].sku).toBe('sku-a')
    expect(results[0].ordersImpacted).toBe(3)
    expect(results[0].totalUnitsNeeded).toBe(4) // 2 + 1 + 1

    // sku-b and sku-c each appear in 1 order
    expect(results.find(r => r.sku === 'sku-b')?.ordersImpacted).toBe(1)
    expect(results.find(r => r.sku === 'sku-c')?.ordersImpacted).toBe(1)
  })

  it('should assign correct tiers based on order count', () => {
    const orders = [
      // Create 12 orders with sku-critical
      ...Array.from({ length: 12 }, (_, i) =>
        createOrder(`ORDER-C${i}`, [{ sku: 'sku-critical', productName: 'Critical', quantity: 1 }])
      ),
      // Create 6 orders with sku-high
      ...Array.from({ length: 6 }, (_, i) =>
        createOrder(`ORDER-H${i}`, [{ sku: 'sku-high', productName: 'High', quantity: 1 }])
      ),
      // Create 3 orders with sku-medium
      ...Array.from({ length: 3 }, (_, i) =>
        createOrder(`ORDER-M${i}`, [{ sku: 'sku-medium', productName: 'Medium', quantity: 1 }])
      ),
      // Create 1 order with sku-low
      createOrder('ORDER-L1', [{ sku: 'sku-low', productName: 'Low', quantity: 1 }]),
    ]

    const results = analyzeUnconstrainedDemand(orders)

    expect(results.find(r => r.sku === 'sku-critical')?.tier).toBe('critical')
    expect(results.find(r => r.sku === 'sku-high')?.tier).toBe('high')
    expect(results.find(r => r.sku === 'sku-medium')?.tier).toBe('medium')
    expect(results.find(r => r.sku === 'sku-low')?.tier).toBe('low')
  })

  it('should track which orders each SKU appears in', () => {
    const orders = [
      createOrder('ORDER-1', [{ sku: 'sku-a', productName: 'A', quantity: 1 }]),
      createOrder('ORDER-2', [{ sku: 'sku-a', productName: 'A', quantity: 1 }]),
    ]

    const results = analyzeUnconstrainedDemand(orders)
    const skuA = results.find(r => r.sku === 'sku-a')

    expect(skuA?.ordersCanComplete).toContain('ORDER-1')
    expect(skuA?.ordersCanComplete).toContain('ORDER-2')
  })
})

describe('analyzeInventoryConstrained', () => {
  it('should identify SKUs that are blocking orders due to insufficient inventory', () => {
    const orders = [
      createOrder('ORDER-1', [
        { sku: 'sku-a', productName: 'Product A', quantity: 5 },
      ]),
      createOrder('ORDER-2', [
        { sku: 'sku-a', productName: 'Product A', quantity: 3 },
        { sku: 'sku-b', productName: 'Product B', quantity: 2 },
      ]),
    ]

    // Only 2 units of sku-a available
    const inventoryMap = createInventoryMap([
      { sku: 'sku-a', units: 2 },
      { sku: 'sku-b', units: 100 },
    ])

    const results = analyzeInventoryConstrained(orders, inventoryMap)

    // sku-a should be the only blocking SKU
    expect(results.length).toBe(1)
    expect(results[0].sku).toBe('sku-a')
    expect(results[0].ordersImpacted).toBe(2)
    expect(results[0].currentInventory).toBe(2)
  })

  it('should not list SKUs that have sufficient inventory', () => {
    const orders = [
      createOrder('ORDER-1', [
        { sku: 'sku-a', productName: 'Product A', quantity: 5 },
      ]),
    ]

    const inventoryMap = createInventoryMap([
      { sku: 'sku-a', units: 10 }, // More than enough
    ])

    const results = analyzeInventoryConstrained(orders, inventoryMap)

    expect(results.length).toBe(0)
  })

  it('should handle orders with multiple missing SKUs', () => {
    const orders = [
      createOrder('ORDER-1', [
        { sku: 'sku-a', productName: 'Product A', quantity: 5 },
        { sku: 'sku-b', productName: 'Product B', quantity: 3 },
      ]),
    ]

    const inventoryMap = createInventoryMap([
      { sku: 'sku-a', units: 1 },
      { sku: 'sku-b', units: 1 },
    ])

    const results = analyzeInventoryConstrained(orders, inventoryMap)

    // Both SKUs should be blocking ORDER-1
    expect(results.length).toBe(2)
    expect(results.every(r => r.ordersImpacted === 1)).toBe(true)
  })

  it('should handle SKUs with zero inventory', () => {
    const orders = [
      createOrder('ORDER-1', [
        { sku: 'sku-missing', productName: 'Missing Product', quantity: 1 },
      ]),
    ]

    const inventoryMap = createInventoryMap([]) // No inventory

    const results = analyzeInventoryConstrained(orders, inventoryMap)

    expect(results.length).toBe(1)
    expect(results[0].sku).toBe('sku-missing')
    expect(results[0].currentInventory).toBe(0)
  })
})

describe('runFullAnalysis', () => {
  it('should return both unconstrained and constrained results', () => {
    const orders = [
      createOrder('ORDER-1', [
        { sku: 'sku-a', productName: 'Product A', quantity: 2 },
      ]),
      createOrder('ORDER-2', [
        { sku: 'sku-b', productName: 'Product B', quantity: 1 },
      ]),
    ]

    const inventoryMap = createInventoryMap([
      { sku: 'sku-a', units: 10 },
      { sku: 'sku-b', units: 0 },
    ])

    const output = runFullAnalysis(orders, inventoryMap)

    // Unconstrained should show both SKUs
    expect(output.unconstrainedResults.length).toBe(2)

    // Constrained should only show sku-b (missing inventory)
    expect(output.inventoryConstrainedResults.length).toBe(1)
    expect(output.inventoryConstrainedResults[0].sku).toBe('sku-b')
  })

  it('should calculate correct summary statistics', () => {
    const orders = [
      createOrder('ORDER-1', [{ sku: 'sku-a', productName: 'A', quantity: 1 }]),
      createOrder('ORDER-2', [{ sku: 'sku-a', productName: 'A', quantity: 1 }]),
      createOrder('ORDER-3', [{ sku: 'sku-b', productName: 'B', quantity: 1 }]),
    ]

    const inventoryMap = createInventoryMap([
      { sku: 'sku-a', units: 10 },
      { sku: 'sku-b', units: 0 },
    ])

    const output = runFullAnalysis(orders, inventoryMap)

    expect(output.summary.totalOrders).toBe(3)
    expect(output.summary.ordersReadyToFulfill).toBe(2) // ORDER-1 and ORDER-2
    expect(output.summary.ordersNeedingStock).toBe(1) // ORDER-3
    expect(output.summary.uniqueSkusNeeded).toBe(2)
    expect(output.summary.topMissingSku).toBe('sku-b')
  })

  it('should handle analysis without inventory data', () => {
    const orders = [
      createOrder('ORDER-1', [{ sku: 'sku-a', productName: 'A', quantity: 1 }]),
    ]

    const output = runFullAnalysis(orders, null)

    expect(output.unconstrainedResults.length).toBe(1)
    expect(output.inventoryConstrainedResults.length).toBe(0)
    expect(output.summary.ordersReadyToFulfill).toBe(0)
  })
})

describe('getOrdersUnlockedBySku', () => {
  it('should return orders that would be fulfilled if SKU was stocked', () => {
    const orders = [
      createOrder('ORDER-1', [
        { sku: 'sku-a', productName: 'A', quantity: 1 },
        { sku: 'sku-b', productName: 'B', quantity: 1 },
      ]),
      createOrder('ORDER-2', [
        { sku: 'sku-a', productName: 'A', quantity: 1 },
      ]),
      createOrder('ORDER-3', [
        { sku: 'sku-c', productName: 'C', quantity: 1 },
      ]),
    ]

    const inventoryMap = createInventoryMap([
      { sku: 'sku-a', units: 0 },
      { sku: 'sku-b', units: 10 },
      { sku: 'sku-c', units: 10 },
    ])

    const unlockedOrders = getOrdersUnlockedBySku('sku-a', orders, inventoryMap)

    // ORDER-1 and ORDER-2 contain sku-a and would be fulfilled if sku-a was stocked
    expect(unlockedOrders.length).toBe(2)
    expect(unlockedOrders.map(o => o.orderNumber)).toContain('ORDER-1')
    expect(unlockedOrders.map(o => o.orderNumber)).toContain('ORDER-2')
    // ORDER-3 doesn't contain sku-a
    expect(unlockedOrders.map(o => o.orderNumber)).not.toContain('ORDER-3')
  })

  it('should not return orders that have other missing SKUs', () => {
    const orders = [
      createOrder('ORDER-1', [
        { sku: 'sku-a', productName: 'A', quantity: 1 },
        { sku: 'sku-b', productName: 'B', quantity: 1 }, // Also missing
      ]),
    ]

    const inventoryMap = createInventoryMap([
      { sku: 'sku-a', units: 0 },
      { sku: 'sku-b', units: 0 },
    ])

    const unlockedOrders = getOrdersUnlockedBySku('sku-a', orders, inventoryMap)

    // ORDER-1 still can't be fulfilled because sku-b is also missing
    expect(unlockedOrders.length).toBe(0)
  })
})
