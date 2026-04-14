'use client'

import { useMemo } from 'react'
import { calcOutpostFoodAttach } from '@/lib/metrics/outpostMetrics'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'
import type { ProductRecord } from '@/types'

interface OutpostFoodAttachProps {
  products: ProductRecord[]
  eventDays: Set<string>
}

export default function OutpostFoodAttach({ products, eventDays }: OutpostFoodAttachProps) {
  const result = useMemo(
    () => calcOutpostFoodAttach(products, eventDays),
    [products, eventDays]
  )

  const insight = useMemo(() => {
    const { overall, regular, event } = result
    if (event !== null) {
      // Guard: if regular === 0, all days were event days — no valid baseline to compare
      if (regular === 0) {
        return 'Food attach rate is on target (30% benchmark)'
      }
      if (event > regular) {
        return 'Food ordering is stronger on event nights — good F&B synergy'
      }
      if (regular - event > 5) {
        return `Food attach drops ${(regular - event).toFixed(1)}pp on event nights — opportunity to promote food during events`
      }
      return 'Food attach is consistent across regular and event nights'
    }
    if (overall >= 30) {
      return 'Food attach rate is on target (30% benchmark)'
    }
    return 'Food attach rate is below the 30% benchmark — opportunity to drive food with beverage orders'
  }, [result])

  if (result.totalGross === 0) return null

  const { overall, regular, event, foodGross, totalGross } = result

  return (
    <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-outpost-black">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-2">
        Food Attach Rate
      </p>
      <p className="text-3xl font-bold text-gray-900 tabular-nums">
        {overall.toFixed(1)}%
      </p>
      <p className="text-xs text-gray-400 mt-1.5">
        {formatCurrency(Math.round(foodGross))} food / {formatCurrency(Math.round(totalGross))} total
      </p>

      {event !== null && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-28 shrink-0">Regular Nights</span>
            <span className="text-xs font-medium text-gray-700 w-10 text-right tabular-nums">
              {regular.toFixed(1)}%
            </span>
            <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{ width: `${Math.min(regular, 100)}%`, backgroundColor: '#00B4E6' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-28 shrink-0">Event Nights</span>
            <span className="text-xs font-medium text-gray-700 w-10 text-right tabular-nums">
              {event.toFixed(1)}%
            </span>
            <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{ width: `${Math.min(event, 100)}%`, backgroundColor: '#E63946' }}
              />
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">{insight}</p>
    </div>
  )
}
