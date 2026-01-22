import Papa from 'papaparse'
import type { PendingShipmentRow, Order, OrderLineItem } from './types'

// CSV column headers mapping (handles variations in header names)
const COLUMN_MAP: Record<string, keyof PendingShipmentRow> = {
  'Locked By': 'lockedBy',
  'Created At': 'createdAt',
  'Shipment ID': 'shipmentId',
  'Ship Priority': 'shipPriority',
  'Locked Date': 'lockedDate',
  'Order Date': 'orderDate',
  'Store': 'store',
  'Required Ship Date': 'requiredShipDate',
  'Order Number': 'orderNumber',
  'SKU': 'sku',
  'Product Name': 'productName',
  'Quantity': 'quantity',
  'Is Component': 'isComponent',
  'Status': 'status',
  'Ready To Ship': 'readyToShip',
  'Tote': 'tote',
  'Warehouse': 'warehouse',
  'Picked On': 'pickedOn',
  'Allocated in locations': 'allocatedInLocations',
}

function parseBoolean(value: string): boolean {
  const v = value?.toString().toLowerCase().trim()
  return v === 'yes' || v === 'true' || v === '1'
}

function parseNumber(value: string): number {
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}

export function parsePendingShipmentRow(row: Record<string, string>): PendingShipmentRow {
  const mapped: Partial<PendingShipmentRow> = {}
  
  for (const [csvHeader, propName] of Object.entries(COLUMN_MAP)) {
    const value = row[csvHeader] ?? ''
    
    switch (propName) {
      case 'quantity':
      case 'shipPriority':
        mapped[propName] = parseNumber(value)
        break
      case 'isComponent':
      case 'readyToShip':
        mapped[propName] = parseBoolean(value)
        break
      default:
        (mapped as Record<string, string>)[propName] = value.trim()
    }
  }
  
  return mapped as PendingShipmentRow
}

export function parsePendingShipmentsCSV(csvContent: string): {
  rows: PendingShipmentRow[]
  statuses: string[]
  errors: string[]
} {
  const errors: string[] = []
  
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })
  
  if (result.errors.length > 0) {
    errors.push(...result.errors.map(e => `Row ${e.row}: ${e.message}`))
  }
  
  const rows = result.data.map((row, index) => {
    try {
      return parsePendingShipmentRow(row)
    } catch (error) {
      errors.push(`Row ${index + 2}: Failed to parse - ${error}`)
      return null
    }
  }).filter((row): row is PendingShipmentRow => row !== null)
  
  // Extract unique statuses
  const statuses = [...new Set(rows.map(r => r.status).filter(Boolean))].sort()
  
  return { rows, statuses, errors }
}

export function groupOrdersByOrderNumber(rows: PendingShipmentRow[]): Order[] {
  const orderMap = new Map<string, Order>()
  
  for (const row of rows) {
    if (!row.orderNumber) continue
    
    const existing = orderMap.get(row.orderNumber)
    
    const lineItem: OrderLineItem = {
      sku: row.sku,
      productName: row.productName,
      quantity: row.quantity,
    }
    
    if (existing) {
      existing.lineItems.push(lineItem)
      // Update flags if any line has these values
      if (row.tote) existing.hasTote = true
      if (row.allocatedInLocations) existing.hasAllocatedLocations = true
    } else {
      orderMap.set(row.orderNumber, {
        orderNumber: row.orderNumber,
        createdAt: row.createdAt,
        orderDate: row.orderDate,
        store: row.store,
        status: row.status,
        readyToShip: row.readyToShip,
        hasTote: !!row.tote,
        hasAllocatedLocations: !!row.allocatedInLocations,
        lineItems: [lineItem],
      })
    }
  }
  
  return Array.from(orderMap.values())
}

export function filterOrders(
  orders: Order[],
  selectedStatuses: string[],
  excludeAllocated: boolean,
  excludeToted: boolean
): Order[] {
  return orders.filter(order => {
    // Filter by status if any are selected
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(order.status)) {
      return false
    }
    
    // Exclude orders with allocated locations
    if (excludeAllocated && order.hasAllocatedLocations) {
      return false
    }
    
    // Exclude orders with totes
    if (excludeToted && order.hasTote) {
      return false
    }
    
    return true
  })
}
