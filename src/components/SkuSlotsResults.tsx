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
import type { SkuSlotsOutput, OptimalSkuResult, SourceLocation } from '@/lib/parsers/types'
import { Boxes, TrendingUp, Package, AlertTriangle, CheckCircle2, Eye, Truck, Clock, ArrowUpDown, ArrowUp, ArrowDown, Search, Copy, Check, MapPin } from 'lucide-react'

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
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto bg-white border-[#e2e8f0]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-[#000000]">{title}</DialogTitle>
              <DialogDescription className="text-[#6b7a8c]">
                {orders.length} order{orders.length !== 1 ? 's' : ''}
              </DialogDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyToClipboard}
              className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa]"
            >
              {copied ? <Check className="w-4 h-4 mr-1 text-[#6de5a2]" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy All'}
            </Button>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {orders.map((order) => (
            <div
              key={order}
              className="px-3 py-2 bg-[#f4f7fa] rounded text-sm text-[#263444] font-mono"
            >
              {order}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SourceLocationsCell({ locations }: { locations?: SourceLocation[] }) {
  if (!locations || locations.length === 0) {
    return <span className="text-[#c0ccdb]">—</span>
  }
  
  return (
    <div className="space-y-1">
      {locations.map((loc, idx) => (
        <div key={idx} className="flex items-center gap-1 text-xs">
          <MapPin className="w-3 h-3 text-[#3281fd] flex-shrink-0" />
          <span className="font-mono text-[#263444]">{loc.location}</span>
          <span className="text-[#6b7a8c]">
            ({loc.unitsToTake}{loc.unitsToTake !== loc.units && ` of ${loc.units}`})
          </span>
        </div>
      ))}
    </div>
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
      className={`text-[#6b7a8c] text-xs font-medium uppercase tracking-wider cursor-pointer select-none hover:text-[#000000] hover:bg-[#f4f7fa] transition-colors ${align === 'right' ? 'text-right' : ''}`}
      onDoubleClick={() => onSort(field)}
      title="Double-click to sort"
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {isActive ? (
          currentDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#3281fd]" /> : <ArrowDown className="w-3 h-3 text-[#3281fd]" />
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
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(sku => 
        sku.sku.toLowerCase().includes(term) || 
        sku.productName.toLowerCase().includes(term)
      )
    }
    
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
      <Card className="bg-white border-[#e2e8f0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#000000] text-base">{title}</CardTitle>
          <CardDescription className="text-[#6b7a8c]">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[#c0ccdb] text-center py-8">No SKUs in this category</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-[#e2e8f0] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-[#000000] text-base flex items-center gap-2">
              {isReceivingPriority ? (
                <Clock className="w-5 h-5 text-[#ffce75]" />
              ) : (
                <Truck className="w-5 h-5 text-[#3281fd]" />
              )}
              {title}
            </CardTitle>
            <CardDescription className="text-[#6b7a8c] text-sm">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={isReceivingPriority 
                ? "border-[#ffce75] text-[#b38f52] bg-[#ffce75]/10" 
                : "border-[#3281fd] text-[#3281fd] bg-[#3281fd]/10"
              }
            >
              {filteredAndSortedSkus.length} SKU{filteredAndSortedSkus.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={copySkuList}
              className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa]"
            >
              {copiedSku === 'all' ? <Check className="w-4 h-4 mr-1 text-[#6de5a2]" /> : <Copy className="w-4 h-4 mr-1" />}
              {copiedSku === 'all' ? 'Copied!' : 'Copy SKUs'}
            </Button>
          </div>
        </div>
        
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c0ccdb]" />
          <Input
            placeholder="Search SKU or product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-[#e2e8f0] text-[#000000] placeholder:text-[#c0ccdb] focus:border-[#3281fd]"
          />
        </div>
        
        <p className="text-xs text-[#c0ccdb] mt-2">
          💡 Double-click column headers to sort
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto border border-[#e2e8f0] rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] border-b border-[#e2e8f0] hover:bg-[#f4f7fa]">
                <TableHead className="text-[#6b7a8c] text-xs font-medium uppercase tracking-wider w-12">#</TableHead>
                <SortableHeader label="SKU" field="sku" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Product Name" field="productName" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Units" field="totalUnitsNeeded" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
                {!isReceivingPriority && (
                  <TableHead className="text-[#6b7a8c] text-xs font-medium uppercase tracking-wider">
                    Source Location(s)
                  </TableHead>
                )}
                <SortableHeader label="Stock" field="currentInventory" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
                <SortableHeader 
                  label={isReceivingPriority ? 'Blocked' : 'Unlocked'} 
                  field="incrementalOrdersUnlocked" 
                  currentSort={sortField} 
                  currentDirection={sortDirection} 
                  onSort={handleSort} 
                  align="right" 
                />
                <TableHead className="text-[#6b7a8c] print:hidden w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySkus.map((sku, index) => (
                <TableRow key={sku.sku} className="border-b border-[#e2e8f0] hover:bg-[#f4f7fa]">
                  <TableCell className="text-[#c0ccdb] font-mono text-sm">{index + 1}</TableCell>
                  <TableCell className="font-mono text-[#000000] text-sm">{sku.sku}</TableCell>
                  <TableCell className="text-[#263444] text-sm max-w-[200px] truncate" title={sku.productName}>
                    {sku.productName}
                  </TableCell>
                  <TableCell className="text-right text-[#263444] text-sm">
                    {sku.totalUnitsNeeded}
                  </TableCell>
                  {!isReceivingPriority && (
                    <TableCell className="text-sm">
                      <SourceLocationsCell locations={sku.sourceLocations} />
                    </TableCell>
                  )}
                  <TableCell className="text-right text-sm">
                    {sku.currentInventory > 0 ? (
                      <span className="text-[#6de5a2] font-medium">{sku.currentInventory}</span>
                    ) : (
                      <span className="text-[#ef5252]">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={isReceivingPriority 
                        ? "border-[#ffce75] text-[#b38f52] bg-[#ffce75]/10"
                        : "border-[#6de5a2] text-[#4db87a] bg-[#6de5a2]/10"
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
                          <Button variant="ghost" size="sm" className="text-[#c0ccdb] hover:text-[#3281fd] hover:bg-[#3281fd]/10">
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
              className="border-[#e2e8f0] text-[#6b7a8c] hover:bg-[#f4f7fa]"
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
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-white border-[#e2e8f0] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3281fd]/10 rounded-lg">
                <Boxes className="w-5 h-5 text-[#3281fd]" />
              </div>
              <div>
                <p className="text-xs text-[#6b7a8c] uppercase tracking-wider font-medium">SKU Slots</p>
                <p className="text-2xl font-bold text-[#000000]">{results.skuSlotCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e2e8f0] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#6de5a2]/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-[#6de5a2]" />
              </div>
              <div>
                <p className="text-xs text-[#6b7a8c] uppercase tracking-wider font-medium">Orders Fulfilled</p>
                <p className="text-2xl font-bold text-[#000000]">{results.totalOrdersFulfilled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e2e8f0] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3281fd]/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-[#3281fd]" />
              </div>
              <div>
                <p className="text-xs text-[#6b7a8c] uppercase tracking-wider font-medium">Fulfillment Rate</p>
                <p className="text-2xl font-bold text-[#000000]">{results.fulfillmentRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e2e8f0] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#ffce75]/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-[#ffce75]" />
              </div>
              <div>
                <p className="text-xs text-[#6b7a8c] uppercase tracking-wider font-medium">Need Receiving</p>
                <p className="text-2xl font-bold text-[#000000]">{results.skusToPrioritizeReceiving.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Fulfilled Preview */}
      {results.ordersFulfilled.length > 0 && (
        <Card className="bg-white border-[#e2e8f0] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#000000] text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#6de5a2]" />
                  Orders That Can Be Completely Fulfilled
                </CardTitle>
                <CardDescription className="text-[#6b7a8c] text-sm">
                  These orders have all required SKUs within your {results.skuSlotCount} slot allocation
                </CardDescription>
              </div>
              <OrdersDialog
                orders={results.ordersFulfilled}
                title="All Fulfillable Orders"
                trigger={
                  <Button variant="outline" className="border-[#6de5a2] text-[#4db87a] hover:bg-[#6de5a2]/10">
                    <Eye className="w-4 h-4 mr-2" />
                    View All {results.ordersFulfilled.length}
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
                  className="border-[#e2e8f0] text-[#263444] font-mono bg-[#f4f7fa]"
                >
                  {order}
                </Badge>
              ))}
              {results.ordersFulfilled.length > 20 && (
                <Badge variant="outline" className="border-[#e2e8f0] text-[#6b7a8c]">
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
        title={`SKUs to Stock (${results.skusToStock.length}/${results.skuSlotCount} slots)`}
        description="Move these SKUs to your pick area to maximize order fulfillment."
        isReceivingPriority={false}
      />

      {/* Toggle for Receiving Section */}
      {results.skusToPrioritizeReceiving.length > 0 && (
        <div className="flex items-center space-x-2 print:hidden">
          <Checkbox 
            id="showReceiving" 
            checked={showReceivingSection}
            onCheckedChange={(checked) => setShowReceivingSection(checked === true)}
            className="border-[#c0ccdb] data-[state=checked]:bg-[#3281fd] data-[state=checked]:border-[#3281fd]"
          />
          <Label htmlFor="showReceiving" className="text-[#6b7a8c] cursor-pointer text-sm">
            Show SKUs Awaiting Inventory ({results.skusToPrioritizeReceiving.length} SKUs)
          </Label>
        </div>
      )}

      {/* SKUs to Prioritize Receiving Table */}
      {showReceivingSection && results.skusToPrioritizeReceiving.length > 0 && (
        <SkuTable
          skus={results.skusToPrioritizeReceiving}
          title="SKUs Awaiting Inventory"
          description="These SKUs have no sellable inventory but would unlock orders if received."
          isReceivingPriority={true}
        />
      )}
    </div>
  )
}
