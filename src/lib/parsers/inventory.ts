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
  isOverstock: boolean // true = overstock (pickable=no), false = pick location (pickable=yes)
}

export interface SourceLocationOptions {
  prioritizeOverstock: boolean // true = overstock first, false = pick locations first
  useSingleLocation: boolean // true = only show first location with enough, false = combine multiple
}

const defaultSourceLocationOptions: SourceLocationOptions = {
  prioritizeOverstock: true,
  useSingleLocation: false,
}

/**
 * Find the best source locations to pull inventory from for a given SKU.
 * 
 * Options:
 * - prioritizeOverstock: true = overstock (pickable=no) first, false = pick locations first
 * - useSingleLocation: true = only return first location with enough units, false = combine multiple
 * 
 * Results are always sorted alphanumerically by location name.
 */
export function findSourceLocations(
  inventoryMap: Map<string, SkuInventory>,
  sku: string,
  unitsNeeded: number,
  options: SourceLocationOptions = defaultSourceLocationOptions
): SourceLocationResult[] {
  const inventory = inventoryMap.get(sku)
  if (!inventory || inventory.locations.length === 0 || unitsNeeded <= 0) {
    return []
  }

  const { prioritizeOverstock, useSingleLocation } = options

  // Separate overstock (pickable=no) from pick locations (pickable=yes)
  // Sort each group by units descending for selection, but final results will be sorted alphabetically
  const overstockLocations = inventory.locations
    .filter(loc => !loc.pickable && loc.units > 0)
    .sort((a, b) => b.units - a.units)
  
  const pickLocations = inventory.locations
    .filter(loc => loc.pickable && loc.units > 0)
    .sort((a, b) => b.units - a.units)
  
  // Determine priority order based on option
  const primaryLocations = prioritizeOverstock ? overstockLocations : pickLocations
  const secondaryLocations = prioritizeOverstock ? pickLocations : overstockLocations
  
  // If single location mode, find first location with enough units
  if (useSingleLocation) {
    // Check primary locations first
    const singlePrimary = primaryLocations.find(loc => loc.units >= unitsNeeded)
    if (singlePrimary) {
      return [{
        location: singlePrimary.location,
        units: singlePrimary.units,
        unitsToTake: unitsNeeded,
        isOverstock: !singlePrimary.pickable,
      }]
    }
    
    // Check secondary locations
    const singleSecondary = secondaryLocations.find(loc => loc.units >= unitsNeeded)
    if (singleSecondary) {
      return [{
        location: singleSecondary.location,
        units: singleSecondary.units,
        unitsToTake: unitsNeeded,
        isOverstock: !singleSecondary.pickable,
      }]
    }
    
    // No single location has enough - fall through to combine multiple
  }
  
  // Combine multiple locations
  const sourceLocations: SourceLocationResult[] = []
  let remaining = unitsNeeded
  
  // Use primary locations first
  for (const loc of primaryLocations) {
    if (remaining <= 0) break
    
    const toTake = Math.min(loc.units, remaining)
    sourceLocations.push({
      location: loc.location,
      units: loc.units,
      unitsToTake: toTake,
      isOverstock: !loc.pickable,
    })
    remaining -= toTake
  }
  
  // If still need more, use secondary locations
  if (remaining > 0) {
    for (const loc of secondaryLocations) {
      if (remaining <= 0) break
      
      const toTake = Math.min(loc.units, remaining)
      sourceLocations.push({
        location: loc.location,
        units: loc.units,
        unitsToTake: toTake,
        isOverstock: !loc.pickable,
      })
      remaining -= toTake
    }
  }
  
  // Sort results alphanumerically by location name
  sourceLocations.sort((a, b) => a.location.localeCompare(b.location, undefined, { numeric: true }))
  
  return sourceLocations
}
