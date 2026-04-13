'use client'

import { calcDraftVsPackaged } from '@/lib/metrics/outpostMetrics'
import type { ProductRecord } from '@/types'

export default function DraftVsPackaged({ products }: { products: ProductRecord[] }) {
  const { draft, packaged, draftPct } = calcDraftVsPackaged(products)
  const total = draft + packaged
  if (total === 0) return null

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Draft vs Packaged Beer</h3>
      <div className="w-full h-6 rounded-full overflow-hidden flex bg-gray-100">
        <div className="bg-lusu-navy h-full" style={{ width: `${draftPct}%` }} />
        <div className="bg-lusu-cyan h-full" style={{ width: `${100 - draftPct}%` }} />
      </div>
      <div className="flex justify-between mt-2 text-sm">
        <span>Draft ${draft.toLocaleString()} ({draftPct.toFixed(1)}%)</span>
        <span>Packaged ${packaged.toLocaleString()} ({(100 - draftPct).toFixed(1)}%)</span>
      </div>
    </div>
  )
}
