'use client'

import { calcFridayWings } from '@/lib/metrics/outpostMetrics'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'
import type { ProductRecord } from '@/types'

export default function FridayWingsTracker({ products }: { products: ProductRecord[] }) {
  const stats = calcFridayWings(products)
  if (stats.totalRevenue === 0) return null

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-outpost-black">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Friday Wings</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Total revenue</p>
          <p className="font-bold text-lg">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div>
          <p className="text-gray-500">Total units</p>
          <p className="font-bold text-lg">{stats.totalUnits}</p>
        </div>
        <div>
          <p className="text-gray-500">Per Friday</p>
          <p className="font-bold">{formatCurrency(stats.revenuePerFriday)} / {Math.round(stats.unitsPerFriday)} units</p>
        </div>
        <div>
          <p className="text-gray-500">Avg price/unit</p>
          <p className="font-bold">${stats.avgPrice.toFixed(2)}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">{stats.fridayCount} Friday{stats.fridayCount !== 1 ? 's' : ''} this month</p>
    </div>
  )
}
