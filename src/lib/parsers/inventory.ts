import Papa from 'papaparse'
import type { InventoryRow, SkuInventory } from './types'

// CSV column headers mapping
const COLUMN_MAP: Record<string, keyof InventoryRow> = {
  'Item': 'item',
  'Sku': 'sku',
  'Warehouse': 'warehouse',
  'Location': 'location',
  'Type': 'type',
  'Units': 'units',
  'Active Item': 'activeItem',
  'Pickable': 'pickable',
  'Sellable': 'sellable',
  'Creation Date': 'creationDate',
}

function parseBoolean(value: string): boolean {
  const v = value?.toString().toLowerCase().trim()
  return v === 'yes' || v === 'true' || v === '1'
}

function parseNumber(value: string): number {
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}

export function parseInventoryRow(row: Record<string, string>): InventoryRow {
  const mapped: Partial<InventoryRow> = {}
  
  for (const [csvHeader, propName] of Object.entries(COLUMN_MAP)) {
    const value = row[csvHeader] ?? ''
    
    switch (propName) {
      case 'units':
        mapped[propName] = parseNumber(value)
        break
      case 'activeItem':
      case 'pickable':
      case 'sellable':
        mapped[propName] = parseBoolean(value)
        break
      default:
        (mapped as Record<string, string>)[propName] = value.trim()
    }
  }
  
  return mapped as InventoryRow
}

export function parseInventoryCSV(csvContent: string): {
  rows: InventoryRow[]
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
      return parseInventoryRow(row)
    } catch (error) {
      errors.push(`Row ${index + 2}: Failed to parse - ${error}`)
      return null
    }
  }).filter((row): row is InventoryRow => row !== null)
  
  return { rows, errors }
}

export function aggregateInventoryBySku(rows: InventoryRow[]): Map<string, SkuInventory> {
  const skuMap = new Map<string, SkuInventory>()
  
  for (const row of rows) {
    if (!row.sku) continue
    
    // Only count sellable inventory
    if (!row.sellable) continue
    
    const existing = skuMap.get(row.sku)
    
    const locationInfo = {
      location: row.location,
      units: row.units,
      pickable: row.pickable,
    }
    
    if (existing) {
      existing.totalSellableUnits += row.units
      existing.locations.push(locationInfo)
    } else {
      skuMap.set(row.sku, {
        sku: row.sku,
        totalSellableUnits: row.units,
        locations: [locationInfo],
      })
    }
  }
  
  return skuMap
}

export function getInventoryForSku(
  inventoryMap: Map<string, SkuInventory>,
  sku: string
): number {
  return inventoryMap.get(sku)?.totalSellableUnits ?? 0
}

export interface SourceLocationResult {
  location: string
  units: number
  unitsToTake: number
}

/**
 * Find the best source locations to pull inventory from for a given SKU.
 * Prefers single locations with enough units, otherwise combines multiple.
 * Locations are sorted by units descending (largest first).
 */
export function findSourceLocations(
  inventoryMap: Map<string, SkuInventory>,
  sku: string,
  unitsNeeded: number
): SourceLocationResult[] {
  const inventory = inventoryMap.get(sku)
  if (!inventory || inventory.locations.length === 0 || unitsNeeded <= 0) {
    return []
  }

  // Sort locations by units descending (prefer larger quantities first)
  const sortedLocations = [...inventory.locations].sort((a, b) => b.units - a.units)
  
  // First, try to find a single location with enough units
  const singleLocation = sortedLocations.find(loc => loc.units >= unitsNeeded)
  if (singleLocation) {
    return [{
      location: singleLocation.location,
      units: singleLocation.units,
      unitsToTake: unitsNeeded,
    }]
  }
  
  // Otherwise, combine multiple locations
  const sourceLocations: SourceLocationResult[] = []
  let remaining = unitsNeeded
  
  for (const loc of sortedLocations) {
    if (remaining <= 0) break
    if (loc.units <= 0) continue
    
    const toTake = Math.min(loc.units, remaining)
    sourceLocations.push({
      location: loc.location,
      units: loc.units,
      unitsToTake: toTake,
    })
    remaining -= toTake
  }
  
  return sourceLocations
}
