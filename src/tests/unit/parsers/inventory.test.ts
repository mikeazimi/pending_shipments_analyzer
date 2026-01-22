import { describe, it, expect } from 'vitest'
import {
  parseInventoryRow,
  parseInventoryCSV,
  aggregateInventoryBySku,
  getInventoryForSku,
} from '@/lib/parsers/inventory'

describe('parseInventoryRow', () => {
  it('should parse a valid row correctly', () => {
    const row = {
      'Item': 'Test Product',
      'Sku': 'test-sku-123',
      'Warehouse': 'Primary',
      'Location': 'MH158-1',
      'Type': 'Floor',
      'Units': '288',
      'Active Item': 'yes',
      'Pickable': 'yes',
      'Sellable': 'yes',
      'Creation Date': '2026-01-22 15:05:07',
    }

    const result = parseInventoryRow(row)

    expect(result.sku).toBe('test-sku-123')
    expect(result.item).toBe('Test Product')
    expect(result.units).toBe(288)
    expect(result.sellable).toBe(true)
    expect(result.pickable).toBe(true)
    expect(result.activeItem).toBe(true)
    expect(result.location).toBe('MH158-1')
  })

  it('should handle "no" boolean values', () => {
    const row = {
      'Sku': 'sku-1',
      'Units': '100',
      'Sellable': 'no',
      'Pickable': 'no',
      'Active Item': 'no',
    }

    const result = parseInventoryRow(row)

    expect(result.sellable).toBe(false)
    expect(result.pickable).toBe(false)
    expect(result.activeItem).toBe(false)
  })

  it('should handle missing values', () => {
    const row = {
      'Sku': 'sku-1',
    }

    const result = parseInventoryRow(row)

    expect(result.sku).toBe('sku-1')
    expect(result.units).toBe(0)
    expect(result.sellable).toBe(false)
  })
})

describe('parseInventoryCSV', () => {
  it('should parse CSV content correctly', () => {
    const csvContent = `Item,Sku,Warehouse,Location,Type,Units,"Active Item",Pickable,Sellable,"Creation Date"
Product A,sku-a,Primary,LOC-1,Floor,100,yes,yes,yes,2026-01-22
Product B,sku-b,Primary,LOC-2,Bay,50,yes,no,yes,2026-01-22
Product C,sku-c,Primary,LOC-3,Floor,75,yes,yes,no,2026-01-22`

    const { rows, errors } = parseInventoryCSV(csvContent)

    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(3)
    expect(rows[0].sku).toBe('sku-a')
    expect(rows[0].units).toBe(100)
    expect(rows[1].sellable).toBe(true)
    expect(rows[2].sellable).toBe(false)
  })
})

describe('aggregateInventoryBySku', () => {
  it('should aggregate sellable inventory across locations', () => {
    const rows = [
      {
        item: 'Product A',
        sku: 'sku-a',
        warehouse: 'Primary',
        location: 'LOC-1',
        type: 'Floor',
        units: 100,
        activeItem: true,
        pickable: true,
        sellable: true,
        creationDate: '2026-01-22',
      },
      {
        item: 'Product A',
        sku: 'sku-a',
        warehouse: 'Primary',
        location: 'LOC-2',
        type: 'Bay',
        units: 50,
        activeItem: true,
        pickable: false,
        sellable: true,
        creationDate: '2026-01-22',
      },
      {
        item: 'Product A',
        sku: 'sku-a',
        warehouse: 'Primary',
        location: 'LOC-3',
        type: 'Bay',
        units: 200,
        activeItem: true,
        pickable: false,
        sellable: false, // Not sellable - should be excluded
        creationDate: '2026-01-22',
      },
    ]

    const inventoryMap = aggregateInventoryBySku(rows)

    const skuA = inventoryMap.get('sku-a')
    expect(skuA).toBeDefined()
    expect(skuA?.totalSellableUnits).toBe(150) // 100 + 50, excluding the non-sellable 200
    expect(skuA?.locations).toHaveLength(2)
  })

  it('should exclude non-sellable inventory', () => {
    const rows = [
      {
        item: 'Product B',
        sku: 'sku-b',
        warehouse: 'Primary',
        location: 'LOC-1',
        type: 'Floor',
        units: 100,
        activeItem: true,
        pickable: true,
        sellable: false,
        creationDate: '2026-01-22',
      },
    ]

    const inventoryMap = aggregateInventoryBySku(rows)

    expect(inventoryMap.has('sku-b')).toBe(false)
  })

  it('should handle multiple SKUs', () => {
    const rows = [
      {
        item: 'Product A',
        sku: 'sku-a',
        warehouse: 'Primary',
        location: 'LOC-1',
        type: 'Floor',
        units: 100,
        activeItem: true,
        pickable: true,
        sellable: true,
        creationDate: '2026-01-22',
      },
      {
        item: 'Product B',
        sku: 'sku-b',
        warehouse: 'Primary',
        location: 'LOC-2',
        type: 'Floor',
        units: 75,
        activeItem: true,
        pickable: true,
        sellable: true,
        creationDate: '2026-01-22',
      },
    ]

    const inventoryMap = aggregateInventoryBySku(rows)

    expect(inventoryMap.size).toBe(2)
    expect(inventoryMap.get('sku-a')?.totalSellableUnits).toBe(100)
    expect(inventoryMap.get('sku-b')?.totalSellableUnits).toBe(75)
  })
})

describe('getInventoryForSku', () => {
  it('should return inventory for existing SKU', () => {
    const rows = [
      {
        item: 'Product A',
        sku: 'sku-a',
        warehouse: 'Primary',
        location: 'LOC-1',
        type: 'Floor',
        units: 100,
        activeItem: true,
        pickable: true,
        sellable: true,
        creationDate: '2026-01-22',
      },
    ]

    const inventoryMap = aggregateInventoryBySku(rows)
    const inventory = getInventoryForSku(inventoryMap, 'sku-a')

    expect(inventory).toBe(100)
  })

  it('should return 0 for non-existent SKU', () => {
    const inventoryMap = new Map()
    const inventory = getInventoryForSku(inventoryMap, 'non-existent-sku')

    expect(inventory).toBe(0)
  })
})
