import { describe, it, expect } from 'vitest'
import {
  parsePendingShipmentRow,
  parsePendingShipmentsCSV,
  groupOrdersByOrderNumber,
  filterOrders,
} from '@/lib/parsers/pending-shipments'

describe('parsePendingShipmentRow', () => {
  it('should parse a valid row correctly', () => {
    const row = {
      'Locked By': '',
      'Created At': '01/22/2026 07:25 AM',
      'Shipment ID': '1503055631',
      'Ship Priority': '1',
      'Locked Date': '',
      'Order Date': '01/09/2026 07:53 PM',
      'Store': 'test-store.myshopify.com',
      'Required Ship Date': '2025-08-11',
      'Order Number': 'FBW13479',
      'SKU': 'test-sku-123',
      'Product Name': 'Test Product',
      'Quantity': '3',
      'Is Component': 'No',
      'Status': 'Wholesale Pick',
      'Ready To Ship': 'Yes',
      'Tote': '',
      'Warehouse': 'Primary',
      'Picked On': '',
      'Allocated in locations': '',
    }

    const result = parsePendingShipmentRow(row)

    expect(result.orderNumber).toBe('FBW13479')
    expect(result.sku).toBe('test-sku-123')
    expect(result.quantity).toBe(3)
    expect(result.status).toBe('Wholesale Pick')
    expect(result.readyToShip).toBe(true)
    expect(result.isComponent).toBe(false)
    expect(result.shipPriority).toBe(1)
  })

  it('should handle missing values', () => {
    const row = {
      'Order Number': 'TEST123',
      'SKU': 'sku-1',
      'Quantity': '',
    }

    const result = parsePendingShipmentRow(row)

    expect(result.orderNumber).toBe('TEST123')
    expect(result.quantity).toBe(0)
    expect(result.readyToShip).toBe(false)
  })
})

describe('parsePendingShipmentsCSV', () => {
  it('should parse CSV content and extract unique statuses', () => {
    const csvContent = `"Order Number",SKU,"Product Name",Quantity,Status,"Ready To Ship",Tote,"Allocated in locations"
FBW001,sku-1,Product 1,2,Wholesale Pick,Yes,,
FBW001,sku-2,Product 2,1,Wholesale Pick,Yes,,
FBW002,sku-3,Product 3,1,TikTok,Yes,,`

    const { rows, statuses, errors } = parsePendingShipmentsCSV(csvContent)

    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(3)
    expect(statuses).toContain('Wholesale Pick')
    expect(statuses).toContain('TikTok')
    expect(statuses).toHaveLength(2)
  })

  it('should handle empty CSV', () => {
    const csvContent = `"Order Number",SKU,Quantity`

    const { rows, statuses, errors } = parsePendingShipmentsCSV(csvContent)

    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(0)
    expect(statuses).toHaveLength(0)
  })
})

describe('groupOrdersByOrderNumber', () => {
  it('should group line items by order number', () => {
    const rows = [
      {
        lockedBy: '',
        createdAt: '01/22/2026',
        shipmentId: '123',
        shipPriority: 1,
        lockedDate: '',
        orderDate: '01/22/2026',
        store: 'test',
        requiredShipDate: '01/23/2026',
        orderNumber: 'ORDER-1',
        sku: 'sku-a',
        productName: 'Product A',
        quantity: 2,
        isComponent: false,
        status: 'Wholesale Pick',
        readyToShip: true,
        tote: '',
        warehouse: 'Primary',
        pickedOn: '',
        allocatedInLocations: '',
      },
      {
        lockedBy: '',
        createdAt: '01/22/2026',
        shipmentId: '123',
        shipPriority: 1,
        lockedDate: '',
        orderDate: '01/22/2026',
        store: 'test',
        requiredShipDate: '01/23/2026',
        orderNumber: 'ORDER-1',
        sku: 'sku-b',
        productName: 'Product B',
        quantity: 1,
        isComponent: false,
        status: 'Wholesale Pick',
        readyToShip: true,
        tote: '',
        warehouse: 'Primary',
        pickedOn: '',
        allocatedInLocations: '',
      },
      {
        lockedBy: '',
        createdAt: '01/22/2026',
        shipmentId: '456',
        shipPriority: 0,
        lockedDate: '',
        orderDate: '01/22/2026',
        store: 'test',
        requiredShipDate: '01/23/2026',
        orderNumber: 'ORDER-2',
        sku: 'sku-c',
        productName: 'Product C',
        quantity: 3,
        isComponent: false,
        status: 'TikTok',
        readyToShip: true,
        tote: '',
        warehouse: 'Primary',
        pickedOn: '',
        allocatedInLocations: '',
      },
    ]

    const orders = groupOrdersByOrderNumber(rows)

    expect(orders).toHaveLength(2)
    
    const order1 = orders.find(o => o.orderNumber === 'ORDER-1')
    expect(order1?.lineItems).toHaveLength(2)
    expect(order1?.lineItems.map(li => li.sku)).toContain('sku-a')
    expect(order1?.lineItems.map(li => li.sku)).toContain('sku-b')
    
    const order2 = orders.find(o => o.orderNumber === 'ORDER-2')
    expect(order2?.lineItems).toHaveLength(1)
  })

  it('should track tote and allocated locations flags', () => {
    const rows = [
      {
        lockedBy: '',
        createdAt: '',
        shipmentId: '',
        shipPriority: 0,
        lockedDate: '',
        orderDate: '',
        store: '',
        requiredShipDate: '',
        orderNumber: 'ORDER-1',
        sku: 'sku-a',
        productName: 'Product A',
        quantity: 1,
        isComponent: false,
        status: 'Test',
        readyToShip: true,
        tote: 'TOTE-123',
        warehouse: '',
        pickedOn: '',
        allocatedInLocations: '',
      },
      {
        lockedBy: '',
        createdAt: '',
        shipmentId: '',
        shipPriority: 0,
        lockedDate: '',
        orderDate: '',
        store: '',
        requiredShipDate: '',
        orderNumber: 'ORDER-2',
        sku: 'sku-b',
        productName: 'Product B',
        quantity: 1,
        isComponent: false,
        status: 'Test',
        readyToShip: true,
        tote: '',
        warehouse: '',
        pickedOn: '',
        allocatedInLocations: 'LOC-A, LOC-B',
      },
    ]

    const orders = groupOrdersByOrderNumber(rows)

    const order1 = orders.find(o => o.orderNumber === 'ORDER-1')
    expect(order1?.hasTote).toBe(true)
    expect(order1?.hasAllocatedLocations).toBe(false)

    const order2 = orders.find(o => o.orderNumber === 'ORDER-2')
    expect(order2?.hasTote).toBe(false)
    expect(order2?.hasAllocatedLocations).toBe(true)
  })
})

describe('filterOrders', () => {
  const sampleOrders = [
    {
      orderNumber: 'ORDER-1',
      createdAt: '',
      orderDate: '',
      store: '',
      status: 'Wholesale Pick',
      readyToShip: true,
      hasTote: false,
      hasAllocatedLocations: false,
      lineItems: [{ sku: 'sku-1', productName: 'P1', quantity: 1 }],
    },
    {
      orderNumber: 'ORDER-2',
      createdAt: '',
      orderDate: '',
      store: '',
      status: 'TikTok',
      readyToShip: true,
      hasTote: true,
      hasAllocatedLocations: false,
      lineItems: [{ sku: 'sku-2', productName: 'P2', quantity: 1 }],
    },
    {
      orderNumber: 'ORDER-3',
      createdAt: '',
      orderDate: '',
      store: '',
      status: 'Wholesale Pick',
      readyToShip: true,
      hasTote: false,
      hasAllocatedLocations: true,
      lineItems: [{ sku: 'sku-3', productName: 'P3', quantity: 1 }],
    },
  ]

  it('should filter by status', () => {
    const filtered = filterOrders(sampleOrders, ['Wholesale Pick'], false, false)
    expect(filtered).toHaveLength(2)
    expect(filtered.every(o => o.status === 'Wholesale Pick')).toBe(true)
  })

  it('should exclude orders with totes', () => {
    const filtered = filterOrders(sampleOrders, [], false, true)
    expect(filtered).toHaveLength(2)
    expect(filtered.every(o => !o.hasTote)).toBe(true)
  })

  it('should exclude orders with allocated locations', () => {
    const filtered = filterOrders(sampleOrders, [], true, false)
    expect(filtered).toHaveLength(2)
    expect(filtered.every(o => !o.hasAllocatedLocations)).toBe(true)
  })

  it('should combine multiple filters', () => {
    const filtered = filterOrders(sampleOrders, ['Wholesale Pick'], true, true)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].orderNumber).toBe('ORDER-1')
  })

  it('should return all orders when no filters applied', () => {
    const filtered = filterOrders(sampleOrders, [], false, false)
    expect(filtered).toHaveLength(3)
  })
})
