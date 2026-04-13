'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ProductRecord } from '@/types'

interface TopItemsChartProps {
  products: ProductRecord[]
  accentColor: string
  excludeCategories?: string[]
  count?: number
}

export default function TopItemsChart({
  products,
  accentColor,
  excludeCategories = [],
  count = 10,
}: TopItemsChartProps) {
  const excludeSet = new Set(excludeCategories.map(c => c.toUpperCase()))

  const filtered = products.filter(
    p => !excludeSet.has(p.category.toUpperCase())
  )

  const itemMap = new Map<string, number>()
  for (const p of filtered) {
    itemMap.set(p.item, (itemMap.get(p.item) || 0) + p.gross)
  }

  const data = Array.from(itemMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, count)
    .reverse()

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Top Items by Revenue
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 35)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            width={115}
          />
          <Tooltip
            formatter={(value) => typeof value === 'number' ? `$${value.toLocaleString()}` : ''}
          />
          <Bar dataKey="value" fill={accentColor} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
