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
import { calcLtoVsCore } from '@/lib/metrics/studyMetrics'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'
import type { ProductRecord } from '@/types'

interface LtoVsCoreChartProps {
  products: ProductRecord[]
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function yTickFormatter(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v}`
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1">{formatMonthLabel(label)}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name === 'core' ? 'Core' : 'LTO'}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

export default function LtoVsCoreChart({ products }: LtoVsCoreChartProps) {
  const result = useMemo(() => calcLtoVsCore(products), [products])

  if (!result) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-study-gold">
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-4">
          LTO vs Core Revenue
        </p>
        <p className="text-sm text-gray-400">Select 2+ months to see LTO analysis</p>
      </div>
    )
  }

  const { data, ltoItems } = result

  const insight = useMemo(() => {
    const totalRevenue = data.reduce((sum, d) => sum + d.core + d.lto, 0)
    const totalLto = data.reduce((sum, d) => sum + d.lto, 0)
    const ltoPct = totalRevenue > 0 ? Math.round((totalLto / totalRevenue) * 100) : 0

    const firstCore = data[0]?.core ?? 0
    const lastCore = data[data.length - 1]?.core ?? 0
    const coreDelta = firstCore > 0 ? ((lastCore - firstCore) / firstCore) * 100 : 0

    let coreTrend: string
    if (coreDelta > 3) {
      coreTrend = 'Core revenue grew while LTOs were active.'
    } else if (coreDelta < -3) {
      coreTrend = 'Core revenue declined while LTOs were active.'
    } else {
      coreTrend = 'Core revenue held steady while LTOs were active.'
    }

    return `LTO items contributed ${ltoPct}% of revenue. ${coreTrend}`
  }, [data])

  return (
    <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-study-gold">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-4">
        LTO vs Core Revenue
      </p>

      {/* Legend */}
      <div className="flex gap-4 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#C4A952' }} />
          <span>Core</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#00B4E6' }} />
          <span>LTO</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickFormatter={formatMonthLabel}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={yTickFormatter}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="core" stackId="revenue" fill="#C4A952" name="core" radius={[0, 0, 0, 0]} />
          <Bar dataKey="lto" stackId="revenue" fill="#00B4E6" name="lto" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Insight line */}
      <p className="text-xs text-gray-500 mt-3 mb-4">{insight}</p>

      {/* LTO items table */}
      {ltoItems.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-1.5 pr-4 text-gray-400 font-medium">Item</th>
                <th className="text-right py-1.5 pr-4 text-gray-400 font-medium">Active Months</th>
                <th className="text-right py-1.5 text-gray-400 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {ltoItems.map((item) => (
                <tr key={item.item} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-1.5 pr-4 text-gray-900 font-medium max-w-[200px] truncate">
                    {item.item}
                  </td>
                  <td className="py-1.5 pr-4 text-gray-500 text-right tabular-nums">
                    {item.months.length} {item.months.length === 1 ? 'month' : 'months'}
                  </td>
                  <td className="py-1.5 text-gray-900 text-right tabular-nums">
                    {formatCurrency(item.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
