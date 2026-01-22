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
  // SKU Slots optimization results
  skuSlotsResults?: SkuSlotsOutput
}

// SKU Slots Feature Types
export interface SkuSlotsOutput {
  skuSlotCount: number
  // SKUs to stock in pick area (have inventory)
  skusToStock: OptimalSkuResult[]
  // SKUs to prioritize receiving (no inventory but high impact)
  skusToPrioritizeReceiving: OptimalSkuResult[]
  // Orders that would be completely fulfilled with the selected SKUs
  ordersFulfilled: string[]
  // Summary stats
  totalOrdersFulfilled: number
  totalOrdersPartiallyFulfilled: number
  fulfillmentRate: number
}

export interface OptimalSkuResult {
  sku: string
  productName: string
  ordersImpacted: number
  ordersFulfilled: string[] // Orders this SKU helps complete
  totalUnitsNeeded: number
  currentInventory: number
  // How many NEW orders would be fulfilled by adding this SKU to the set
  incrementalOrdersUnlocked: number
  // Source locations to pull inventory from
  sourceLocations?: SourceLocation[]
}

// Location to pull inventory from for stocking
export interface SourceLocation {
  location: string
  units: number
  unitsToTake: number // How many units to take from this location
}
