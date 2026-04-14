'use client'

import { useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'
import type { ProductRecord } from '@/types'

interface ParetoChartProps {
  products: ProductRecord[]
  accentColor?: string
  excludeCategories?: string[]
}

export default function ParetoChart({
  products,
  accentColor = '#00B4E6',
  excludeCategories = ['Gift Cards'],
}: ParetoChartProps) {
  const { chartData, paretoCount, totalCount, insight } = useMemo(() => {
    const excluded = new Set(excludeCategories.map(c => c.toLowerCase()))

    // ── Item-level: find how many items make up 80% ──
    const byItem = new Map<string, number>()
    for (const p of products) {
      if (excluded.has(p.category.toLowerCase())) continue
      byItem.set(p.item, (byItem.get(p.item) ?? 0) + p.gross)
    }
    const itemRevenues = Array.from(byItem.values()).sort((a, b) => b - a)
    const itemTotal = itemRevenues.reduce((s, v) => s + v, 0)

    let cumRev = 0
    let paretoCount = 0
    for (const rev of itemRevenues) {
      cumRev += rev
      paretoCount++
      if (itemTotal > 0 && (cumRev / itemTotal) * 100 >= 80) break
    }
    const totalCount = itemRevenues.length
    const itemPct = totalCount > 0 ? Math.round((paretoCount / totalCount) * 100) : 0

    // ── Category-level: for the chart ──
    const byCat = new Map<string, number>()
    for (const p of products) {
      if (excluded.has(p.category.toLowerCase())) continue
      const cat = p.category || 'Other'
      byCat.set(cat, (byCat.get(cat) ?? 0) + p.gross)
    }

    const sortedCats = Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)

    const catTotal = sortedCats.reduce((s, [, v]) => s + v, 0)
    let cumPct = 0

    const chartData = sortedCats.map(([category, revenue]) => {
      cumPct = Math.min(100, cumPct + (catTotal > 0 ? (revenue / catTotal) * 100 : 0))
      return {
        category: category.length > 18 ? category.slice(0, 16) + '…' : category,
        revenue,
        cumulativePct: Math.round(cumPct * 10) / 10,
      }
    })

    const insight = totalCount > 0
      ? `${paretoCount} of ${totalCount} items (${itemPct}% of catalogue) generate 80% of revenue`
      : 'Not enough data'

    return { chartData, paretoCount, totalCount, insight }
  }, [products, excludeCategories])

  if (chartData.length === 0) return null

  return (
    <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 lg:col-span-2">
      <p className="text-[10.5px] font-semibold tracking-[0.09em] uppercase text-gray-400 mb-1">
        Revenue Concentration · Pareto
      </p>
      <p className="text-sm font-semibold text-gray-800 mb-5">{insight}</p>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 48, left: 0, bottom: 58 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            angle={-40}
            textAnchor="end"
            height={64}
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="rev"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) =>
              name === 'cumulativePct'
                ? [`${value}%`, 'Cumulative']
                : [formatCurrency(Number(value)), 'Revenue']
            }
          />
          <ReferenceLine
            yAxisId="pct"
            y={80}
            stroke="#F59E0B"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{ value: '80%', position: 'insideTopRight', fontSize: 10, fill: '#F59E0B' }}
          />
          <Bar
            yAxisId="rev"
            dataKey="revenue"
            fill={accentColor}
            opacity={0.82}
            radius={[3, 3, 0, 0]}
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="cumulativePct"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#F59E0B' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-gray-400 mt-2">
        Amber line = cumulative % of revenue · Dashed threshold = 80% · Categories left of the crossover are your core revenue drivers.
      </p>
    </div>
  )
}
