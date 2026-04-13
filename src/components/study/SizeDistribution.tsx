'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { calcSizeDistribution } from '@/lib/metrics/studyMetrics'
import type { ProductRecord } from '@/types'

interface SizeDistributionProps {
  products: ProductRecord[]
}

export default function SizeDistribution({ products }: SizeDistributionProps) {
  const data = calcSizeDistribution(products)
  if (data.length === 0) return null

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Size Distribution
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="size" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
          <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toLocaleString()}` : ''} />
          <Bar dataKey="revenue" fill="#C4A952" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
