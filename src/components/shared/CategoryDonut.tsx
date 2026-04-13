'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { ProductRecord } from '@/types'

interface CategoryDonutProps {
  products: ProductRecord[]
  excludeGiftCards?: boolean
  showCateringDistinct?: boolean
}

const COLORS = [
  '#1B3A6B', '#00B4E6', '#C4A952', '#E63946', '#4ECDC4',
  '#2D3436', '#6C5CE7', '#FD79A8', '#00CEC9', '#FDCB6E',
]

export default function CategoryDonut({
  products,
  excludeGiftCards = false,
  showCateringDistinct = false,
}: CategoryDonutProps) {
  const [showGiftCards, setShowGiftCards] = useState(!excludeGiftCards)

  let filtered = products
  if (!showGiftCards) {
    filtered = filtered.filter(
      p => p.category.toLowerCase() !== 'gift cards'
    )
  }

  const categoryMap = new Map<string, number>()
  for (const p of filtered) {
    categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + p.gross)
  }

  const data = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Revenue by Category
        </h3>
        {excludeGiftCards && (
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={showGiftCards}
              onChange={e => setShowGiftCards(e.target.checked)}
              className="rounded border-gray-300"
            />
            Include gift card sales
          </label>
        )}
      </div>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[i % COLORS.length]}
                  opacity={
                    showCateringDistinct &&
                    entry.name.toUpperCase() === 'CATERING'
                      ? 0.5
                      : 1
                  }
                  strokeDasharray={
                    showCateringDistinct &&
                    entry.name.toUpperCase() === 'CATERING'
                      ? '4 2'
                      : undefined
                  }
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => typeof value === 'number' ? `$${value.toLocaleString()}` : ''}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.slice(0, 8).map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="flex-1 text-gray-700 truncate">{entry.name}</span>
              <span className="text-gray-500">
                {total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0}%
              </span>
              <span className="font-medium text-gray-900">
                ${entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
