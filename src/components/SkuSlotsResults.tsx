'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Boxes, TrendingUp, Package, AlertTriangle, CheckCircle2, Eye, Truck, Clock } from 'lucide-react'

interface SkuSlotsResultsProps {
  results: SkuSlotsOutput
}

function OrdersDialog({ 
  orders, 
  title, 
  trigger 
}: { 
  orders: string[]
  title: string
  trigger: React.ReactNode 
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </DialogDescription>
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
  const displaySkus = showAll ? skus : skus.slice(0, 25)

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
        <div className="flex items-center justify-between">
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
          <Badge 
            variant="outline" 
            className={isReceivingPriority 
              ? "border-amber-500/50 text-amber-400" 
              : "border-emerald-500/50 text-emerald-400"
            }
          >
            {skus.length} SKU{skus.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-300 w-10">#</TableHead>
                <TableHead className="text-slate-300">SKU</TableHead>
                <TableHead className="text-slate-300">Product Name</TableHead>
                <TableHead className="text-slate-300 text-right">Orders Impacted</TableHead>
                <TableHead className="text-slate-300 text-right">Units Needed</TableHead>
                <TableHead className="text-slate-300 text-right">Inventory</TableHead>
                <TableHead className="text-slate-300 text-right">
                  {isReceivingPriority ? 'Orders Blocked' : 'Orders Unlocked'}
                </TableHead>
                <TableHead className="text-slate-300"></TableHead>
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
                  <TableCell>
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
        
        {skus.length > 25 && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {showAll ? 'Show Less' : `Show All ${skus.length} SKUs`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SkuSlotsResults({ results }: SkuSlotsResultsProps) {
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
        description="These SKUs should be moved to your pick area to maximize order fulfillment. Sorted by incremental orders unlocked."
        isReceivingPriority={false}
      />

      {/* SKUs to Prioritize Receiving Table */}
      <SkuTable
        skus={results.skusToPrioritizeReceiving}
        title="High-Impact SKUs Awaiting Inventory"
        description="These SKUs have no sellable inventory but would unlock orders if received. Prioritize these during receiving."
        isReceivingPriority={true}
      />
    </div>
  )
}
