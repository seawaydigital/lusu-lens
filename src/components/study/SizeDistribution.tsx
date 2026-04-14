'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { calcSizeDistribution, calcSizeDistributionTrend } from '@/lib/metrics/studyMetrics'
import type { ProductRecord } from '@/types'

const TREND_COLORS = ['#C4A952', '#00B4E6', '#1B3A6B', '#9CA3AF']

interface SizeDistributionProps {
  products: ProductRecord[]
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function SizeDistribution({ products }: SizeDistributionProps) {
  const [activeTab, setActiveTab] = useState<'distribution' | 'trend'>('distribution')

  const data = calcSizeDistribution(products)
  if (data.length === 0) return null

  const monthCount = Array.from(new Set(products.map(p => p.date.slice(0, 7)))).length
  const showTabs = monthCount >= 2

  const trendRaw = showTabs ? calcSizeDistributionTrend(products) : []

  // Collect all unique sizes from trend data
  const allSizes = Array.from(
    new Set(trendRaw.flatMap(row => Object.keys(row.sizes)))
  )

  // Flatten trend data into recharts-friendly rows
  const trendData = trendRaw.map(row => {
    const entry: Record<string, string | number> = { month: formatMonthLabel(row.month) }
    for (const size of allSizes) {
      entry[size] = row.sizes[size] !== undefined ? Math.round(row.sizes[size] * 10) / 10 : 0
    }
    return entry
  })

  return (
    <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-study-gold">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400">
          Size Distribution
        </span>
        {showTabs && (
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeTab === 'distribution'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Distribution
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeTab === 'trend'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Trend
            </button>
          </div>
        )}
      </div>

      {(!showTabs || activeTab === 'distribution') && (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="size" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
            <Tooltip
              formatter={(value) =>
                typeof value === 'number' ? `$${value.toLocaleString()}` : ''
              }
            />
            <Bar dataKey="revenue" fill="#C4A952" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {showTabs && activeTab === 'trend' && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip
              formatter={(value, name) =>
                typeof value === 'number'
                  ? [`${value.toFixed(1)}%`, String(name)]
                  : [String(value), String(name)]
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {allSizes.map((size, i) => (
              <Line
                key={size}
                type="monotone"
                dataKey={size}
                stroke={TREND_COLORS[i % TREND_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
