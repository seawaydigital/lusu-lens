'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'
import type { DailySummary } from '@/types'

interface SeasonalVolatilityProps {
  summaries: DailySummary[]
  accentColor?: string
}

// Returns the ISO Monday of the week containing the given date string
function weekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // 'YYYY-MM'
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function formatWeekLabel(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

export default function SeasonalVolatility({ summaries, accentColor = '#00B4E6' }: SeasonalVolatilityProps) {
  const { chartData, mean, sd, cv, title, insight, volatilityLevel } = useMemo(() => {
    const distinctMonths = new Set(summaries.map(s => getMonthKey(s.date)))
    const isMultiMonth = distinctMonths.size > 1

    if (isMultiMonth) {
      // ── Group by calendar month ──
      const byMonth = new Map<string, number>()
      for (const s of summaries) {
        const k = getMonthKey(s.date)
        byMonth.set(k, (byMonth.get(k) ?? 0) + s.netSales)
      }
      const sorted = Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      const values = sorted.map(([, v]) => v)
      const mean = values.reduce((s, v) => s + v, 0) / values.length
      const sd = sampleStdDev(values)
      const cv = mean > 0 ? (sd / mean) * 100 : 0

      const peak   = sorted.reduce((a, b) => b[1] > a[1] ? b : a)
      const trough = sorted.reduce((a, b) => b[1] < a[1] ? b : a)
      const swingPct = trough[1] > 0 ? Math.round(((peak[1] - trough[1]) / trough[1]) * 100) : 0

      const level = cv < 12 ? 'Low' : cv < 28 ? 'Moderate' : 'High'
      const insight = `Peak ${formatMonth(peak[0])}, trough ${formatMonth(trough[0])} — ${swingPct}% swing between best and worst month`

      const chartData = sorted.map(([k, revenue]) => ({
        label: formatMonth(k),
        revenue,
        aboveAvg: revenue >= mean,
      }))

      return { chartData, mean, sd, cv, title: 'Month-over-Month Demand', insight, volatilityLevel: level }

    } else {
      // ── Group by week within the single month ──
      const byWeek = new Map<string, number>()
      for (const s of summaries) {
        const k = weekStart(s.date)
        byWeek.set(k, (byWeek.get(k) ?? 0) + s.netSales)
      }
      const sorted = Array.from(byWeek.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      const values = sorted.map(([, v]) => v)
      const mean = values.reduce((s, v) => s + v, 0) / values.length
      const sd = sampleStdDev(values)
      const cv = mean > 0 ? (sd / mean) * 100 : 0

      const best  = sorted.reduce((a, b) => b[1] > a[1] ? b : a)
      const worst = sorted.reduce((a, b) => b[1] < a[1] ? b : a)
      const swingPct = worst[1] > 0 ? Math.round(((best[1] - worst[1]) / worst[1]) * 100) : 0

      const level = cv < 12 ? 'Low' : cv < 28 ? 'Moderate' : 'High'
      const insight = sorted.length >= 2
        ? `Best week (${formatWeekLabel(best[0])}) ran ${swingPct}% above the slowest — ${level.toLowerCase()} week-to-week variation`
        : 'Upload more months to track seasonal trends across the year'

      const chartData = sorted.map(([k, revenue], i) => ({
        label: `Wk ${i + 1}\n${formatWeekLabel(k)}`,
        revenue,
        aboveAvg: revenue >= mean,
      }))

      return { chartData, mean, sd, cv, title: 'Weekly Demand (This Month)', insight, volatilityLevel: level }
    }
  }, [summaries])

  const badgeColor =
    volatilityLevel === 'Low'      ? '#10B981' :
    volatilityLevel === 'Moderate' ? '#F59E0B' :
                                     '#EF4444'

  return (
    <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100">
      <div className="flex items-start justify-between mb-1">
        <p className="text-[10.5px] font-semibold tracking-[0.09em] uppercase text-gray-400">
          Seasonal Demand Volatility
        </p>
        <span
          className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ color: badgeColor, background: `${badgeColor}1A` }}
        >
          {volatilityLevel}
        </span>
      </div>

      <p className="text-[13px] font-medium text-gray-700 mt-1 mb-4 leading-snug">{insight}</p>

      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), 'Net Revenue']}
            labelStyle={{ fontWeight: 600, fontSize: 12 }}
          />
          {/* ±1σ band markers */}
          <ReferenceLine
            y={mean + sd}
            stroke="#E5E7EB"
            strokeDasharray="3 2"
            strokeWidth={1}
          />
          <ReferenceLine
            y={Math.max(0, mean - sd)}
            stroke="#E5E7EB"
            strokeDasharray="3 2"
            strokeWidth={1}
          />
          {/* Mean */}
          <ReferenceLine
            y={mean}
            stroke="#9CA3AF"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: 'Avg', position: 'insideTopRight', fontSize: 10, fill: '#9CA3AF' }}
          />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.aboveAvg ? accentColor : '#D1D5DB'}
                opacity={entry.aboveAvg ? 0.85 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-gray-400 mt-2">
        {accentColor !== '#D1D5DB' ? 'Coloured' : 'Dark'} bars = above average · Grey = below average · Dashed lines = avg ± 1σ
      </p>
    </div>
  )
}
