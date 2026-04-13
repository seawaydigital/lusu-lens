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

  // Target is always 5 percentage points above current rate, rounded to nearest 5
  const target = Math.ceil((rate + 5) / 5) * 5
  const revenueGain = Math.round((totalGross * (target - rate)) / 100)

  let insight: string
  if (rate >= 25) {
    insight = `Strong food attachment — top-tier for a campus café. Focus on maintaining quality and variety.`
  } else {
    insight = `Raising to ${target}% would add ~$${revenueGain.toLocaleString()}/month without a single new customer.`
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-study-gold">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-2">
        Food Attach Rate
      </p>
      <p className="text-[28px] font-bold text-gray-900 tracking-tight tabular-nums">
        {rate.toFixed(1)}%
      </p>
      <p className="text-xs text-gray-400 font-medium mt-1.5">
        ${Math.round(foodGross).toLocaleString()} food of ${Math.round(totalGross).toLocaleString()} total sales
      </p>
      <p className="text-xs text-gray-400 leading-relaxed mt-3">
        {insight}
      </p>
    </div>
  )
}
