'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { calcAlcoholFoodSplit } from '@/lib/metrics/outpostMetrics'
import type { ProductRecord } from '@/types'

export default function AlcoholFoodSplit({ products }: { products: ProductRecord[] }) {
  const { alcohol, food, other } = calcAlcoholFoodSplit(products)
  const total = alcohol + food + other
  if (total === 0) return null

  const data = [
    { name: 'Alcohol', value: Math.round(alcohol) },
    { name: 'Food', value: Math.round(food) },
    { name: 'Other', value: Math.round(other) },
  ]

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Alcohol vs Food</h3>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
              <Cell fill="#1B3A6B" />
              <Cell fill="#C4A952" />
              <Cell fill="#9CA3AF" />
            </Pie>
            <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toLocaleString()}` : ''} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#1B3A6B', '#C4A952', '#9CA3AF'][i] }} />
              <span>{d.name} — ${d.value.toLocaleString()} ({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
