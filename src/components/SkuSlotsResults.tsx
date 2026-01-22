'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { SkuSlotsOutput, OptimalSkuResult } from '@/lib/parsers/types'
import { Boxes, TrendingUp, Package, AlertTriangle, CheckCircle2, Eye, Truck, Clock, ArrowUpDown, ArrowUp, ArrowDown, Search, Copy, Check } from 'lucide-react'

interface SkuSlotsResultsProps {
  results: SkuSlotsOutput
}

type SortField = 'sku' | 'productName' | 'ordersImpacted' | 'totalUnitsNeeded' | 'currentInventory' | 'incrementalOrdersUnlocked'
type SortDirection = 'asc' | 'desc'

function OrdersDialog({ 
  orders, 
  title, 
  trigger 
}: { 
  orders: string[]
  title: string
  trigger: React.ReactNode 
}) {
  const [copied, setCopied] = useState(false)
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(orders.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white">{title}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {orders.length} order{orders.length !== 1 ? 's' : ''}
              </DialogDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyToClipboard}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy All'}
            </Button>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {orders.map((order) => (
            <div
              key={order}
              className="px-3 py-2 bg-slate-800 rounded text-sm text-slate-300 font-mono"
            >
              {order}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SortableHeader({ 
  label, 
  field, 
  currentSort, 
  currentDirection, 
  onSort,
  align = 'left'
}: { 
  label: string
  field: SortField
  currentSort: SortField | null
  currentDirection: SortDirection
  onSort: (field: SortField) => void
  align?: 'left' | 'right'
}) {
  const isActive = currentSort === field
  
  return (
    <TableHead 
      className={`text-slate-300 cursor-pointer select-none hover:text-white hover:bg-slate-800/50 transition-colors ${align === 'right' ? 'text-right' : ''}`}
      onDoubleClick={() => onSort(field)}
      title="Double-click to sort"
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {isActive ? (
          currentDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  )
}

function SkuTable({ 
  skus, 
  title, 
  description, 
  isReceivingPriority = false 
}: { 
  skus: OptimalSkuResult[]
  title: string
  description: string
  isReceivingPriority?: boolean
}) {
  const [showAll, setShowAll] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [copiedSku, setCopiedSku] = useState<string | null>(null)
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }
  
  const copySkuList = () => {
    const skuList = filteredAndSortedSkus.map(s => s.sku).join('\n')
    navigator.clipboard.writeText(skuList)
    setCopiedSku('all')
    setTimeout(() => setCopiedSku(null), 2000)
  }
  
  const filteredAndSortedSkus = useMemo(() => {
    let result = [...skus]
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(sku => 
        sku.sku.toLowerCase().includes(term) || 
        sku.productName.toLowerCase().includes(term)
      )
    }
    
    // Sort
    if (sortField) {
      result.sort((a, b) => {
        let aVal = a[sortField]
        let bVal = b[sortField]
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase()
          bVal = (bVal as string).toLowerCase()
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return result
  }, [skus, searchTerm, sortField, sortDirection])
  
  const displaySkus = showAll ? filteredAndSortedSkus : filteredAndSortedSkus.slice(0, 25)

  if (skus.length === 0) {
    return (
      <Card className="bg-slate-800/30 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">{title}</CardTitle>
          <CardDescription className="text-slate-400">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">No SKUs in this category</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              {isReceivingPriority ? (
                <Clock className="w-5 h-5 text-amber-400" />
              ) : (
                <Truck className="w-5 h-5 text-emerald-400" />
              )}
              {title}
            </CardTitle>
            <CardDescription className="text-slate-400">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={isReceivingPriority 
                ? "border-amber-500/50 text-amber-400" 
                : "border-emerald-500/50 text-emerald-400"
              }
            >
              {filteredAndSortedSkus.length} SKU{filteredAndSortedSkus.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={copySkuList}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {copiedSku === 'all' ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copiedSku === 'all' ? 'Copied!' : 'Copy SKUs'}
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search SKU or product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
        
        <p className="text-xs text-slate-500 mt-2">
          💡 Double-click column headers to sort
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-300 w-10">#</TableHead>
                <SortableHeader label="SKU" field="sku" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Product Name" field="productName" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Orders Impacted" field="ordersImpacted" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
                <SortableHeader label="Units Needed" field="totalUnitsNeeded" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
                <SortableHeader label="Inventory" field="currentInventory" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
                <SortableHeader 
                  label={isReceivingPriority ? 'Orders Blocked' : 'Orders Unlocked'} 
                  field="incrementalOrdersUnlocked" 
                  currentSort={sortField} 
                  currentDirection={sortDirection} 
                  onSort={handleSort} 
                  align="right" 
                />
                <TableHead className="text-slate-300 print:hidden"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySkus.map((sku, index) => (
                <TableRow key={sku.sku} className="border-slate-700/50 hover:bg-slate-800/50">
                  <TableCell className="text-slate-500 font-mono">{index + 1}</TableCell>
                  <TableCell className="font-mono text-white">{sku.sku}</TableCell>
                  <TableCell className="text-slate-300 max-w-[200px] truncate" title={sku.productName}>
                    {sku.productName}
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {sku.ordersImpacted}
                  </TableCell>
                  <TableCell className="text-right text-slate-300">
                    {sku.totalUnitsNeeded}
                  </TableCell>
                  <TableCell className="text-right">
                    {sku.currentInventory > 0 ? (
                      <span className="text-emerald-400">{sku.currentInventory}</span>
                    ) : (
                      <span className="text-red-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={isReceivingPriority 
                        ? "border-amber-500/50 text-amber-400"
                        : "border-purple-500/50 text-purple-400"
                      }
                    >
                      {sku.incrementalOrdersUnlocked}
                    </Badge>
                  </TableCell>
                  <TableCell className="print:hidden">
                    {sku.ordersFulfilled.length > 0 && (
                      <OrdersDialog
                        orders={sku.ordersFulfilled}
                        title={`Orders fulfilled by ${sku.sku}`}
                        trigger={
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </Button>
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredAndSortedSkus.length > 25 && (
          <div className="mt-4 text-center print:hidden">
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {showAll ? 'Show Less' : `Show All ${filteredAndSortedSkus.length} SKUs`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SkuSlotsResults({ results }: SkuSlotsResultsProps) {
  const [showReceivingSection, setShowReceivingSection] = useState(true)
  
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Boxes className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-purple-300 uppercase tracking-wider">SKU Slots</p>
                <p className="text-2xl font-bold text-white">{results.skuSlotCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-emerald-300 uppercase tracking-wider">Orders Fulfilled</p>
                <p className="text-2xl font-bold text-white">{results.totalOrdersFulfilled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-cyan-300 uppercase tracking-wider">Fulfillment Rate</p>
                <p className="text-2xl font-bold text-white">{results.fulfillmentRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-amber-300 uppercase tracking-wider">Need Receiving</p>
                <p className="text-2xl font-bold text-white">{results.skusToPrioritizeReceiving.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Fulfilled Preview */}
      {results.ordersFulfilled.length > 0 && (
        <Card className="bg-slate-800/30 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400" />
                  Orders That Can Be Completely Fulfilled
                </CardTitle>
                <CardDescription className="text-slate-400">
                  These orders have all required SKUs within your {results.skuSlotCount} slot allocation
                </CardDescription>
              </div>
              <OrdersDialog
                orders={results.ordersFulfilled}
                title="All Fulfillable Orders"
                trigger={
                  <Button variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
                    <Eye className="w-4 h-4 mr-2" />
                    View All {results.ordersFulfilled.length} Orders
                  </Button>
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {results.ordersFulfilled.slice(0, 20).map((order) => (
                <Badge
                  key={order}
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-400 font-mono"
                >
                  {order}
                </Badge>
              ))}
              {results.ordersFulfilled.length > 20 && (
                <Badge variant="outline" className="border-slate-600 text-slate-400">
                  +{results.ordersFulfilled.length - 20} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SKUs to Stock Table */}
      <SkuTable
        skus={results.skusToStock}
        title={`SKUs to Stock in Pick Area (${results.skusToStock.length}/${results.skuSlotCount} slots used)`}
        description="These SKUs should be moved to your pick area to maximize order fulfillment."
        isReceivingPriority={false}
      />

      {/* Toggle for Receiving Section */}
      {results.skusToPrioritizeReceiving.length > 0 && (
        <div className="flex items-center space-x-2 print:hidden">
          <Checkbox 
            id="showReceiving" 
            checked={showReceivingSection}
            onCheckedChange={(checked) => setShowReceivingSection(checked === true)}
          />
          <Label htmlFor="showReceiving" className="text-slate-300 cursor-pointer">
            Show SKUs Awaiting Inventory ({results.skusToPrioritizeReceiving.length} SKUs)
          </Label>
        </div>
      )}

      {/* SKUs to Prioritize Receiving Table */}
      {showReceivingSection && results.skusToPrioritizeReceiving.length > 0 && (
        <SkuTable
          skus={results.skusToPrioritizeReceiving}
          title="High-Impact SKUs Awaiting Inventory"
          description="These SKUs have no sellable inventory but would unlock orders if received. Prioritize these during receiving."
          isReceivingPriority={true}
        />
      )}
    </div>
  )
}
