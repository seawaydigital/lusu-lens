'use client'

import { calcHappyHourImpact } from '@/lib/metrics/outpostMetrics'
import { formatCurrency, formatPercent } from '@/lib/metrics/sharedMetrics'
import type { DailySummary } from '@/types'

export default function HappyHourImpact({ summaries }: { summaries: DailySummary[] }) {
  const { totalDollars, pctOfGross, daysActive } = calcHappyHourImpact(summaries)
  if (totalDollars === 0) return null

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-outpost-black">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Happy Hour Impact</h3>
      <p className="text-3xl font-bold">{formatCurrency(totalDollars)}</p>
      <p className="text-sm text-gray-500 mt-1">
        {formatPercent(pctOfGross)} of gross · {daysActive} day{daysActive !== 1 ? 's' : ''} active
      </p>
      <p className="text-xs text-gray-400 mt-3">
        Auto-pricing discounts from happy hour promotions. Tracked separately from manual discounts.
      </p>
    </div>
  )
}
