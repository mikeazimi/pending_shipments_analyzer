// Pending Shipments Report Types
export interface PendingShipmentRow {
  lockedBy: string
  createdAt: string
  shipmentId: string
  shipPriority: number
  lockedDate: string
  orderDate: string
  store: string
  requiredShipDate: string
  orderNumber: string
  sku: string
  productName: string
  quantity: number
  isComponent: boolean
  status: string
  readyToShip: boolean
  tote: string
  warehouse: string
  pickedOn: string
  allocatedInLocations: string
}

// Grouped order with all line items
export interface Order {
  orderNumber: string
  createdAt: string
  orderDate: string
  store: string
  status: string
  readyToShip: boolean
  hasTote: boolean
  hasAllocatedLocations: boolean
  lineItems: OrderLineItem[]
}

export interface OrderLineItem {
  sku: string
  productName: string
  quantity: number
}

// Inventory Report Types
export interface InventoryRow {
  item: string
  sku: string
  warehouse: string
  location: string
  type: string
  units: number
  activeItem: boolean
  pickable: boolean
  sellable: boolean
  creationDate: string
}

// Aggregated inventory by SKU (only sellable)
export interface SkuInventory {
  sku: string
  totalSellableUnits: number
  locations: {
    location: string
    units: number
    pickable: boolean
  }[]
}

// Analysis Types
export interface SkuAnalysisResult {
  sku: string
  productName: string
  ordersImpacted: number
  totalUnitsNeeded: number
  currentInventory: number
  inventoryGap: number
  tier: 'critical' | 'high' | 'medium' | 'low'
  ordersCanComplete: string[] // Order numbers that can be completed if this SKU is stocked
}

export interface AnalysisFilters {
  selectedStatuses: string[]
  excludeAllocated: boolean
  excludeToted: boolean
}

export interface AnalysisOutput {
  unconstrainedResults: SkuAnalysisResult[]
  inventoryConstrainedResults: SkuAnalysisResult[]
  summary: {
    totalOrders: number
    totalOrdersAnalyzed: number
    ordersReadyToFulfill: number
    ordersNeedingStock: number
    uniqueSkusNeeded: number
    topMissingSku: string | null
  }
}
