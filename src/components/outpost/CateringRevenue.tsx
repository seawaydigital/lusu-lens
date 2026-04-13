'use client'

import { calcCateringRevenue } from '@/lib/metrics/outpostMetrics'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'
import type { ProductRecord } from '@/types'

export default function CateringRevenue({ products }: { products: ProductRecord[] }) {
  const { total, items } = calcCateringRevenue(products)
  if (total === 0) return null

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-outpost-black">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Catering & Door Revenue</h3>
      <p className="text-3xl font-bold">{formatCurrency(total)}</p>
      <div className="mt-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm bg-gray-50 rounded px-3 py-2">
            <div>
              <span className="font-medium">{item.item}</span>
              <span className="text-gray-400 ml-2 text-xs">
                {new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <span className="font-bold">{formatCurrency(item.gross)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Catering revenue comes from pre-arranged events and is not part of regular operations.
      </p>
    </div>
  )
}
