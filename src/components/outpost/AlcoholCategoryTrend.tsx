'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { calcAlcoholCategoryTrend } from '@/lib/metrics/outpostMetrics'
import type { ProductRecord } from '@/types'

interface AlcoholCategoryTrendProps {
  products: ProductRecord[]
}

const COLORS = {
  beer: '#1B3A6B',
  spirits: '#E63946',
  wine: '#7C3AED',
  other: '#9CA3AF',
}

const LABELS: Record<keyof typeof COLORS, string> = {
  beer: 'Beer',
  spirits: 'Spirits',
  wine: 'Wine',
  other: 'Other',
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !label) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{formatMonthLabel(label)}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-gray-600">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name}:</span>
          <span className="font-medium">{entry.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

export default function AlcoholCategoryTrend({ products }: AlcoholCategoryTrendProps) {
  const trendData = useMemo(() => calcAlcoholCategoryTrend(products), [products])

  const isEmpty = trendData.length === 0
  const isSingleMonth = trendData.length === 1

  if (isEmpty) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-outpost-black">
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-4">
          Alcohol Category Mix
        </p>
        <p className="text-sm text-gray-400">No alcohol sales data</p>
      </div>
    )
  }

  const singleEntry = trendData[0]

  return (
    <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-outpost-black">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-4">
        Alcohol Category Mix
      </p>

      {isSingleMonth ? (
        /* Single-month: horizontal bar breakdown */
        <div className="space-y-3">
          {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((key) => {
            const pct = singleEntry[key]
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-20 flex-shrink-0">
                  <span
                    className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: COLORS[key] }}
                  />
                  <span className="text-sm text-gray-600">{LABELS[key]}</span>
                </div>
                <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${pct}%`, backgroundColor: COLORS[key] }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-10 text-right flex-shrink-0">
                  {pct.toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        /* Multi-month: 100% stacked bar chart */
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthLabel}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="beer" name="Beer" stackId="a" fill={COLORS.beer} />
              <Bar dataKey="spirits" name="Spirits" stackId="a" fill={COLORS.spirits} />
              <Bar dataKey="wine" name="Wine" stackId="a" fill={COLORS.wine} />
              <Bar dataKey="other" name="Other" stackId="a" fill={COLORS.other} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: COLORS[key] }}
                />
                <span className="text-xs text-gray-500">{LABELS[key]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
