'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { calcHotColdSplit } from '@/lib/metrics/studyMetrics'
import type { ProductRecord } from '@/types'

interface HotColdSplitProps {
  products: ProductRecord[]
}

export default function HotColdSplit({ products }: HotColdSplitProps) {
  const { hot, cold } = calcHotColdSplit(products)
  const total = hot + cold
  if (total === 0) return null

  const data = [
    { name: 'Hot', value: Math.round(hot) },
    { name: 'Cold', value: Math.round(cold) },
  ]

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Hot vs Cold Beverages
      </h3>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
              <Cell fill="#E63946" />
              <Cell fill="#00B4E6" />
            </Pie>
            <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toLocaleString()}` : ''} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E63946]" />
            <span className="text-sm">Hot — ${hot.toLocaleString()} ({((hot / total) * 100).toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-lusu-cyan" />
            <span className="text-sm">Cold — ${cold.toLocaleString()} ({((cold / total) * 100).toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
