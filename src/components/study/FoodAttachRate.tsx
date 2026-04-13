'use client'

import { calcFoodAttachRate } from '@/lib/metrics/studyMetrics'
import type { ProductRecord } from '@/types'

interface FoodAttachRateProps {
  products: ProductRecord[]
}

export default function FoodAttachRate({ products }: FoodAttachRateProps) {
  const rate = calcFoodAttachRate(products)
  const totalGross = products.reduce((sum, p) => sum + p.gross, 0)
  const foodGross = products
    .filter(p => ['food', 'pastries'].includes(p.category.toLowerCase()))
    .reduce((sum, p) => sum + p.gross, 0)

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-study-gold">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">
        Food Attach Rate
      </h3>
      <p className="text-3xl font-bold text-study-black">{rate.toFixed(1)}%</p>
      <p className="text-sm text-gray-500 mt-1">
        ${foodGross.toLocaleString()} of ${totalGross.toLocaleString()} total
      </p>
      <p className="text-xs text-gray-400 mt-3">
        Most actionable Study metric. Raising from {rate.toFixed(0)}% to 15% would add ~$1,200/month in revenue.
      </p>
    </div>
  )
}
