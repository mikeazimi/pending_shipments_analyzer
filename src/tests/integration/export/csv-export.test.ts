import { describe, it, expect } from 'vitest'
import { resultsToCSV, generateFullReport, getTimestampString } from '@/lib/export/csv-export'
import type { SkuAnalysisResult, AnalysisOutput } from '@/lib/parsers/types'

describe('CSV Export Integration', () => {
  const sampleResults: SkuAnalysisResult[] = [
    {
      sku: 'SKU-001',
      productName: 'Test Product 1',
      ordersImpacted: 10,
      totalUnitsNeeded: 25,
      currentInventory: 5,
      inventoryGap: 20,
      tier: 'critical',
      ordersCanComplete: ['ORDER-1', 'ORDER-2'],
    },
    {
      sku: 'SKU-002',
      productName: 'Test Product 2',
      ordersImpacted: 5,
      totalUnitsNeeded: 10,
      currentInventory: 10,
      inventoryGap: 0,
      tier: 'high',
      ordersCanComplete: ['ORDER-3'],
    },
  ]

  const sampleOutput: AnalysisOutput = {
    unconstrainedResults: sampleResults,
    inventoryConstrainedResults: sampleResults,
    summary: {
      totalOrders: 100,
      totalOrdersAnalyzed: 100,
      ordersReadyToFulfill: 80,
      ordersNeedingStock: 20,
      uniqueSkusNeeded: 50,
      topMissingSku: 'SKU-001',
    },
  }

  describe('resultsToCSV', () => {
    it('should generate CSV without inventory columns', () => {
      const csv = resultsToCSV(sampleResults, false)
      
      expect(csv).toContain('Rank,SKU,Product Name,Orders Impacted,Units Needed,Priority Tier')
      expect(csv).toContain('1,"SKU-001","Test Product 1",10,25,critical')
      expect(csv).toContain('2,"SKU-002","Test Product 2",5,10,high')
      expect(csv).not.toContain('Current Stock')
    })

    it('should generate CSV with inventory columns', () => {
      const csv = resultsToCSV(sampleResults, true)
      
      expect(csv).toContain('Rank,SKU,Product Name,Orders Impacted,Units Needed,Current Stock,Inventory Gap,Priority Tier')
      expect(csv).toContain('1,"SKU-001","Test Product 1",10,25,5,20,critical')
    })

    it('should handle empty results', () => {
      const csv = resultsToCSV([], false)
      
      expect(csv).toContain('Rank,SKU,Product Name')
      expect(csv.split('\n').length).toBe(1) // Only header
    })

    it('should escape quotes in product names', () => {
      const resultsWithQuotes: SkuAnalysisResult[] = [
        {
          sku: 'SKU-QUOTE',
          productName: 'Product with "quotes"',
          ordersImpacted: 1,
          totalUnitsNeeded: 1,
          currentInventory: 0,
          inventoryGap: 1,
          tier: 'low',
          ordersCanComplete: [],
        },
      ]

      const csv = resultsToCSV(resultsWithQuotes, false)
      expect(csv).toContain('Product with ""quotes""')
    })
  })

  describe('generateFullReport', () => {
    it('should include summary section', () => {
      const report = generateFullReport(sampleOutput)
      
      expect(report).toContain('# Analysis Summary')
      expect(report).toContain('Total Orders,100')
      expect(report).toContain('Ready to Fulfill,80')
      expect(report).toContain('Top Missing SKU,SKU-001')
    })

    it('should include unconstrained results', () => {
      const report = generateFullReport(sampleOutput)
      
      expect(report).toContain('# Unconstrained SKU Demand')
      expect(report).toContain('SKU-001')
    })

    it('should include constrained results when available', () => {
      const report = generateFullReport(sampleOutput)
      
      expect(report).toContain('# Inventory-Constrained Analysis')
    })

    it('should handle output without constrained results', () => {
      const outputNoConstrained: AnalysisOutput = {
        ...sampleOutput,
        inventoryConstrainedResults: [],
      }

      const report = generateFullReport(outputNoConstrained)
      expect(report).not.toContain('# Inventory-Constrained Analysis')
    })
  })

  describe('getTimestampString', () => {
    it('should return a valid timestamp string', () => {
      const timestamp = getTimestampString()
      
      // Should be in format: YYYY-MM-DDTHH-MM-SS
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/)
    })

    it('should not contain colons or periods', () => {
      const timestamp = getTimestampString()
      
      expect(timestamp).not.toContain(':')
      expect(timestamp).not.toContain('.')
    })
  })
})
